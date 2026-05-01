import { Router } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, projects, projectAssignments, projectPhotos, users } from "@workspace/db";
import { requireAuth, requireAdmin, type AuthRequest } from "../middlewares/auth.js";
import { checkPlanLimit } from "../middlewares/planLimits.js";
import { sendPushNotifications } from "../lib/push.js";

/** Validates that all provided user IDs belong to the given company. Returns the valid IDs only. */
async function filterValidEmployeeIds(companyId: string, ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.companyId, companyId)));
  return rows.map((r) => r.id);
}

const router = Router();

// GET /api/projects — list projects (admin: all, employee: assigned only)
router.get("/", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { companyId, userId, role } = req.user!;

    let projectList;

    if (role === "admin") {
      projectList = await db
        .select()
        .from(projects)
        .where(eq(projects.companyId, companyId));
    } else {
      // Employee: get only assigned projects
      const assignments = await db
        .select({ projectId: projectAssignments.projectId })
        .from(projectAssignments)
        .where(eq(projectAssignments.userId, userId));

      const assignedIds = assignments.map((a) => a.projectId);

      if (assignedIds.length === 0) {
        res.json([]);
        return;
      }

      projectList = await db
        .select()
        .from(projects)
        .where(and(eq(projects.companyId, companyId), inArray(projects.id, assignedIds)));
    }

    // Get assignments and photos for all projects
    const projectIds = projectList.map((p) => p.id);
    if (projectIds.length === 0) {
      res.json([]);
      return;
    }

    const allAssignments = await db
      .select()
      .from(projectAssignments)
      .where(inArray(projectAssignments.projectId, projectIds));

    const allPhotos = await db
      .select()
      .from(projectPhotos)
      .where(inArray(projectPhotos.projectId, projectIds));

    // Build result — strip financial fields for employees
    const result = projectList.map((p) => {
      const assignedEmployeeIds = allAssignments
        .filter((a) => a.projectId === p.id)
        .map((a) => a.userId);
      const photos = allPhotos.filter((ph) => ph.projectId === p.id).map((ph) => ph.uri);

      const base = {
        id: p.id,
        name: p.name,
        address: p.address,
        status: p.status,
        paintColors: p.paintColors,
        notes: p.notes,
        startDate: p.startDate,
        expectedEndDate: p.expectedEndDate,
        assignedEmployeeIds,
        photos,
        documents: [] as string[],
        createdAt: p.createdAt.toISOString(),
      };

      if (role === "admin") {
        return {
          ...base,
          clientName: p.clientName,
          clientPhone: p.clientPhone,
          clientEmail: p.clientEmail,
          totalValue: Number(p.totalValue),
        };
      }

      return base;
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /api/projects/:id
router.get("/:id", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { companyId, userId, role } = req.user!;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    if (role === "employee") {
      const [assignment] = await db
        .select()
        .from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.userId, userId)))
        .limit(1);

      if (!assignment) {
        res.status(403).json({ error: "You are not assigned to this project" });
        return;
      }
    }

    const allAssignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, id));

    const photos = await db
      .select()
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, id));

    const base = {
      id: project.id,
      name: project.name,
      address: project.address,
      status: project.status,
      paintColors: project.paintColors,
      notes: project.notes,
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      assignedEmployeeIds: allAssignments.map((a) => a.userId),
      photos: photos.map((p) => p.uri),
      documents: [] as string[],
      createdAt: project.createdAt.toISOString(),
    };

    if (role === "admin") {
      res.json({
        ...base,
        clientName: project.clientName,
        clientPhone: project.clientPhone,
        clientEmail: project.clientEmail,
        totalValue: Number(project.totalValue),
      });
    } else {
      res.json(base);
    }
  } catch {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

// POST /api/projects — create project (admin only)
router.post("/", requireAdmin, checkPlanLimit("projects"), async (req: AuthRequest, res) => {
  try {
    const {
      name, address, clientName, clientPhone, clientEmail, totalValue,
      startDate, expectedEndDate, status, paintColors, notes, assignedEmployeeIds,
    } = req.body as {
      name: string; address: string; clientName?: string; clientPhone?: string;
      clientEmail?: string; totalValue?: number; startDate?: string;
      expectedEndDate?: string; status?: string; paintColors?: string[];
      notes?: string; assignedEmployeeIds?: string[];
    };

    if (!name?.trim() || !address?.trim()) {
      res.status(400).json({ error: "Name and address are required" });
      return;
    }

    const [project] = await db
      .insert(projects)
      .values({
        companyId: req.user!.companyId,
        name: name.trim(),
        address: address.trim(),
        clientName: clientName?.trim() ?? "",
        clientPhone: clientPhone?.trim() ?? "",
        clientEmail: clientEmail?.trim() ?? "",
        totalValue: String(totalValue ?? 0),
        startDate: startDate ?? null,
        expectedEndDate: expectedEndDate ?? null,
        status: (status as any) ?? "pending",
        paintColors: paintColors ?? [],
        notes: notes?.trim() ?? "",
      })
      .returning();

    const validEmployeeIds = assignedEmployeeIds?.length
      ? await filterValidEmployeeIds(req.user!.companyId, assignedEmployeeIds)
      : [];

    if (validEmployeeIds.length) {
      await db.insert(projectAssignments).values(
        validEmployeeIds.map((uid) => ({ projectId: project.id, userId: uid }))
      );
      // Notify assigned employees
      const empRows = await db
        .select({ pushToken: users.pushToken })
        .from(users)
        .where(inArray(users.id, validEmployeeIds));
      const tokens = empRows.map((r) => r.pushToken).filter(Boolean) as string[];
      if (tokens.length > 0) {
        sendPushNotifications(
          tokens,
          "Novo trabalho atribuído",
          `Foste adicionado ao trabalho "${project.name}" em ${project.address}`,
          { projectId: project.id },
        ).catch(() => {});
      }
    }

    res.status(201).json({
      id: project.id,
      name: project.name,
      address: project.address,
      clientName: project.clientName,
      clientPhone: project.clientPhone,
      clientEmail: project.clientEmail,
      totalValue: Number(project.totalValue),
      status: project.status,
      paintColors: project.paintColors,
      notes: project.notes,
      startDate: project.startDate,
      expectedEndDate: project.expectedEndDate,
      assignedEmployeeIds: validEmployeeIds,
      photos: [],
      documents: [],
      createdAt: project.createdAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to create project" });
  }
});

// PATCH /api/projects/:id — update project (admin only)
router.patch("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user!.companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    const {
      name, address, clientName, clientPhone, clientEmail, totalValue,
      startDate, expectedEndDate, status, paintColors, notes, assignedEmployeeIds,
    } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (address !== undefined) updates.address = address.trim();
    if (clientName !== undefined) updates.clientName = clientName.trim();
    if (clientPhone !== undefined) updates.clientPhone = clientPhone.trim();
    if (clientEmail !== undefined) updates.clientEmail = clientEmail.trim();
    if (totalValue !== undefined) updates.totalValue = String(totalValue);
    if (startDate !== undefined) updates.startDate = startDate;
    if (expectedEndDate !== undefined) updates.expectedEndDate = expectedEndDate;
    if (status !== undefined) updates.status = status;
    if (paintColors !== undefined) updates.paintColors = paintColors;
    if (notes !== undefined) updates.notes = notes.trim();

    const [updated] = await db
      .update(projects)
      .set(updates)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user!.companyId)))
      .returning();

    let newlyAssignedIds: string[] = [];
    if (assignedEmployeeIds !== undefined) {
      const validIds = assignedEmployeeIds.length
        ? await filterValidEmployeeIds(req.user!.companyId, assignedEmployeeIds)
        : [];

      const prevAssignments = await db
        .select({ userId: projectAssignments.userId })
        .from(projectAssignments)
        .where(eq(projectAssignments.projectId, id));
      const prevIds = new Set(prevAssignments.map((a) => a.userId));
      newlyAssignedIds = validIds.filter((uid) => !prevIds.has(uid));

      await db.delete(projectAssignments).where(eq(projectAssignments.projectId, id));
      if (validIds.length > 0) {
        await db.insert(projectAssignments).values(
          validIds.map((uid: string) => ({ projectId: id, userId: uid }))
        );
      }

      // Send push notifications to newly assigned employees
      if (newlyAssignedIds.length > 0) {
        const employeeRows = await db
          .select({ pushToken: users.pushToken })
          .from(users)
          .where(inArray(users.id, newlyAssignedIds));
        const tokens = employeeRows.map((r) => r.pushToken).filter(Boolean) as string[];
        if (tokens.length > 0) {
          const projectName = updated.name;
          const projectAddress = updated.address;
          sendPushNotifications(
            tokens,
            "Novo trabalho atribuído",
            `Foste adicionado ao trabalho "${projectName}" em ${projectAddress}`,
            { projectId: id },
          ).catch(() => {});
        }
      }
    }

    const finalAssignments = await db
      .select()
      .from(projectAssignments)
      .where(eq(projectAssignments.projectId, id));

    const photos = await db
      .select()
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, id));

    res.json({
      id: updated.id,
      name: updated.name,
      address: updated.address,
      clientName: updated.clientName,
      clientPhone: updated.clientPhone,
      clientEmail: updated.clientEmail,
      totalValue: Number(updated.totalValue),
      status: updated.status,
      paintColors: updated.paintColors,
      notes: updated.notes,
      startDate: updated.startDate,
      expectedEndDate: updated.expectedEndDate,
      assignedEmployeeIds: finalAssignments.map((a) => a.userId),
      photos: photos.map((p) => p.uri),
      documents: [],
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /api/projects/:id — delete project (admin only)
router.delete("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, req.user!.companyId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    await db.delete(projects).where(and(eq(projects.id, id), eq(projects.companyId, req.user!.companyId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// POST /api/projects/:id/photos — add photo
router.post("/:id/photos", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { uri } = req.body as { uri: string };
    const { companyId, userId, role } = req.user!;

    if (!uri) {
      res.status(400).json({ error: "uri is required" });
      return;
    }

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.companyId, companyId)))
      .limit(1);

    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Employees must be assigned to the project to upload photos
    if (role === "employee") {
      const [assignment] = await db
        .select()
        .from(projectAssignments)
        .where(and(eq(projectAssignments.projectId, id), eq(projectAssignments.userId, userId)))
        .limit(1);

      if (!assignment) {
        res.status(403).json({ error: "You are not assigned to this project" });
        return;
      }
    }

    const [photo] = await db
      .insert(projectPhotos)
      .values({ companyId, projectId: id, uri })
      .returning();

    res.status(201).json(photo);
  } catch {
    res.status(500).json({ error: "Failed to add photo" });
  }
});

export default router;
