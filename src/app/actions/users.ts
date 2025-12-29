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

export async function createUser(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") return { error: "Unauthorized" }

    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")
    const role = formData.get("role")
    const teamId = formData.get("teamId")

    const validated = createUserSchema.safeParse({
        username,
        email,
        password,
        role,
        teamId: teamId ? parseInt(teamId as string) : undefined
    })

    if (!validated.success) {
        return { error: "Validation failed" }
    }

    try {
        const hashedPassword = await bcrypt.hash(validated.data.password, 10)

        await prisma.user.create({
            data: {
                username: validated.data.username,
                email: validated.data.email,
                role: validated.data.role,
                passwordHash: hashedPassword,
                teamId: validated.data.teamId
            }
        })
        revalidatePath("/dashboard/users")
        revalidatePath("/dashboard/teams")
        return { success: true }
    } catch (e) {
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
