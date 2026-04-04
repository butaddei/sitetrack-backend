import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, users } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { checkPlanLimit } from "../middlewares/planLimits.js";

const router = Router();

// GET /api/users — list all employees in company (admin only)
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        hourlyRate: users.hourlyRate,
        position: users.position,
        startDate: users.startDate,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.companyId, req.user!.companyId));

    res.json(allUsers);
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// GET /api/users/:id — get single user (admin or own)
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const requestingUser = req.user!;

    if (requestingUser.role !== "admin" && requestingUser.userId !== id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        role: users.role,
        hourlyRate: users.hourlyRate,
        position: users.position,
        startDate: users.startDate,
        isActive: users.isActive,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, requestingUser.companyId)))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users — create employee (admin only)
router.post("/", requireAdmin, checkPlanLimit("employees"), async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, role, hourlyRate, position, startDate, password } = req.body as {
      name: string;
      email: string;
      phone?: string;
      role?: "admin" | "employee";
      hourlyRate?: number;
      position?: string;
      startDate?: string;
      password?: string;
    };

    if (!name?.trim() || !email?.trim()) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const rawPassword = password ?? "employee123";
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const [user] = await db
      .insert(users)
      .values({
        companyId: req.user!.companyId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() ?? null,
        role: role ?? "employee",
        hourlyRate: String(hourlyRate ?? 0),
        position: position?.trim() ?? null,
        startDate: startDate ?? new Date().toISOString().split("T")[0],
        isActive: true,
      })
      .returning();

    res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      hourlyRate: user.hourlyRate,
      position: user.position,
      startDate: user.startDate,
      isActive: user.isActive,
    });
  } catch {
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /api/users/:id — update user (admin only, or own non-sensitive fields)
router.patch("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, req.user!.companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const { name, email, phone, role, hourlyRate, position, startDate, isActive, password } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      role?: "admin" | "employee";
      hourlyRate?: number;
      position?: string;
      startDate?: string;
      isActive?: boolean;
      password?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (email?.trim()) {
      const dup = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
      if (dup.length > 0 && dup[0].id !== id) {
        res.status(409).json({ error: "Email already in use" });
        return;
      }
      updates.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) updates.phone = phone.trim() || null;
    if (role) updates.role = role;
    if (hourlyRate !== undefined) updates.hourlyRate = String(hourlyRate);
    if (position !== undefined) updates.position = position.trim() || null;
    if (startDate !== undefined) updates.startDate = startDate || null;
    if (isActive !== undefined) updates.isActive = isActive;
    if (password) updates.passwordHash = await bcrypt.hash(password, 12);

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(and(eq(users.id, id), eq(users.companyId, req.user!.companyId)))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      hourlyRate: updated.hourlyRate,
      position: updated.position,
      startDate: updated.startDate,
      isActive: updated.isActive,
    });
  } catch {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/users/:id — remove user (admin only, cannot remove yourself)
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    if (id === req.user!.userId) {
      res.status(400).json({ error: "You cannot delete your own account" });
      return;
    }

    const [existing] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.companyId, req.user!.companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db.delete(users).where(and(eq(users.id, id), eq(users.companyId, req.user!.companyId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
