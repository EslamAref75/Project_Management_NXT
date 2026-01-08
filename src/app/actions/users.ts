"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"


const createUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.string().default("developer"),
    teamId: z.coerce.number().optional()
})

export async function getUsers() {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const users = await prisma.user.findMany({
        include: {
            team: { select: { id: true, name: true } }
        },
        orderBy: { username: "asc" }
    })

    return users
}

export async function getUser(id: number) {
    const session = await getServerSession(authOptions)
    if (!session) throw new Error("Unauthorized")

    const user = await prisma.user.findUnique({
        where: { id },
        include: {
            team: { select: { id: true, name: true } },
            roles: {
                include: {
                    role: true
                }
            }
        }
    })

    return user
}

export async function createUser(formData: FormData) {
    const session = await getServerSession(authOptions)
    // Check for admin permissions (using legacy check for now, ideally should use RBAC)
    // TODO: Update this to check for correct permissions
    if (!session || (session.user.role !== "admin" && session.user.role !== "System Admin")) return { error: "Unauthorized" }

    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")
    const roleName = formData.get("role")
    const teamId = formData.get("teamId")

    const validated = createUserSchema.safeParse({
        username,
        email,
        password,
        role: roleName,
        teamId: teamId ? parseInt(teamId as string) : undefined
    })

    if (!validated.success) {
        return { error: "Validation failed" }
    }

    try {
        const hashedPassword = await bcrypt.hash(validated.data.password, 10)

        // 1. Check if the role exists in the roles table
        const rbacRole = await prisma.role.findUnique({
            where: { name: validated.data.role }
        })

        // 2. Create the user
        const newUser = await prisma.user.create({
            data: {
                username: validated.data.username,
                email: validated.data.email,
                role: validated.data.role, // Keep legacy field in sync for now
                passwordHash: hashedPassword,
                teamId: validated.data.teamId
            }
        })

        // 3. If RBAC role exists, assign it to the user
        if (rbacRole) {
            await prisma.userRole.create({
                data: {
                    userId: newUser.id,
                    roleId: rbacRole.id,
                    scopeType: "global", // Defaulting to global scope for dashboard creation
                    scopeId: 0
                }
            })
        }

        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/teams")
        return { success: true }
    } catch (e) {
        console.error("Create User Error:", e)
        return { error: "Failed to create user (Email/Username might be taken)" }
    }
}

export async function updateUser(id: number, formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") return { error: "Unauthorized" }

    // Logic to update user (excluding password for now unless requested)
    const role = formData.get("role") as string
    const teamId = formData.get("teamId") ? parseInt(formData.get("teamId") as string) : null

    try {
        await prisma.user.update({
            where: { id },
            data: { role, teamId }
        })
        revalidatePath("/dashboard/users")
        return { success: true }
    } catch (e) {
        return { error: "Failed to update user" }
    }
}

export async function deleteUser(id: number) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") return { error: "Unauthorized" }

    try {
        await prisma.user.delete({ where: { id } })
        revalidatePath("/dashboard/users")
        return { success: true }
    } catch (e) {
        return { error: "Failed to delete user" }
    }
}

export async function updateUserTeam(userId: number, teamId: number | null) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        await prisma.user.update({
            where: { id: userId },
            data: { teamId: teamId }
        })
        revalidatePath("/dashboard/users")
        return { success: true }
    } catch (e) {
        return { error: "Failed to update user team" }
    }
}
