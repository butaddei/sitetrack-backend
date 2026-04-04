import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, companies } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/company — get own company info
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [company] = await db
      .select()
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
    const { name, primaryColor, secondaryColor, logoUrl } = req.body as {
      name?: string;
      primaryColor?: string;
      secondaryColor?: string;
      logoUrl?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (primaryColor) updates.primaryColor = primaryColor;
    if (secondaryColor) updates.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl || null;

    const [updated] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, req.user!.companyId))
      .returning();

    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed to update company" });
  }
});

export default router;
