import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companies } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/company — get own company info (available to all roles)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [company] = await db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        primaryColor: companies.primaryColor,
        secondaryColor: companies.secondaryColor,
        businessAbn: companies.businessAbn,
        businessEmail: companies.businessEmail,
        businessAddress: companies.businessAddress,
      })
      .from(companies)
      .where(eq(companies.id, req.user!.companyId))
      .limit(1);

    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    res.json(company);
  } catch {
    res.status(500).json({ error: "Failed to fetch company" });
  }
});

// PATCH /api/company — update company settings (admin only)
router.patch("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { name, primaryColor, secondaryColor, logoUrl, businessAbn, businessEmail, businessAddress } = req.body as {
      name?: string;
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string;
      businessAbn?: string | null;
      businessEmail?: string | null;
      businessAddress?: string | null;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (primaryColor) updates.primaryColor = primaryColor;
    if (secondaryColor) updates.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl || null;
    if (businessAbn !== undefined) updates.businessAbn = businessAbn?.trim() || null;
    if (businessEmail !== undefined) updates.businessEmail = businessEmail?.trim() || null;
    if (businessAddress !== undefined) updates.businessAddress = businessAddress?.trim() || null;

    const rows = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, req.user!.companyId))
      .returning({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        primaryColor: companies.primaryColor,
        secondaryColor: companies.secondaryColor,
        businessAbn: companies.businessAbn,
        businessEmail: companies.businessEmail,
        businessAddress: companies.businessAddress,
      });

    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to update company" });
  }
});

export default router;
