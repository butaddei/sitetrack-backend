import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { db, users, companies, passwordResetTokens } from "@workspace/db";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

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

    // Seed demo data for the new company
    await seedDemoData(company.id, user.id);

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
        phone: user.phone,
        position: user.position,
        avatarUrl: user.avatarUrl,
        hourlyRate: user.hourlyRate,
        plan: company?.plan ?? "free",
        planStatus: company?.planStatus ?? "active",
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
      phone: user.phone,
      position: user.position,
      avatarUrl: user.avatarUrl,
      hourlyRate: user.hourlyRate,
      plan: company?.plan ?? "free",
      planStatus: company?.planStatus ?? "active",
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PATCH /api/auth/profile — update own name/phone/position
router.patch("/profile", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { name, phone, position, avatarUrl } = req.body as {
      name?: string;
      phone?: string | null;
      position?: string | null;
      avatarUrl?: string | null;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name?.trim()) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone?.trim() || null;
    if (position !== undefined) updates.position = position?.trim() || null;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;

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
      .set({ passwordHash, updatedAt: new Date() })
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

    // In a real app, send this token via email.
    // For the demo, we log it to console so it can be found.
    console.log(`[forgot-password] Reset token for ${email}: ${token}`);

    res.json({
      success: true,
      message: "If that email exists, a reset code was sent.",
      // Only include this in development / demo mode:
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

export default router;

// ── Seed demo data for a new company ─────────────────────────────────────
async function seedDemoData(companyId: string, adminId: string) {
  const { projects, projectAssignments, timeLogs, expenses, employeeNotes } =
    await import("@workspace/db");

  const employeePassword = await bcrypt.hash("employee123", 12);
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const hoursAgo = (h: number) => new Date(today.getTime() - h * 3600000);

  const [carlos] = await db.insert(users).values({
    companyId,
    name: "Carlos Mendez",
    email: `carlos.${companyId.slice(0, 6)}@demo.paintpro`,
    passwordHash: employeePassword,
    role: "employee",
    hourlyRate: "28",
    position: "Lead Painter",
    startDate: "2022-03-01",
    isActive: true,
  }).returning();

  const [james] = await db.insert(users).values({
    companyId,
    name: "James Wilson",
    email: `james.${companyId.slice(0, 6)}@demo.paintpro`,
    passwordHash: employeePassword,
    role: "employee",
    hourlyRate: "24",
    position: "Painter",
    startDate: "2023-06-15",
    isActive: true,
  }).returning();

  const [sofia] = await db.insert(users).values({
    companyId,
    name: "Sofia Chen",
    email: `sofia.${companyId.slice(0, 6)}@demo.paintpro`,
    passwordHash: employeePassword,
    role: "employee",
    hourlyRate: "26",
    position: "Senior Painter",
    startDate: "2022-08-20",
    isActive: true,
  }).returning();

  const [proj1] = await db.insert(projects).values({
    companyId,
    name: "Harbor View Residence",
    address: "142 Ocean Blvd, Miami, FL 33139",
    clientName: "Robert & Linda Hayes",
    clientPhone: "305-555-0201",
    clientEmail: "hayes@email.com",
    totalValue: "18500",
    startDate: "2024-03-01",
    expectedEndDate: "2024-03-28",
    status: "completed",
    paintColors: ["Benjamin Moore White Dove OC-17", "Sherwin-Williams Naval SW 6244"],
    notes: "3-story home, exterior + interior. Client prefers low-VOC paints.",
  }).returning();

  const [proj2] = await db.insert(projects).values({
    companyId,
    name: "Sunrise Office Complex",
    address: "880 Brickell Ave, Miami, FL 33131",
    clientName: "Sunrise Properties LLC",
    clientPhone: "305-555-0301",
    clientEmail: "contact@sunriseprop.com",
    totalValue: "42000",
    startDate: "2024-04-10",
    expectedEndDate: "2024-05-25",
    status: "in_progress",
    paintColors: ["Behr Ultra Pure White", "PPG Pittsburgh Paints Steel Blue"],
    notes: "Commercial office, 8 floors. Work on weekends only.",
  }).returning();

  const [proj3] = await db.insert(projects).values({
    companyId,
    name: "Palm Gardens Condo",
    address: "555 Collins Ave, Miami Beach, FL 33140",
    clientName: "Palm Gardens HOA",
    clientPhone: "305-555-0401",
    clientEmail: "hoa@palmgardens.com",
    totalValue: "28000",
    startDate: "2024-05-01",
    expectedEndDate: "2024-06-15",
    status: "pending",
    paintColors: ["Farrow & Ball Elephant Breath", "Farrow & Ball Off-Black"],
    notes: "12-unit condo building exterior. Coordination required with residents.",
  }).returning();

  await db.insert(projectAssignments).values([
    { projectId: proj1.id, userId: carlos.id },
    { projectId: proj1.id, userId: james.id },
    { projectId: proj2.id, userId: carlos.id },
    { projectId: proj2.id, userId: james.id },
    { projectId: proj2.id, userId: sofia.id },
    { projectId: proj3.id, userId: james.id },
    { projectId: proj3.id, userId: sofia.id },
  ]);

  await db.insert(timeLogs).values([
    {
      companyId, userId: carlos.id, projectId: proj1.id,
      clockIn: hoursAgo(200), clockOut: hoursAgo(192), totalMinutes: 480,
      notes: "Completed exterior north wall", date: fmtDate(hoursAgo(200)),
    },
    {
      companyId, userId: james.id, projectId: proj1.id,
      clockIn: hoursAgo(200), clockOut: hoursAgo(194), totalMinutes: 360,
      notes: "Primed interior walls", date: fmtDate(hoursAgo(200)),
    },
    {
      companyId, userId: carlos.id, projectId: proj2.id,
      clockIn: hoursAgo(48), clockOut: hoursAgo(40), totalMinutes: 480,
      notes: "Started floors 3-4", date: fmtDate(hoursAgo(48)),
    },
    {
      companyId, userId: sofia.id, projectId: proj2.id,
      clockIn: hoursAgo(24), clockOut: hoursAgo(16), totalMinutes: 480,
      notes: "Floor 5 in progress", date: fmtDate(hoursAgo(24)),
    },
  ]);

  await db.insert(expenses).values([
    {
      companyId, projectId: proj1.id, category: "Materials",
      description: "Paint & primer - 40 gallons", amount: "1200",
      date: "2024-03-01", createdBy: adminId,
    },
    {
      companyId, projectId: proj1.id, category: "Equipment",
      description: "Scaffolding rental", amount: "850",
      date: "2024-03-02", createdBy: adminId,
    },
    {
      companyId, projectId: proj2.id, category: "Materials",
      description: "Commercial grade paint - 120 gallons", amount: "3600",
      date: "2024-04-10", createdBy: adminId,
    },
  ]);

  await db.insert(employeeNotes).values([
    {
      companyId, projectId: proj2.id, userId: carlos.id,
      text: "Floors 3 and 4 require extra prep — water damage on east wall.",
    },
    {
      companyId, projectId: proj2.id, userId: sofia.id,
      text: "Client requested a change on floor 5 paint color — awaiting confirmation.",
    },
  ]);
}
