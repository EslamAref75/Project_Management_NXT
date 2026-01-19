/**
 * Secure file download endpoint
 * 
 * - Verifies user has permission to access the attachment
 * - Serves file with proper security headers
 * - Prevents MIME type sniffing
 * - Sets proper cache headers
 */

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { join } from "path"
import { existsSync, readFileSync } from "fs"

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await getServerSession(authOptions)

    // 1. CHECK AUTHENTICATION
    if (!session?.user?.id) {
      return new Response("Unauthorized", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      })
    }

    const attachmentId = parseInt(params.id)
    if (isNaN(attachmentId)) {
      return new Response("Invalid attachment ID", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // 2. VERIFY ATTACHMENT EXISTS AND GET DETAILS
    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        task: {
          select: {
            projectId: true,
          },
        },
      },
    })

    if (!attachment) {
      return new Response("Attachment not found", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // 3. CHECK PERMISSION - User must have access to the project
    const projectId = attachment.task?.projectId

    if (!projectId) {
      return new Response("Invalid attachment - no associated project", {
        status: 400,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Verify user has access to this project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: parseInt(session.user.id) }, // Creator
          {
            projectUsers: {
              some: { userId: parseInt(session.user.id) },
            },
          }, // Team member
        ],
      },
      select: { id: true },
    })

    if (!project) {
      return new Response("Forbidden - You don't have access to this project", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // 4. LOAD FILE FROM DISK
    const filePath = join(process.cwd(), "public", attachment.fileUrl)

    // Security: Verify the path is within the uploads directory
    const uploadsDir = join(process.cwd(), "public", "uploads")
    const resolvedPath = require("path").resolve(filePath)
    const resolvedUploadsDir = require("path").resolve(uploadsDir)

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return new Response("Forbidden - Invalid file path", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Check file exists
    if (!existsSync(filePath)) {
      return new Response("File not found on disk", {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Read file
    const fileData = readFileSync(filePath)

    // 5. RETURN FILE WITH SECURITY HEADERS
    const headers: Record<string, string> = {
      // Proper content type (use stored MIME type if available)
      "Content-Type": attachment.fileType || "application/octet-stream",

      // Prevent MIME type sniffing - forces browser to respect Content-Type
      "X-Content-Type-Options": "nosniff",

      // Prevent caching of sensitive files
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",

      // Content security
      "X-Frame-Options": "DENY", // Prevent embedding in iframes
      "X-XSS-Protection": "1; mode=block",

      // Download as attachment if not an image
      "Content-Disposition":
        attachment.fileType?.startsWith("image/")
          ? `inline; filename="${attachment.fileName}"`
          : `attachment; filename="${attachment.fileName}"`,

      // Content length
      "Content-Length": String(fileData.length),
    }

    // 6. LOG DOWNLOAD ACTIVITY
    const { logActivity } = await import("@/lib/activity-logger")
    await logActivity({
      actionType: "file_downloaded",
      actionCategory: "project",
      actionSummary: `File "${attachment.fileName}" downloaded`,
      actionDetails: {
        fileName: attachment.fileName,
        fileSize: attachment.fileSize,
        attachmentId: attachment.id,
      },
      performedById: parseInt(session.user.id),
      projectId: projectId,
      entityType: "attachment",
      entityId: attachment.id,
    }).catch((error) => {
      console.error("Error logging file download:", error)
      // Don't fail the download if logging fails
    })

    return new Response(fileData, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Download error:", error)
    return new Response("Internal server error", {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    })
  }
}

/**
 * OPTIONS endpoint for CORS and preflight requests
 */
export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Allow": "GET, OPTIONS",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": process.env.NEXTAUTH_URL || "http://localhost:3000",
    },
  })
}
