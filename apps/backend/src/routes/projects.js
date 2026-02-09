"use strict";

const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/auth");
const { prisma } = require("../lib/prisma");
const { hasPermissionWithoutRoleBypass } = require("../lib/rbac");

router.use(authMiddleware);

function buildListWhere(query, userId) {
  const where = {};
  const userIdNum = Number(userId);

  if (query.search) {
    where.name = { contains: query.search };
  }
  if (query.category && query.category.length) {
    where.type = { in: query.category };
  }
  if (query.status && query.status.length) {
    const statusIds = [];
    const statusNames = [];
    for (const s of query.status) {
      const id = parseInt(s, 10);
      if (!Number.isNaN(id)) statusIds.push(id);
      else statusNames.push(s);
    }
    const conditions = [];
    if (statusIds.length) conditions.push({ projectStatusId: { in: statusIds } });
    const legacyNames = statusNames.filter((n) => n !== "active" && n !== "completed");
    if (legacyNames.length) {
      conditions.push({ status: { in: legacyNames }, projectStatusId: null });
    }
    if (statusNames.includes("active")) {
      conditions.push({ status: "active" });
      conditions.push({ projectStatus: { isActive: true } });
    }
    if (statusNames.includes("completed")) {
      conditions.push({ status: "completed" });
      conditions.push({ projectStatus: { isFinal: true } });
    }
    if (conditions.length) {
      where.OR = conditions;
      if (query.priority && query.priority.length) {
        where.priority = { in: query.priority };
      }
    }
  }
  if (query.startDate || query.endDate) {
    where.AND = where.AND || [];
    if (query.startDate) {
      where.AND.push({ startDate: { gte: new Date(query.startDate) } });
    }
    if (query.endDate) {
      where.AND.push({ endDate: { lte: new Date(query.endDate) } });
    }
  }
  if (query.projectManager) {
    where.projectManagerId = parseInt(query.projectManager, 10);
  }

  return hasPermissionWithoutRoleBypass(userIdNum, "project.viewAll").then((canViewAll) => {
    if (!canViewAll) {
      const userConditions = [
        { projectManagerId: userIdNum },
        { createdById: userIdNum },
      ];
      if (where.OR) {
        where.AND = where.AND || [];
        where.AND.push({ OR: [...where.OR, ...userConditions] });
        delete where.OR;
      } else {
        where.OR = userConditions;
      }
    }
    return where;
  });
}

const projectListSelect = {
  id: true,
  name: true,
  description: true,
  status: true,
  type: true,
  projectStatusId: true,
  projectTypeId: true,
  projectManagerId: true,
  startDate: true,
  endDate: true,
  createdAt: true,
  createdById: true,
  projectManager: {
    select: { id: true, username: true, email: true, avatarUrl: true },
  },
  _count: {
    select: { tasks: true, projectUsers: true, notifications: true },
  },
};

router.get("/projects", async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const where = await buildListWhere(req.query, userId);
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: projectListSelect,
      }),
      prisma.project.count({ where }),
    ]);

    return res.json({ success: true, projects, total, page, limit });
  } catch (err) {
    console.error("[projects] list:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch projects" });
  }
});

router.get("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid project ID" });

    const [project, tasks, teams] = await Promise.all([
      prisma.project.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          type: true,
          priority: true,
          projectStatusId: true,
          projectTypeId: true,
          projectManagerId: true,
          startDate: true,
          endDate: true,
          createdAt: true,
          createdById: true,
          urgentMarkedAt: true,
          urgentMarkedById: true,
          projectType: { select: { id: true, name: true } },
          projectStatus: { select: { id: true, name: true } },
          projectManager: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          urgentMarkedBy: { select: { id: true, username: true } },
          _count: { select: { tasks: true, projectUsers: true, projectTeams: true } },
        },
      }),
      prisma.task.findMany({
        where: { projectId: id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          taskStatusId: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          assignees: {
            select: { id: true, username: true, email: true, avatarUrl: true },
          },
          attachments: {
            select: { id: true, fileName: true, fileUrl: true, fileType: true, fileSize: true },
          },
          dependencies: {
            select: {
              dependencyType: true,
              dependsOnTaskId: true,
              dependsOnTask: {
                select: { id: true, title: true, status: true, taskStatusId: true },
              },
            },
          },
        },
      }),
      prisma.projectTeam.findMany({
        where: { projectId: id },
        select: {
          id: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              description: true,
              teamLead: {
                select: { id: true, username: true, email: true, avatarUrl: true },
              },
              members: {
                select: {
                  id: true,
                  userId: true,
                  user: {
                    select: { id: true, username: true, email: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json({ ...project, tasks, projectTeams: teams });
  } catch (err) {
    console.error("[projects] get:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch project" });
  }
});

router.post("/projects", async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const allowed = await hasPermissionWithoutRoleBypass(userId, "project.create");
    if (!allowed) {
      return res.status(403).json({ error: "Permission denied: You don't have permission to create projects" });
    }
    const body = req.body || {};
    const name = body.name;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }
    const projectTypeId = body.projectTypeId != null ? parseInt(body.projectTypeId, 10) : null;
    let typeName = body.type || "";
    if (projectTypeId) {
      const pt = await prisma.projectType.findUnique({
        where: { id: projectTypeId },
        select: { name: true },
      });
      if (pt) typeName = pt.name;
    }
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        type: typeName,
        projectTypeId: projectTypeId || undefined,
        projectStatusId: body.projectStatusId != null ? parseInt(body.projectStatusId, 10) : undefined,
        description: body.description || null,
        scope: body.scope || null,
        status: "planned",
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        projectManagerId: body.projectManagerId > 0 ? body.projectManagerId : null,
        createdById: userId,
      },
    });
    return res.status(200).json({ success: true, id: project.id });
  } catch (err) {
    console.error("[projects] create:", err);
    return res.status(500).json({ error: err.message || "Failed to create project" });
  }
});

router.patch("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid project ID" });
    const userId = Number(req.user.id);

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const allowed = await hasPermissionWithoutRoleBypass(userId, "project.update", id);
    const isCreator = existing.createdById === userId;
    if (!allowed && !isCreator) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const body = req.body || {};
    const projectTypeId = body.projectTypeId != null ? parseInt(body.projectTypeId, 10) : undefined;
    const projectStatusId = body.projectStatusId != null ? parseInt(body.projectStatusId, 10) : undefined;
    let typeName = body.type;
    let statusName = body.status;
    if (projectTypeId) {
      const pt = await prisma.projectType.findUnique({ where: { id: projectTypeId }, select: { name: true } });
      if (pt) typeName = pt.name;
    }
    if (projectStatusId && prisma.projectStatus) {
      const ps = await prisma.projectStatus.findUnique({ where: { id: projectStatusId }, select: { name: true } });
      if (ps) statusName = ps.name;
    }

    await prisma.project.update({
      where: { id },
      data: {
        name: body.name != null ? String(body.name) : undefined,
        type: typeName,
        projectTypeId,
        projectStatusId,
        description: body.description != null ? body.description : undefined,
        scope: body.scope != null ? body.scope : undefined,
        status: statusName,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        projectManagerId: body.projectManagerId != null && body.projectManagerId > 0 ? body.projectManagerId : null,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[projects] update:", err);
    return res.status(500).json({ error: err.message || "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid project ID" });
    const userId = Number(req.user.id);

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { id: true, createdById: true },
    });
    if (!existing) return res.status(404).json({ error: "Project not found" });

    const allowed = await hasPermissionWithoutRoleBypass(userId, "project.delete", id);
    const isCreator = existing.createdById === userId;
    if (!allowed && !isCreator) {
      return res.status(403).json({ error: "Permission denied" });
    }

    await prisma.project.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("[projects] delete:", err);
    return res.status(500).json({ error: err.message || "Failed to delete project" });
  }
});

router.get("/project-types", async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const includeUsageCount = req.query.includeUsageCount === "true";
    const where = includeInactive ? {} : { isActive: true };
    const projectTypes = await prisma.projectType.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: includeUsageCount ? { _count: { select: { projects: true } } } : undefined,
    });
    const formatted = includeUsageCount
      ? projectTypes.map((t) => ({ ...t, usageCount: (t._count && t._count.projects) || 0 }))
      : projectTypes;
    return res.json({ success: true, projectTypes: formatted });
  } catch (err) {
    console.error("[project-types]:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch project types" });
  }
});

router.get("/project-statuses", async (req, res) => {
  try {
    if (!prisma.projectStatus) {
      return res.status(503).json({
        error: "ProjectStatus model not available",
        details: "Run prisma generate in the backend app",
      });
    }
    const includeInactive = req.query.includeInactive === "true";
    const where = includeInactive ? {} : { isActive: true };
    const projectStatuses = await prisma.projectStatus.findMany({
      where,
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    });
    return res.json({ success: true, projectStatuses });
  } catch (err) {
    console.error("[project-statuses]:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch project statuses" });
  }
});

module.exports = router;
