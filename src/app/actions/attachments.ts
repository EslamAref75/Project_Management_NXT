"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidatePath } from "next/cache"
import { logActivity } from "@/lib/activity-logger"
import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import {
  validateFileUpload,
  sanitizeFilename,
  generateSafeFilename,
  validateFileContent,
  getReadableFileSize,
} from "@/lib/file-upload-validator"

// Ensure uploads directory exists
const uploadsDir = join(process.cwd(), "public", "uploads")

async function ensureUploadsDir() {
  if (!existsSync(uploadsDir)) {
    await mkdir(uploadsDir, { recursive: true })
  }
}

export async function uploadProjectFile(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session) return { error: "Unauthorized", code: "UNAUTHORIZED" }

  const file = formData.get("file") as File | null
  const projectId = formData.get("projectId")
  const taskId = formData.get("taskId") // Optional - for task-specific files

  if (!file || !projectId) {
    return { error: "File and project ID are required", code: "MISSING_PARAMS" }
  }

  try {
    // 1. VALIDATE FILE BEFORE PROCESSING
    const validation = validateFileUpload(file)
    if (!validation.valid) {
      return {
        error: validation.error || "Invalid file",
        code: "INVALID_FILE",
      }
    }

    // 2. VALIDATE FILE CONTENT (Magic Bytes) - Prevent MIME type spoofing
    const bytes = await file.arrayBuffer()
    const contentValid = await validateFileContent(bytes, file.type)
    if (!contentValid) {
      return {
        error: "File content does not match declared type. Possible spoofing attempt.",
        code: "CONTENT_MISMATCH",
      }
    }

    await ensureUploadsDir()

    // 3. GENERATE SAFE FILENAME
    const safeFilename = generateSafeFilename(
      file.name,
      parseInt(session.user.id)
    )
    const filePath = join(uploadsDir, safeFilename)

    // 4. SAVE FILE TO DISK
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 5. CREATE DATABASE RECORD
    const fileUrl = `/uploads/${safeFilename}`
    const attachment = await prisma.attachment.create({
      data: {
        fileName: sanitizeFilename(file.name),
        fileUrl: fileUrl,
        fileType: file.type || null,
        fileSize: file.size || null,
        taskId: taskId ? parseInt(taskId as string) : null,
        uploadedById: parseInt(session.user.id),
        projectId: parseInt(projectId as string),
      },
    })

    // 6. LOG ACTIVITY
    await logActivity({
      actionType: "file_uploaded",
      actionCategory: "project",
      actionSummary: `File "${sanitizeFilename(file.name)}" uploaded`,
      actionDetails: {
        fileName: sanitizeFilename(file.name),
        fileSize: file.size,
        fileType: file.type,
        attachmentId: attachment.id,
        validationPassed: true,
      },
      performedById: parseInt(session.user.id),
      projectId: parseInt(projectId as string),
      entityType: "attachment",
      entityId: attachment.id,
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    return { success: true, attachment, code: "UPLOAD_SUCCESS" }
  } catch (error: any) {
    console.error("File upload error:", error)
    return {
      error: "Failed to upload file",
      code: "UPLOAD_FAILED",
      details: error.message,
    }
  }
}


export async function getProjectAttachments(projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        // Get all attachments from tasks in this project
        const tasks = await prisma.task.findMany({
            where: { projectId },
            select: { id: true },
        })

        const taskIds = tasks.map((t) => t.id)

        const attachments = await prisma.attachment.findMany({
            where: {
                OR: [
                    { taskId: { in: taskIds } },
                    { taskId: null }, // Project-level files (no taskId)
                ],
            },
            include: {
                uploader: {
                    select: {
                        id: true,
                        username: true,
                        avatarUrl: true,
                    },
                },
                task: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { uploadedAt: "desc" },
        })

        return { success: true, attachments }
    } catch (error: any) {
        console.error("Error fetching attachments:", error)
        return { error: "Failed to fetch attachments", details: error.message }
    }
}

export async function deleteAttachment(attachmentId: number, projectId: number) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    try {
        const attachment = await prisma.attachment.findUnique({
            where: { id: attachmentId },
        })

        if (!attachment) {
            return { error: "Attachment not found" }
        }

        // Check permission - only uploader or admin can delete
        if (
            attachment.uploadedById !== parseInt(session.user.id) &&
            session.user.role !== "admin"
        ) {
            return { error: "Unauthorized: You can only delete your own files" }
        }

        // Delete file from disk
        try {
            const filePath = join(process.cwd(), "public", attachment.fileUrl)
            if (existsSync(filePath)) {
                const { unlink } = await import("fs/promises")
                await unlink(filePath)
            }
        } catch (fileError) {
            console.error("Error deleting file from disk:", fileError)
            // Continue with database deletion even if file deletion fails
        }

        // Delete database record
        await prisma.attachment.delete({
            where: { id: attachmentId },
        })

        // Log activity
        await logActivity({
            actionType: "file_deleted",
            actionCategory: "project",
            actionSummary: `File "${attachment.fileName}" deleted`,
            actionDetails: {
                fileName: attachment.fileName,
                attachmentId: attachment.id,
            },
            performedById: parseInt(session.user.id),
            projectId: projectId,
            entityType: "attachment",
            entityId: attachmentId,
        })

        revalidatePath(`/dashboard/projects/${projectId}`)
        return { success: true }
    } catch (error: any) {
        console.error("Error deleting attachment:", error)
        return { error: "Failed to delete attachment", details: error.message }
    }
}

