import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "lucide-react"

interface ProjectTimelineTabProps {
    project: any
}

export function ProjectTimelineTab({ project }: ProjectTimelineTabProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline (Gantt View)
                </CardTitle>
                <CardDescription>
                    Visual timeline with task dependencies and milestones
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 border border-dashed rounded-lg">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        Gantt chart view coming soon
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                        This will show task duration bars, dependency arrows, and critical path
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

