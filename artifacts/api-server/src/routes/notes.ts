import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, employeeNotes, projectAssignments, projects } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/notes?projectId=... — list notes for a project
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.query as { projectId?: string };
    const { companyId, userId, role } = req.user!;

    if (!projectId) {
      res.status(400).json({ error: "projectId is required" });
      return;
    }

    // Verify project belongs to company
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Employee: verify assignment
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

    const condition =
      role === "admin"
        ? and(eq(employeeNotes.projectId, projectId), eq(employeeNotes.companyId, companyId))
        : and(
            eq(employeeNotes.projectId, projectId),
            eq(employeeNotes.companyId, companyId),
            eq(employeeNotes.userId, userId)
          );

    const notes = await db.select().from(employeeNotes).where(condition);

    res.json(
      notes
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map((n) => ({
          id: n.id,
          projectId: n.projectId,
          employeeId: n.userId,
          text: n.text,
          createdAt: n.createdAt.toISOString(),
        }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// POST /api/notes — add a note
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId, text } = req.body as { projectId: string; text: string };
    const { companyId, userId, role } = req.user!;

    if (!projectId || !text?.trim()) {
      res.status(400).json({ error: "projectId and text are required" });
      return;
    }

    // Verify project
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Employee: verify assignment
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

    const [note] = await db
      .insert(employeeNotes)
      .values({ companyId, projectId, userId, text: text.trim() })
      .returning();

    res.status(201).json({
      id: note.id,
      projectId: note.projectId,
      employeeId: note.userId,
      text: note.text,
      createdAt: note.createdAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to add note" });
  }
});

// DELETE /api/notes/:id
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { companyId, userId, role } = req.user!;

    const [note] = await db
      .select()
      .from(employeeNotes)
      .where(eq(employeeNotes.id, id))
      .limit(1);

    if (!note || note.companyId !== companyId) {
      res.status(404).json({ error: "Note not found" });
      return;
    }

    if (role === "employee" && note.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    await db.delete(employeeNotes).where(and(eq(employeeNotes.id, id), eq(employeeNotes.companyId, companyId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

export default router;
