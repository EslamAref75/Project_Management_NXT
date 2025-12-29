"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Paperclip, FileIcon, X } from "lucide-react"

interface AttachmentListProps {
    attachments: any[]
}

export function AttachmentList({ attachments }: AttachmentListProps) {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="h-4 w-4" /> Attachments
            </h3>
            <div className="space-y-2">
                {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded-md">
                        <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 text-blue-500" />
                            <a href={file.fileUrl} target="_blank" className="text-sm hover:underline hover:text-blue-600">
                                {file.fileName}
                            </a>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><X className="h-3 w-3" /></Button>
                    </div>
                ))}
                {attachments.length === 0 && <p className="text-xs text-muted-foreground">No attachments</p>}
            </div>
            <div>
                <Input type="file" className="text-xs" />
            </div>
        </div>
    )
}
