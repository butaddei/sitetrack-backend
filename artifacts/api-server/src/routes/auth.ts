import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { db, users, companies, passwordResetTokens } from "@workspace/db";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

const router = Router();

// POST /api/auth/register — create a new company + admin user
router.post("/register", async (req, res) => {
  try {
    const { companyName, adminName, email, password } = req.body as {
      companyName: string;
      adminName: string;
      email: string;
      password: string;
    };

    if (!companyName?.trim() || !adminName?.trim() || !email?.trim() || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [company] = await db
      .insert(companies)
      .values({ name: companyName.trim() })
      .returning();

    const [user] = await db
      .insert(users)
      .values({
        companyId: company.id,
        name: adminName.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "admin",
        position: "Administrator",
        startDate: new Date().toISOString().split("T")[0],
      })
      .returning();

    const token = signToken({
      userId: user.id,
      companyId: company.id,
      role: "admin",
      email: user.email,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: company.id,
        companyName: company.name,
        primaryColor: company.primaryColor,
        secondaryColor: company.secondaryColor,
        logoUrl: company.logoUrl ?? null,
        phone: user.phone ?? null,
        position: user.position ?? null,
        avatarUrl: user.avatarUrl ?? null,
        hourlyRate: user.hourlyRate,
        plan: company.plan ?? "free",
        planStatus: company.planStatus ?? "active",
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email?.trim() || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: "Your account has been deactivated. Please contact your administrator." });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1);

    const token = signToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      email: user.email,
    });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: company?.name ?? "",
        primaryColor: company?.primaryColor ?? "#f97316",
        secondaryColor: company?.secondaryColor ?? "#0f172a",
        logoUrl: company?.logoUrl ?? null,
        phone: user.phone,
        position: user.position,
        avatarUrl: user.avatarUrl,
        hourlyRate: user.hourlyRate,
        plan: company?.plan ?? "free",
        planStatus: company?.planStatus ?? "active",
        mustChangePassword: user.mustChangePassword ?? false,
        abn: user.abn ?? null,
        businessAddress: user.businessAddress ?? null,
        bankName: user.bankName ?? null,
        accountName: user.accountName ?? null,
        bsb: user.bsb ?? null,
        accountNumber: user.accountNumber ?? null,
        invoiceNotes: user.invoiceNotes ?? null,
        invoicePrefix: user.invoicePrefix ?? null,
        companyBusinessAbn: company?.businessAbn ?? null,
        companyBusinessEmail: company?.businessEmail ?? null,
        companyBusinessAddress: company?.businessAddress ?? null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me — refresh current user info
router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, req.user!.userId), eq(users.companyId, req.user!.companyId)))
      .limit(1);

    if (!user || !user.isActive) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, user.companyId))
      .limit(1);

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      companyName: company?.name ?? "",
      primaryColor: company?.primaryColor ?? "#f97316",
      secondaryColor: company?.secondaryColor ?? "#0f172a",
      logoUrl: company?.logoUrl ?? null,
      phone: user.phone,
      position: user.position,
      avatarUrl: user.avatarUrl,
      hourlyRate: user.hourlyRate,
      plan: company?.plan ?? "free",
      planStatus: company?.planStatus ?? "active",
      mustChangePassword: user.mustChangePassword ?? false,
      abn: user.abn ?? null,
      businessAddress: user.businessAddress ?? null,
      bankName: user.bankName ?? null,
      accountName: user.accountName ?? null,
      bsb: user.bsb ?? null,
      accountNumber: user.accountNumber ?? null,
      invoiceNotes: user.invoiceNotes ?? null,
      invoicePrefix: user.invoicePrefix ?? null,
      companyBusinessAbn: company?.businessAbn ?? null,
      companyBusinessEmail: company?.businessEmail ?? null,
      companyBusinessAddress: company?.businessAddress ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/auth/profile — update own name/phone/position + subcontractor fields
router.patch("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      name, phone, position, avatarUrl,
      abn, businessAddress, bankName, accountName, bsb, accountNumber, invoiceNotes, invoicePrefix,
    } = req.body as {
      name?: string;
      phone?: string | null;
      position?: string | null;
      avatarUrl?: string | null;
      abn?: string | null;
      businessAddress?: string | null;
      bankName?: string | null;
      accountName?: string | null;
      bsb?: string | null;
      accountNumber?: string | null;
      invoiceNotes?: string | null;
      invoicePrefix?: string | null;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (position !== undefined) updates.position = position?.trim() || null;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
    if (abn !== undefined) updates.abn = abn?.trim() || null;
    if (businessAddress !== undefined) updates.businessAddress = businessAddress?.trim() || null;
    if (bankName !== undefined) updates.bankName = bankName?.trim() || null;
    if (accountName !== undefined) updates.accountName = accountName?.trim() || null;
    if (bsb !== undefined) updates.bsb = bsb?.trim() || null;
    if (accountNumber !== undefined) updates.accountNumber = accountNumber?.trim() || null;
    if (invoiceNotes !== undefined) updates.invoiceNotes = invoiceNotes?.trim() || null;
    if (invoicePrefix !== undefined) updates.invoicePrefix = invoicePrefix?.trim() || null;

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(and(eq(users.id, req.user!.userId), eq(users.companyId, req.user!.companyId)))
      .returning();

    res.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      position: updated.position,
      role: updated.role,
      avatarUrl: updated.avatarUrl,
      abn: updated.abn,
      businessAddress: updated.businessAddress,
      bankName: updated.bankName,
      accountName: updated.accountName,
      bsb: updated.bsb,
      accountNumber: updated.accountNumber,
      invoiceNotes: updated.invoiceNotes,
      invoicePrefix: updated.invoicePrefix,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/change-password — change own password
router.post("/change-password", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Both current and new password are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// POST /api/auth/forgot-password — generate reset token
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email?.trim()) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({ success: true, message: "If that email exists, a reset code was sent." });
      return;
    }

    // Generate a cryptographically secure 8-char alphanumeric reset code
    const token = randomBytes(6).toString("base64url").toUpperCase().slice(0, 8);
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, user.name, token);

    res.json({
      success: true,
      message: "If that email exists, a reset code was sent.",
      _devToken: process.env.NODE_ENV !== "production" ? token : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to process password reset" });
  }
});

// POST /api/auth/reset-password — apply new password using token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };

    if (!token?.trim() || !newPassword) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token.trim().toUpperCase()))
      .limit(1);

    if (!resetRecord) {
      res.status(400).json({ error: "Invalid or expired reset code" });
      return;
    }

    if (new Date() > resetRecord.expiresAt) {
      res.status(400).json({ error: "This reset code has already been used or has expired" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db.update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.userId));

    // Delete token so it can't be reused
    await db.delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetRecord.id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// PUT /api/auth/push-token — register Expo push token for authenticated user
router.put("/push-token", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { token } = req.body as { token: string };
    if (!token?.trim()) {
      res.status(400).json({ error: "Token is required" });
      return;
    }
    await db
      .update(users)
      .set({ pushToken: token.trim() })
      .where(eq(users.id, req.user!.userId));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to register push token" });
  }
});

export default router;
