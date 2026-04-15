import { Router } from "express";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { db, invoices, timeLogs, projects, users, companies } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

const VALID_PAYMENT_TERMS = ["on_receipt", "net_7", "net_14", "net_30"] as const;
type PaymentTerms = typeof VALID_PAYMENT_TERMS[number];

// GET /api/invoices/my — list all invoices for the current user
router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, companyId } = req.user!;

    const rows = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.companyId, companyId)))
      .orderBy(desc(invoices.createdAt));

    res.json(
      rows.map((inv) => {
        let lineItems: any[] = [];
        if (inv.lineItemsJson) {
          try { lineItems = JSON.parse(inv.lineItemsJson); } catch { lineItems = []; }
        }
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          periodStart: inv.periodStart,
          periodEnd: inv.periodEnd,
          totalMinutes: inv.totalMinutes,
          hourlyRate: inv.hourlyRate,
          totalAmount: inv.totalAmount,
          lineItems,
          paymentTerms: inv.paymentTerms ?? "on_receipt",
          createdAt: inv.createdAt.toISOString(),
        };
      })
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

// GET /api/invoices/preview — preview hours + amount for a date range (no save)
router.get("/preview", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, companyId } = req.user!;
    const { start, end } = req.query as { start: string; end: string };

    if (!start || !end) {
      res.status(400).json({ error: "start and end query params are required (YYYY-MM-DD)" });
      return;
    }

    const logs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.userId, userId),
          eq(timeLogs.companyId, companyId),
          gte(timeLogs.date, start),
          lte(timeLogs.date, end)
        )
      );

    const completedLogs = logs.filter((l) => l.clockOut && l.totalMinutes);

    // Fetch project names
    const projectIds = [...new Set(completedLogs.map((l) => l.projectId))];
    const projectRows = projectIds.length > 0
      ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.companyId, companyId))
      : [];
    const projectMap = new Map(projectRows.map((p) => [p.id, p.name]));

    const [user] = await db
      .select({ hourlyRate: users.hourlyRate })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const hourlyRate = Number(user?.hourlyRate ?? 0);
    const totalMinutes = completedLogs.reduce((sum, l) => sum + (l.totalMinutes ?? 0), 0);
    const totalAmount = (totalMinutes / 60) * hourlyRate;

    const lineItems = completedLogs.map((l) => {
      const mins = l.totalMinutes ?? 0;
      const subtotal = Math.round((mins / 60) * hourlyRate * 100) / 100;
      return {
        id: l.id,
        date: l.date,
        projectName: projectMap.get(l.projectId) ?? "Unknown Project",
        clockIn: l.clockIn.toISOString(),
        clockOut: l.clockOut?.toISOString(),
        minutes: mins,
        rate: hourlyRate,
        subtotal,
      };
    });

    res.json({
      periodStart: start,
      periodEnd: end,
      totalMinutes,
      hourlyRate,
      totalAmount: Math.round(totalAmount * 100) / 100,
      lineItems,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to preview invoice" });
  }
});

// POST /api/invoices/generate — create an invoice record for a date range
router.post("/generate", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { userId, companyId } = req.user!;
    const { periodStart, periodEnd, paymentTerms: rawTerms } = req.body as {
      periodStart: string;
      periodEnd: string;
      paymentTerms?: string;
    };

    if (!periodStart || !periodEnd) {
      res.status(400).json({ error: "periodStart and periodEnd are required" });
      return;
    }

    const paymentTerms: PaymentTerms =
      VALID_PAYMENT_TERMS.includes(rawTerms as PaymentTerms)
        ? (rawTerms as PaymentTerms)
        : "on_receipt";

    const logs = await db
      .select()
      .from(timeLogs)
      .where(
        and(
          eq(timeLogs.userId, userId),
          eq(timeLogs.companyId, companyId),
          gte(timeLogs.date, periodStart),
          lte(timeLogs.date, periodEnd)
        )
      );

    const completedLogs = logs.filter((l) => l.clockOut && l.totalMinutes);
    const totalMinutes = completedLogs.reduce((sum, l) => sum + (l.totalMinutes ?? 0), 0);

    const [user] = await db
      .select({ hourlyRate: users.hourlyRate, invoicePrefix: users.invoicePrefix })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const hourlyRate = Number(user?.hourlyRate ?? 0);
    const totalAmount = Math.round(((totalMinutes / 60) * hourlyRate) * 100) / 100;
    const prefix = (user?.invoicePrefix?.trim() || "INV").toUpperCase();

    // Generate sequential invoice number
    const existing = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(and(eq(invoices.userId, userId), eq(invoices.companyId, companyId)));
    const seq = String(existing.length + 1).padStart(4, "0");
    const invoiceNumber = `${prefix}-${seq}`;

    // Fetch project names for line items
    const projectIds = [...new Set(completedLogs.map((l) => l.projectId))];
    const projectRows = projectIds.length > 0
      ? await db.select({ id: projects.id, name: projects.name }).from(projects).where(eq(projects.companyId, companyId))
      : [];
    const projectMap = new Map(projectRows.map((p) => [p.id, p.name]));

    // Build full line items with rate + subtotal
    const lineItems = completedLogs.map((l) => {
      const mins = l.totalMinutes ?? 0;
      const subtotal = Math.round((mins / 60) * hourlyRate * 100) / 100;
      return {
        id: l.id,
        date: l.date,
        projectName: projectMap.get(l.projectId) ?? "Unknown Project",
        clockIn: l.clockIn.toISOString(),
        clockOut: l.clockOut?.toISOString(),
        minutes: mins,
        rate: hourlyRate,
        subtotal,
      };
    });

    const [created] = await db
      .insert(invoices)
      .values({
        companyId,
        userId,
        invoiceNumber,
        periodStart,
        periodEnd,
        totalMinutes,
        hourlyRate: String(hourlyRate),
        totalAmount: String(totalAmount),
        lineItemsJson: JSON.stringify(lineItems),
        paymentTerms,
      })
      .returning();

    // Fetch company and user details for PDF data
    const [company] = await db
      .select({
        name: companies.name,
        logoUrl: companies.logoUrl,
        primaryColor: companies.primaryColor,
        businessAbn: companies.businessAbn,
        businessEmail: companies.businessEmail,
        businessAddress: companies.businessAddress,
      })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);

    const [fullUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.status(201).json({
      id: created.id,
      invoiceNumber: created.invoiceNumber,
      periodStart: created.periodStart,
      periodEnd: created.periodEnd,
      totalMinutes: created.totalMinutes,
      hourlyRate: Number(created.hourlyRate),
      totalAmount: Number(created.totalAmount),
      lineItems,
      paymentTerms: created.paymentTerms,
      createdAt: created.createdAt.toISOString(),
      company: company ?? null,
      user: fullUser ? {
        name: fullUser.name,
        email: fullUser.email,
        phone: fullUser.phone,
        abn: fullUser.abn,
        businessAddress: fullUser.businessAddress,
        bankName: fullUser.bankName,
        accountName: fullUser.accountName,
        bsb: fullUser.bsb,
        accountNumber: fullUser.accountNumber,
        invoiceNotes: fullUser.invoiceNotes,
      } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate invoice" });
  }
});

export default router;
