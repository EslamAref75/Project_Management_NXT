"use server"

import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function uploadSystemLogo(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== "admin") {
        return { error: "Unauthorized" }
    }

    const file = formData.get("file") as File
    if (!file) {
        return { error: "No file provided" }
    }

    // Validation
    const validTypes = ["image/jpeg", "image/png", "image/svg+xml"]
    if (!validTypes.includes(file.type)) {
        return { error: "Invalid file type. Only JPG, PNG, and SVG are allowed." }
    }

    if (file.size > 2 * 1024 * 1024) { // 2MB
        return { error: "File size exceeds 2MB limit." }
    }

    try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Create directory if it doesn't exist
        const uploadDir = join(process.cwd(), "public", "uploads", "branding")
        await mkdir(uploadDir, { recursive: true })

        // Generate safe filename
        const timestamp = Date.now()
        // Simple sanitization: remove non-alphanumeric chars (except . and -)
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "")
        const filename = `${timestamp}-${safeName}`
        const filepath = join(uploadDir, filename)

        await writeFile(filepath, buffer)

        return {
            success: true,
            url: `/uploads/branding/${filename}`
        }
    } catch (error: any) {
        console.error("Upload error:", error)
        return { error: "Failed to upload file" }
    }
}
