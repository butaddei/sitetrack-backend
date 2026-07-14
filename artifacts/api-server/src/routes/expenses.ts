import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, expenses, projects, projectAssignments, users } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/expenses — admin: all company expenses; employee: own submissions for assigned projects
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, userId, role } = req.user!;

    let rows;
    if (role === "admin") {
      rows = await db
        .select()
        .from(expenses)
        .where(eq(expenses.companyId, companyId));
    } else {
      // Employees see only their own submissions
      rows = await db
        .select()
        .from(expenses)
        .where(and(eq(expenses.companyId, companyId), eq(expenses.createdBy, userId)));
    }

    // Fetch submitter names for admin view
    const submitterIds = [...new Set(rows.map((e) => e.createdBy))];
    const submitterMap = new Map<string, string>();
    if (submitterIds.length > 0) {
      const submitters = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(eq(users.companyId, companyId));
      submitters.forEach((u) => submitterMap.set(u.id, u.name));
    }

    res.json(
      rows.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        createdBy: e.createdBy,
        submitterName: submitterMap.get(e.createdBy) ?? "Unknown",
        supplier: e.supplier ?? null,
        gst: e.gst != null ? Number(e.gst) : null,
        receiptPhoto: e.receiptPhoto ?? null,
        approvalStatus: (e.approvalStatus ?? "pending") as "pending" | "approved" | "rejected",
        rejectionReason: e.rejectionReason ?? null,
        approvedBy: e.approvedBy ?? null,
        approvedAt: e.approvedAt?.toISOString() ?? null,
        rejectedBy: e.rejectedBy ?? null,
        rejectedAt: e.rejectedAt?.toISOString() ?? null,
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// POST /api/expenses — any authenticated user (employee or admin) can submit
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId, category, description, amount, date, supplier, gst, receiptPhoto } = req.body as {
      projectId: string;
      category: string;
      description: string;
      amount: number;
      date: string;
      supplier?: string;
      gst?: number;
      receiptPhoto?: string;
    };
    const { companyId, userId, role } = req.user!;

    if (!projectId || !category || !description || !amount || !date) {
      res.status(400).json({ error: "projectId, category, description, amount and date are required" });
      return;
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Employees must be assigned to the project
    if (role === "employee") {
      const [assignment] = await db
        .select()
        .from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)))
        .limit(1);
      if (!assignment) {
        res.status(403).json({ error: "Not assigned to this project" });
        return;
      }
    }

    // Admin expenses are auto-approved; employee submissions are pending
    const approvalStatus = role === "admin" ? "approved" : "pending";

    const [expense] = await db
      .insert(expenses)
      .values({
        companyId,
        projectId,
        category,
        description,
        amount: String(amount),
        date,
        createdBy: userId,
        supplier: supplier ?? null,
        gst: gst != null ? String(gst) : null,
        receiptPhoto: receiptPhoto ?? null,
        approvalStatus,
      })
      .returning();

    const [submitter] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);

    res.status(201).json({
      id: expense.id,
      projectId: expense.projectId,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date,
      createdBy: expense.createdBy,
      submitterName: submitter?.name ?? "Unknown",
      supplier: expense.supplier ?? null,
      gst: expense.gst != null ? Number(expense.gst) : null,
      receiptPhoto: expense.receiptPhoto ?? null,
      approvalStatus: expense.approvalStatus,
      rejectionReason: expense.rejectionReason ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// PATCH /api/expenses/:id/approve — admin approves or rejects an expense
router.patch("/:id/approve", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body as {
      status: "approved" | "rejected";
      rejectionReason?: string;
    };
    const { companyId } = req.user!;

    if (!["approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "status must be 'approved' or 'rejected'" });
      return;
    }

    if (status === "rejected" && !rejectionReason?.trim()) {
      res.status(400).json({ error: "rejectionReason is required when rejecting" });
      return;
    }

    const [existing] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    const now = new Date();
    const [updated] = await db
      .update(expenses)
      .set({
        approvalStatus: status,
        rejectionReason: status === "rejected" ? (rejectionReason ?? null) : null,
        approvedBy: status === "approved" ? req.user!.userId : null,
        approvedAt: status === "approved" ? now : null,
        rejectedBy: status === "rejected" ? req.user!.userId : null,
        rejectedAt: status === "rejected" ? now : null,
      })
      .where(and(eq(expenses.id, id), eq(expenses.companyId, companyId)))
      .returning();

    const [approver] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    res.json({
      id: updated.id,
      projectId: updated.projectId,
      category: updated.category,
      description: updated.description,
      amount: Number(updated.amount),
      date: updated.date,
      createdBy: updated.createdBy,
      supplier: updated.supplier ?? null,
      gst: updated.gst != null ? Number(updated.gst) : null,
      receiptPhoto: updated.receiptPhoto ?? null,
      approvalStatus: updated.approvalStatus,
      rejectionReason: updated.rejectionReason ?? null,
      approvedBy: updated.approvedBy ?? null,
      approvedAt: updated.approvedAt?.toISOString() ?? null,
      approvedByName: status === "approved" ? (approver?.name ?? null) : null,
      rejectedBy: updated.rejectedBy ?? null,
      rejectedAt: updated.rejectedAt?.toISOString() ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to update expense" });
  }
});

// DELETE /api/expenses/:id — admin only
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(expenses)
      .where(and(eq(expenses.id, id), eq(expenses.companyId, req.user!.companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Expense not found" });
      return;
    }

    await db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.companyId, req.user!.companyId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
