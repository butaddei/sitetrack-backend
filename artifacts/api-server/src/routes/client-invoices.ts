import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, clientInvoices, projects } from "@workspace/db";
import { requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/client-invoices?projectId=... — list client invoices for a project (admin only)
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    const { companyId } = req.user!;

    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const rows = await db
      .select()
      .from(clientInvoices)
      .where(and(eq(clientInvoices.projectId, projectId), eq(clientInvoices.companyId, companyId)));

    res.json(rows.map(mapInvoice));
  } catch {
    res.status(500).json({ error: "Failed to fetch client invoices" });
  }
});

// POST /api/client-invoices — create a client invoice (admin only)
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const {
      projectId, invoiceNumber, invoiceDate, dueDate,
      clientName, clientCompany, clientEmail, clientPhone, clientAddress,
      projectAddress, description, subtotal, gst, total,
    } = req.body as {
      projectId: string; invoiceNumber: string; invoiceDate: string; dueDate: string;
      clientName?: string; clientCompany?: string; clientEmail?: string; clientPhone?: string;
      clientAddress?: string; projectAddress?: string; description?: string;
      subtotal: number; gst: number; total: number;
    };
    const { companyId, userId } = req.user!;

    if (!projectId || !invoiceNumber || !invoiceDate || !dueDate) {
      res.status(400).json({ error: "projectId, invoiceNumber, invoiceDate and dueDate are required" });
      return;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const [inv] = await db
      .insert(clientInvoices)
      .values({
        companyId,
        projectId,
        createdBy: userId,
        invoiceNumber,
        invoiceDate,
        dueDate,
        clientName: clientName ?? "",
        clientCompany: clientCompany ?? "",
        clientEmail: clientEmail ?? "",
        clientPhone: clientPhone ?? "",
        clientAddress: clientAddress ?? "",
        projectAddress: projectAddress ?? "",
        description: description ?? "",
        subtotal: String(subtotal ?? 0),
        gst: String(gst ?? 0),
        total: String(total ?? 0),
      })
      .returning();

    res.status(201).json(mapInvoice(inv));
  } catch {
    res.status(500).json({ error: "Failed to create client invoice" });
  }
});

// DELETE /api/client-invoices/:id — admin only
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { companyId } = req.user!;

    const [existing] = await db
      .select()
      .from(clientInvoices)
      .where(and(eq(clientInvoices.id, id), eq(clientInvoices.companyId, companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Client invoice not found" });
      return;
    }

    await db
      .delete(clientInvoices)
      .where(and(eq(clientInvoices.id, id), eq(clientInvoices.companyId, companyId)));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete client invoice" });
  }
});

function mapInvoice(inv: typeof clientInvoices.$inferSelect) {
  return {
    id: inv.id,
    projectId: inv.projectId,
    createdBy: inv.createdBy,
    invoiceNumber: inv.invoiceNumber,
    invoiceDate: inv.invoiceDate,
    dueDate: inv.dueDate,
    clientName: inv.clientName,
    clientCompany: inv.clientCompany,
    clientEmail: inv.clientEmail,
    clientPhone: inv.clientPhone,
    clientAddress: inv.clientAddress,
    projectAddress: inv.projectAddress,
    description: inv.description,
    subtotal: Number(inv.subtotal),
    gst: Number(inv.gst),
    total: Number(inv.total),
    createdAt: inv.createdAt.toISOString(),
  };
}

export default router;
