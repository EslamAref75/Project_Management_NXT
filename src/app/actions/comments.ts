"use server"

import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createProjectNotification } from "./project-notifications"

const commentSchema = z.object({
    content: z.string().min(1, "Content is required"),
    taskId: z.coerce.number(),
    projectId: z.coerce.number(), // Needed for revalidation
})

// Extract @mentions from text (format: @username)
function extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g
    const matches = text.match(mentionRegex)
    if (!matches) return []
    // Remove @ symbol and return unique usernames
    return [...new Set(matches.map(m => m.substring(1)))]
}

export async function createComment(formData: FormData) {
    const session = await getServerSession(authOptions)
    if (!session) return { error: "Unauthorized" }

    const content = formData.get("content") as string
    const taskId = formData.get("taskId")
    const projectId = formData.get("projectId")

    const validated = commentSchema.safeParse({ content, taskId, projectId })

    if (!validated.success) {
        return { error: "Validation failed" }
    }

    try {
        // Get the task to access project info
        const task = await prisma.task.findUnique({
            where: { id: validated.data.taskId },
            select: { id: true, title: true, projectId: true }
        })

        if (!task) {
            return { error: "Task not found" }
        }

        // Create the comment
        const comment = await prisma.comment.create({
            data: {
                content: validated.data.content,
                taskId: validated.data.taskId,
                userId: parseInt(session.user.id)
            }
        })

        // Extract mentions from content
        const mentionedUsernames = extractMentions(validated.data.content)
        
        if (mentionedUsernames.length > 0) {
            // Get mentioned users
            const mentionedUsers = await prisma.user.findMany({
                where: {
                    username: { in: mentionedUsernames }
                },
                select: { id: true, username: true }
            })

            const author = await prisma.user.findUnique({
                where: { id: parseInt(session.user.id) },
                select: { username: true }
            })

            // Create mention records and notifications
            for (const user of mentionedUsers) {
                // Don't notify if user mentions themselves
                if (user.id === parseInt(session.user.id)) continue

                // Create mention record
                await prisma.commentMention.create({
                    data: {
                        commentId: comment.id,
                        userId: user.id
                    }
                })

                // Create notification for mentioned user
                await createProjectNotification(
                    validated.data.projectId,
                    user.id,
                    {
                        type: "comment_mention",
                        entityType: "comment",
                        entityId: comment.id,
                        title: "You were mentioned in a comment",
                        message: `${author?.username || "Someone"} mentioned you in a comment on task "${task.title}"`,
                        soundRequired: false,
                        isUrgent: false,
                        requiresAcknowledgment: false
                    }
                )
            }
        }

        // precise path revalidation
        revalidatePath(`/dashboard/projects/${validated.data.projectId}/tasks/${validated.data.taskId}`)
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: "Failed to create comment" }
    }
}
