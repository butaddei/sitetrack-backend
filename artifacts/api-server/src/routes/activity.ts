import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, activityLog, projects, projectAssignments, users } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/activity?projectId=... — get activity feed for a project
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

    const entries = await db
      .select()
      .from(activityLog)
      .where(and(eq(activityLog.projectId, projectId), eq(activityLog.companyId, companyId)))
      .orderBy(desc(activityLog.createdAt))
      .limit(100);

    // Fetch actor names
    const actorIds = [...new Set(entries.map((e) => e.userId))];
    const actorMap = new Map<string, { name: string; avatarUrl: string | null }>();
    if (actorIds.length > 0) {
      const actors = await db
        .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.companyId, companyId));
      actors.forEach((u) => actorMap.set(u.id, { name: u.name, avatarUrl: u.avatarUrl ?? null }));
    }

    res.json(
      entries.map((e) => ({
        id: e.id,
        projectId: e.projectId,
        userId: e.userId,
        actorName: actorMap.get(e.userId)?.name ?? "Unknown",
        actorAvatar: actorMap.get(e.userId)?.avatarUrl ?? null,
        activityType: e.activityType,
        description: e.description,
        metadata: e.metadata ? JSON.parse(e.metadata) : null,
        createdAt: e.createdAt.toISOString(),
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

export default router;
