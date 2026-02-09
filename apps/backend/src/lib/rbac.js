"use strict";

const { prisma } = require("./prisma");

async function hasPermissionWithoutRoleBypass(userId, permission, projectId) {
  try {
    const scopeCondition = [
      { scopeType: null },
      { scopeType: "global" },
    ];
    if (projectId) {
      scopeCondition.push({ scopeType: "project", scopeId: projectId });
    }
    const userRoles = await prisma.userRole.findMany({
      where: {
        userId: Number(userId),
        OR: scopeCondition,
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
    for (const userRole of userRoles) {
      for (const rp of userRole.role.permissions) {
        if (rp.permission.key === permission) return true;
      }
    }
    return false;
  } catch (err) {
    console.error("[rbac] Error checking permission:", err);
    return false;
  }
}

module.exports = { hasPermissionWithoutRoleBypass };
