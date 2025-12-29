"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, File, X, Download, Loader2, Trash2 } from "lucide-react"
import { uploadProjectFile, getProjectAttachments, deleteAttachment } from "@/app/actions/attachments"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface ProjectFilesTabProps {
    project: any
}

export function ProjectFilesTab({ project }: ProjectFilesTabProps) {
    const { data: session } = useSession()
    const [attachments, setAttachments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()

    useEffect(() => {
        loadAttachments()
    }, [project.id])

    const loadAttachments = async () => {
        setLoading(true)
        const result = await getProjectAttachments(project.id)
        if (result.success) {
            setAttachments(result.attachments || [])
        }
        setLoading(false)
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("projectId", project.id.toString())

        const result = await uploadProjectFile(formData)
        setUploading(false)

        if (result.success) {
            setUploadDialogOpen(false)
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
            router.refresh()
            loadAttachments()
        } else {
            alert(result.error || "Failed to upload file")
        }
    }

    const handleDelete = async (attachmentId: number) => {
        if (!confirm("Are you sure you want to delete this file?")) return

        const result = await deleteAttachment(attachmentId, project.id)
        if (result.success) {
            router.refresh()
            loadAttachments()
        } else {
            alert(result.error || "Failed to delete file")
        }
    }

    const formatFileSize = (bytes: number | null) => {
        if (!bytes) return "Unknown size"
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const getFileIcon = (fileType: string | null) => {
        if (!fileType) return <File className="h-5 w-5 text-muted-foreground" />
        if (fileType.startsWith("image/")) return <File className="h-5 w-5 text-blue-500" />
        if (fileType.includes("pdf")) return <File className="h-5 w-5 text-red-500" />
        if (fileType.includes("word") || fileType.includes("document")) return <File className="h-5 w-5 text-blue-600" />
        return <File className="h-5 w-5 text-muted-foreground" />
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Files & Attachments</CardTitle>
                        <CardDescription>
                            {attachments.length} file(s) in this project
                        </CardDescription>
                    </div>
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="h-4 w-4 mr-2" />
                                Upload File
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Upload File</DialogTitle>
                                <DialogDescription>
                                    Upload a file to this project. Files can be attached to tasks or kept at the project level.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Select File</label>
                                    <Input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        className="cursor-pointer"
                                    />
                                </div>
                                {uploading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Uploading...
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                {attachments.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-lg">
                        <File className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No files attached</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Upload files to share documents, images, and other resources
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {attachments.map((attachment: any) => (
                            <div
                                key={attachment.id}
                                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                                <div className="flex-shrink-0">
                                    {getFileIcon(attachment.fileType)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium truncate">{attachment.fileName}</p>
                                        {attachment.task && (
                                            <Badge variant="outline" className="text-xs">
                                                Task: {attachment.task.title}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{formatFileSize(attachment.fileSize)}</span>
                                        <span>•</span>
                                        <span>{format(new Date(attachment.uploadedAt), "MMM d, yyyy")}</span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1">
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage src={attachment.uploader?.avatarUrl || undefined} />
                                                <AvatarFallback className="text-[8px]">
                                                    {attachment.uploader?.username?.substring(0, 2).toUpperCase() || "??"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{attachment.uploader?.username || "Unknown"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                    >
                                        <a
                                            href={attachment.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1"
                                        >
                                            <Download className="h-4 w-4" />
                                            Download
                                        </a>
                                    </Button>
                                    {(attachment.uploadedById === parseInt(session?.user?.id || "0") ||
                                        session?.user?.role === "admin") && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDelete(attachment.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
