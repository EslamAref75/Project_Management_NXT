"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export async function registerUser(formData: FormData) {
    const username = formData.get("username")
    const email = formData.get("email")
    const password = formData.get("password")

    // Server-side validation
    const validatedFields = registerSchema.safeParse({
        username,
        email,
        password,
    })

    if (!validatedFields.success) {
        return {
            error: "Validation failed. Please check your inputs.",
            details: validatedFields.error.flatten().fieldErrors,
        }
    }

    const { username: validUsername, email: validEmail, password: validPassword } = validatedFields.data

    try {
        // Check if user exists
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [{ email: validEmail }, { username: validUsername }],
            },
        })

        if (existingUser) {
            return { error: "User with this email or username already exists." }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(validPassword, 10)

        // Create user
        await prisma.user.create({
            data: {
                username: validUsername,
                email: validEmail,
                passwordHash: hashedPassword,
                role: "developer", // Default role
            },
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Something went wrong. Please try again." }
    }
}
