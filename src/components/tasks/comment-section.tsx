"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { createComment } from "@/app/actions/comments"
import { formatDistanceToNow } from "date-fns"
import { Loader2, Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface Comment {
    id: number
    content: string
    createdAt: Date
    author: {
        username: string
        email: string
    }
}

// Render content with highlighted mentions
function renderContentWithMentions(content: string) {
    const mentionRegex = /@(\w+)/g
    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
        // Add text before mention
        if (match.index > lastIndex) {
            parts.push(content.substring(lastIndex, match.index))
        }
        
        // Add mention as badge
        parts.push(
            <Badge
                key={match.index}
                variant="secondary"
                className="mx-0.5 bg-primary/10 text-primary hover:bg-primary/20"
            >
                @{match[1]}
            </Badge>
        )
        
        lastIndex = mentionRegex.lastIndex
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex))
    }
    
    return parts.length > 0 ? parts : content
}

interface User {
    id: number
    username: string
    email?: string
    avatarUrl?: string
}

export function CommentSection({
    comments,
    taskId,
    projectId,
    users = []
}: {
    comments: Comment[]
    taskId: number
    projectId: number
    users?: User[]
}) {
    const [loading, setLoading] = useState(false)
    const [content, setContent] = useState("")
    const [showMentions, setShowMentions] = useState(false)
    const [mentionQuery, setMentionQuery] = useState("")
    const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Filter users based on mention query
    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(mentionQuery.toLowerCase())
    )

    // Handle textarea input and detect @ mentions
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value
        setContent(value)
        
        const cursorPosition = e.target.selectionStart
        const textBeforeCursor = value.substring(0, cursorPosition)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')
        
        // Check if @ was just typed and we're still in a mention context
        if (lastAtIndex !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
            // Check if there's a space or newline after @ (meaning mention ended)
            const hasSpaceAfter = /[\s\n]/.test(textAfterAt)
            
            if (!hasSpaceAfter) {
                const query = textAfterAt
                setMentionQuery(query)
                setShowMentions(true)
                setSelectedMentionIndex(0)
                return
            }
        }
        
        setShowMentions(false)
    }

    // Handle keyboard navigation in mentions
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (showMentions && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedMentionIndex(prev => 
                    prev < filteredUsers.length - 1 ? prev + 1 : prev
                )
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedMentionIndex(prev => prev > 0 ? prev - 1 : 0)
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                insertMention(filteredUsers[selectedMentionIndex])
            } else if (e.key === 'Escape') {
                setShowMentions(false)
            }
        }
    }

    // Insert selected mention into textarea
    const insertMention = (user: User) => {
        if (!textareaRef.current) return
        
        const textarea = textareaRef.current
        const cursorPosition = textarea.selectionStart
        const textBeforeCursor = content.substring(0, cursorPosition)
        const lastAtIndex = textBeforeCursor.lastIndexOf('@')
        
        if (lastAtIndex !== -1) {
            const textAfterCursor = content.substring(cursorPosition)
            const newContent = 
                content.substring(0, lastAtIndex) + 
                `@${user.username} ` + 
                textAfterCursor
            
            setContent(newContent)
            setShowMentions(false)
            
            // Set cursor position after inserted mention
            setTimeout(() => {
                const newCursorPos = lastAtIndex + user.username.length + 2 // +2 for @ and space
                textarea.focus()
                textarea.setSelectionRange(newCursorPos, newCursorPos)
            }, 0)
        }
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)
        const formData = new FormData(event.currentTarget)
        formData.set("content", content) // Use state value instead of form value
        formData.append("taskId", taskId.toString())
        formData.append("projectId", projectId.toString())

        const result = await createComment(formData)

        setLoading(false)
        setContent("")
        setShowMentions(false)
        
        if (result?.success) {
            router.refresh()
        }
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold">Comments</h3>

            {/* Comment Form */}
            <form onSubmit={onSubmit} className="space-y-3">
                <div ref={containerRef} className="space-y-2">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            name="content"
                            value={content}
                            onChange={handleInput}
                            onKeyDown={handleKeyDown}
                            placeholder="Add Comment (type @ to mention someone)"
                            required
                            className="min-h-[100px]"
                        />
                        
                        {/* Mention Autocomplete Dropdown */}
                        {showMentions && filteredUsers.length > 0 && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-[300px] rounded-md border bg-popover shadow-lg">
                                <div className="max-h-[200px] overflow-y-auto p-1">
                                    {filteredUsers.map((user, index) => (
                                        <div
                                            key={user.id}
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                insertMention(user)
                                            }}
                                            onMouseEnter={() => setSelectedMentionIndex(index)}
                                            className={`
                                                flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer
                                                transition-colors select-none
                                                ${index === selectedMentionIndex 
                                                    ? "bg-accent text-accent-foreground" 
                                                    : "hover:bg-accent/50"
                                                }
                                            `}
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-xs">
                                                    {user.username.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{user.username}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Tip: Type @ followed by a username to mention someone
                    </p>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                        </>
                    ) : (
                        <>
                            <Send className="mr-2 h-4 w-4" />
                            Add Comment
                        </>
                    )}
                </Button>
            </form>

            {/* Comment List */}
            {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
            ) : (
                <div className="space-y-4 pt-4 border-t">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                    {comment.author.username.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold">{comment.author.username}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-sm text-foreground whitespace-pre-wrap break-words">
                                    {renderContentWithMentions(comment.content)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
