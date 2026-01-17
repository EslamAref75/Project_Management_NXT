"use server"

import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  validateFileUpload,
  sanitizeFilename,
  generateSafeFilename,
  validateFileContent,
  getReadableFileSize,
} from "@/lib/file-upload-validator"

export async function uploadSystemLogo(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "admin") {
    return { error: "Unauthorized - Admin access required", code: "UNAUTHORIZED" }
  }

  const file = formData.get("file") as File | null
  if (!file) {
    return { error: "No file provided", code: "MISSING_FILE" }
  }

  try {
    // 1. VALIDATE FILE - Use centralized validator
    const validation = validateFileUpload(file)
    if (!validation.valid) {
      return { error: validation.error || "Invalid file", code: "INVALID_FILE" }
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

    // 3. CREATE DIRECTORY IF IT DOESN'T EXIST
    const uploadDir = join(process.cwd(), "public", "uploads", "branding")
    await mkdir(uploadDir, { recursive: true })

    // 4. GENERATE SAFE FILENAME
    const safeFilename = generateSafeFilename(file.name, parseInt(session.user.id))
    const filepath = join(uploadDir, safeFilename)

    // 5. SAVE FILE TO DISK
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // 6. LOG AND RETURN SUCCESS
    console.log(
      `[Logo Upload] Admin ${session.user.username} uploaded logo: ${safeFilename}`
    )

    return {
      success: true,
      url: `/uploads/branding/${safeFilename}`,
      fileName: sanitizeFilename(file.name),
      fileSize: getReadableFileSize(file.size),
      code: "UPLOAD_SUCCESS",
    }
  } catch (error: any) {
    console.error("Logo upload error:", error)
    return {
      error: "Failed to upload logo",
      code: "UPLOAD_FAILED",
      details: error.message,
    }
  }
