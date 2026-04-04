import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, expenses } from "@workspace/db";
import { requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// All expense endpoints are admin only — employees never see financial data

router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const all = await db
      .select()
      .from(expenses)
      .where(eq(expenses.companyId, req.user!.companyId));

    res.json(
      all.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        category: e.category,
        description: e.description,
        amount: Number(e.amount),
        date: e.date,
        createdBy: e.createdBy,
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { projectId, category, description, amount, date } = req.body as {
      projectId: string; category: string; description: string;
      amount: number; date: string;
    };

    if (!projectId || !category || !description || !amount || !date) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }

    const [expense] = await db
      .insert(expenses)
      .values({
        companyId: req.user!.companyId,
        projectId,
        category,
        description,
        amount: String(amount),
        date,
        createdBy: req.user!.userId,
      })
      .returning();

    res.status(201).json({
      id: expense.id,
      projectId: expense.projectId,
      category: expense.category,
      description: expense.description,
      amount: Number(expense.amount),
      date: expense.date,
      createdBy: expense.createdBy,
    });
  } catch {
    res.status(500).json({ error: "Failed to create expense" });
  }
});

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

    await db.delete(expenses).where(eq(expenses.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete expense" });
  }
});

export default router;
