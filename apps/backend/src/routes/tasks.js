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
    where.OR = [
      { title: { contains: query.search } },
      { project: { name: { contains: query.search } } },
      { assignees: { some: { username: { contains: query.search } } } },
    ];
  }
  if (query.projectId && query.projectId.length) {
    where.projectId = { in: query.projectId.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n)) };
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
    if (statusIds.length) conditions.push({ taskStatusId: { in: statusIds } });
    if (statusNames.length) conditions.push({ status: { in: statusNames }, taskStatusId: null });
    if (conditions.length) {
      where.AND = where.AND || [];
      where.AND.push({ OR: conditions });
    }
  }
  if (query.priority && query.priority.length) {
    where.priority = { in: query.priority };
  }
  if (query.assigneeId) {
    if (query.assigneeId === "me") {
      where.assignees = { some: { id: userIdNum } };
    } else {
      const id = parseInt(query.assigneeId, 10);
      if (!Number.isNaN(id)) where.assignees = { some: { id } };
    }
  }
  if (query.startDate || query.endDate) {
    const dateField = query.dateFilterType === "createdDate" ? "createdAt" : "dueDate";
    where.AND = where.AND || [];
    if (query.startDate) where.AND.push({ [dateField]: { gte: new Date(query.startDate) } });
    if (query.endDate) where.AND.push({ [dateField]: { lte: new Date(query.endDate) } });
  }

  return where;
}

const taskListSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  projectId: true,
  createdAt: true,
  createdById: true,
  assignees: {
    select: { id: true, username: true, email: true, avatarUrl: true },
  },
  project: {
    select: { id: true, name: true },
  },
  _count: {
    select: { dependencies: true, dependents: true },
  },
};

router.get("/tasks", async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const where = buildListWhere(req.query, userId);
    if (req.user.role !== "admin") {
      const userConditions = [
        { assignees: { some: { id: Number(userId) } } },
        { createdById: Number(userId) },
      ];
      if (where.OR) {
        where.AND = where.AND || [];
        where.AND.push({ OR: [...where.OR, ...userConditions] });
        delete where.OR;
      } else {
        where.OR = userConditions;
      }
    }
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: taskListSelect,
      }),
      prisma.task.count({ where }),
    ]);
    return res.json({ success: true, tasks, total, page, limit });
  } catch (err) {
    console.error("[tasks] list:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch tasks" });
  }
});

router.get("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const userId = Number(req.user.id);
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        priority: true,
        status: true,
        dueDate: true,
        projectId: true,
        createdAt: true,
        createdById: true,
        startedAt: true,
        completedAt: true,
        taskStatusId: true,
        teamId: true,
        assignees: { select: { id: true, username: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true } },
        taskStatus: { select: { id: true, name: true, color: true } },
        team: { select: { id: true, name: true } },
        creator: { select: { id: true, username: true, email: true, avatarUrl: true } },
        attachments: { select: { id: true, fileName: true, fileUrl: true, fileSize: true, uploadedAt: true } },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: { select: { id: true, username: true, email: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
            assignedTo: { select: { id: true, username: true, avatarUrl: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        dependencies: {
          select: {
            dependsOnTaskId: true,
            dependsOnTask: {
              select: {
                id: true,
                title: true,
                status: true,
                assignees: { select: { id: true, username: true, avatarUrl: true } },
              },
            },
          },
        },
        dependents: {
          select: {
            taskId: true,
            task: {
              select: {
                id: true,
                title: true,
                status: true,
                assignees: { select: { id: true, username: true, avatarUrl: true } },
              },
            },
          },
        },
        _count: { select: { subtasks: true, dependencies: true, dependents: true, comments: true } },
      },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    if (req.user.role !== "admin") {
      const isAssignee = task.assignees.some((a) => a.id === userId);
      const isCreator = task.createdById === userId;
      if (!isAssignee && !isCreator) return res.status(404).json({ error: "Task not found" });
    }
    return res.json(task);
  } catch (err) {
    console.error("[tasks] get:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch task" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const body = req.body || {};
    const projectId = body.projectId != null ? parseInt(body.projectId, 10) : null;
    if (!projectId || Number.isNaN(projectId)) {
      return res.status(400).json({ error: "projectId is required" });
    }
    const allowed = await hasPermissionWithoutRoleBypass(userId, "task.create", projectId);
    if (!allowed) {
      return res.status(403).json({ error: "Permission denied: You don't have permission to create tasks" });
    }
    const title = body.title && String(body.title).trim();
    if (!title) return res.status(400).json({ error: "title is required" });
    const assigneeIds = Array.isArray(body.assigneeIds) ? body.assigneeIds.map((id) => parseInt(id, 10)).filter((n) => !Number.isNaN(n)) : [];
    const task = await prisma.task.create({
      data: {
        title: title,
        description: body.description || null,
        priority: body.priority || "normal",
        projectId,
        createdById: userId,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        ...(assigneeIds.length > 0 && {
          assignees: { connect: assigneeIds.map((id) => ({ id })) },
        }),
      },
      include: { assignees: true, project: true },
    });
    return res.status(200).json({ success: true, id: task.id });
  } catch (err) {
    console.error("[tasks] create:", err);
    return res.status(500).json({ error: err.message || "Failed to create task" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const userId = Number(req.user.id);
    const existing = await prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, projectId: true, assignees: { select: { id: true } } },
    });
    if (!existing) return res.status(404).json({ error: "Task not found" });
    const allowed = await hasPermissionWithoutRoleBypass(userId, "task.update", existing.projectId);
    const isCreator = existing.createdById === userId;
    const isAssignee = existing.assignees.some((a) => a.id === userId);
    if (!allowed && !isCreator && !isAssignee) {
      return res.status(403).json({ error: "Permission denied" });
    }
    const body = req.body || {};
    const updateData = {};
    if (body.title != null) updateData.title = String(body.title).trim();
    if (body.description != null) updateData.description = body.description;
    if (body.priority != null) updateData.priority = body.priority;
    if (body.status != null) updateData.status = body.status;
    if (body.taskStatusId != null) updateData.taskStatusId = body.taskStatusId ? parseInt(body.taskStatusId, 10) : null;
    if (body.dueDate != null) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.assigneeIds && Array.isArray(body.assigneeIds)) {
      updateData.assignees = { set: body.assigneeIds.map((id) => ({ id: parseInt(id, 10) })).filter((o) => !Number.isNaN(o.id)) };
    }
    if (Object.keys(updateData).length === 0) return res.json({ success: true });
    await prisma.task.update({
      where: { id },
      data: updateData,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("[tasks] update:", err);
    return res.status(500).json({ error: err.message || "Failed to update task" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid task ID" });
    const userId = Number(req.user.id);
    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, createdById: true, projectId: true },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });
    const allowed = await hasPermissionWithoutRoleBypass(userId, "task.delete", task.projectId);
    const isCreator = task.createdById === userId;
    if (!allowed && !isCreator) {
      return res.status(403).json({ error: "Permission denied" });
    }
    await prisma.task.delete({ where: { id } });
    return res.json({ success: true });
  } catch (err) {
    console.error("[tasks] delete:", err);
    return res.status(500).json({ error: err.message || "Failed to delete task" });
  }
});

router.get("/task-statuses", async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === "true";
    const where = includeInactive ? {} : { isActive: true };
    const taskStatuses = await prisma.taskStatus.findMany({
      where,
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    });
    return res.json({ success: true, taskStatuses });
  } catch (err) {
    console.error("[tasks] task-statuses:", err);
    return res.status(500).json({ error: err.message || "Failed to fetch task statuses" });
  }
});

module.exports = router;
