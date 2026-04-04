import { Router } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, timeLogs, projectAssignments, users, projects } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";

const router = Router();

// GET /api/timelogs — list time logs
// Admin: all company logs; Employee: own logs only
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, userId, role } = req.user!;

    const condition =
      role === "admin"
        ? eq(timeLogs.companyId, companyId)
        : and(eq(timeLogs.companyId, companyId), eq(timeLogs.userId, userId));

    const logs = await db
      .select()
      .from(timeLogs)
      .where(condition)
      .orderBy(desc(timeLogs.clockIn));

    // For admin, include hourly rate for cost calculations
    if (role === "admin") {
      const allUsers = await db.select({ id: users.id, hourlyRate: users.hourlyRate }).from(users).where(eq(users.companyId, companyId));
      const rateMap = new Map(allUsers.map((u) => [u.id, Number(u.hourlyRate)]));

      res.json(
        logs.map((l) => ({
          id: l.id,
          employeeId: l.userId,
          projectId: l.projectId,
          clockIn: l.clockIn.toISOString(),
          clockOut: l.clockOut?.toISOString(),
          totalMinutes: l.totalMinutes,
          notes: l.notes,
          date: l.date,
          laborCost: l.totalMinutes
            ? ((l.totalMinutes / 60) * (rateMap.get(l.userId) ?? 0))
            : 0,
        }))
      );
    } else {
      res.json(
        logs.map((l) => ({
          id: l.id,
          employeeId: l.userId,
          projectId: l.projectId,
          clockIn: l.clockIn.toISOString(),
          clockOut: l.clockOut?.toISOString(),
          totalMinutes: l.totalMinutes,
          notes: l.notes,
          date: l.date,
        }))
      );
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch time logs" });
  }
});

// POST /api/timelogs/clock-in
router.post("/clock-in", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { projectId } = req.body as { projectId: string };
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

    // Employee: verify they're assigned to this project
    if (role === "employee") {
      const [assignment] = await db
        .select()
        .from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, userId)))
        .limit(1);

      if (!assignment) {
        res.status(403).json({ error: "You are not assigned to this project" });
        return;
      }
    }

    // Check no active session
    const activeLog = await db
      .select()
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.companyId, companyId)))
      .then((logs) => logs.find((l) => !l.clockOut));

    if (activeLog) {
      res.status(409).json({ error: "You already have an active session. Please clock out first." });
      return;
    }

    const now = new Date();
    const [log] = await db
      .insert(timeLogs)
      .values({
        companyId,
        userId,
        projectId,
        clockIn: now,
        date: now.toISOString().split("T")[0],
        notes: "",
      })
      .returning();

    res.status(201).json({
      id: log.id,
      employeeId: log.userId,
      projectId: log.projectId,
      clockIn: log.clockIn.toISOString(),
      clockOut: null,
      totalMinutes: null,
      notes: log.notes,
      date: log.date,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to clock in" });
  }
});

// POST /api/timelogs/clock-out
router.post("/clock-out", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { logId, notes } = req.body as { logId: string; notes?: string };
    const { companyId, userId, role } = req.user!;

    if (!logId) {
      res.status(400).json({ error: "logId is required" });
      return;
    }

    const [log] = await db
      .select()
      .from(timeLogs)
      .where(eq(timeLogs.id, logId))
      .limit(1);

    if (!log) {
      res.status(404).json({ error: "Time log not found" });
      return;
    }

    if (log.companyId !== companyId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (role === "employee" && log.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    if (log.clockOut) {
      res.status(400).json({ error: "This session has already been clocked out" });
      return;
    }

    const now = new Date();
    const totalMinutes = Math.round((now.getTime() - log.clockIn.getTime()) / 60000);

    const [updated] = await db
      .update(timeLogs)
      .set({ clockOut: now, totalMinutes, notes: notes ?? log.notes })
      .where(eq(timeLogs.id, logId))
      .returning();

    res.json({
      id: updated.id,
      employeeId: updated.userId,
      projectId: updated.projectId,
      clockIn: updated.clockIn.toISOString(),
      clockOut: updated.clockOut?.toISOString(),
      totalMinutes: updated.totalMinutes,
      notes: updated.notes,
      date: updated.date,
    });
  } catch {
    res.status(500).json({ error: "Failed to clock out" });
  }
});

// GET /api/timelogs/active — get active log for current user
router.get("/active", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, userId } = req.user!;

    const logs = await db
      .select()
      .from(timeLogs)
      .where(and(eq(timeLogs.userId, userId), eq(timeLogs.companyId, companyId)));

    const activeLog = logs.find((l) => !l.clockOut);

    if (!activeLog) {
      res.json(null);
      return;
    }

    res.json({
      id: activeLog.id,
      employeeId: activeLog.userId,
      projectId: activeLog.projectId,
      clockIn: activeLog.clockIn.toISOString(),
      clockOut: null,
      totalMinutes: null,
      notes: activeLog.notes,
      date: activeLog.date,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch active log" });
  }
});

export default router;
