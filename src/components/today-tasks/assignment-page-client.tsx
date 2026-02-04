"use client"

import { useState } from "react"
import { UsersPanel } from "./users-panel"
import { AssignmentModal } from "./assignment-modal"
import { Card } from "@/components/ui/card"
import { Users as UsersIcon } from "lucide-react"

interface User {
    id: number
    username: string
    email: string
    role: string
    avatarUrl: string | null
    team: { id: number; name: string } | null
    activeProjectsCount: number
}

interface AssignmentPageClientProps {
    users: User[]
}

export function AssignmentPageClient({ users }: AssignmentPageClientProps) {
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [modalOpen, setModalOpen] = useState(false)

    const selectedUser = users.find(u => u.id === selectedUserId)

    const handleUserSelect = (userId: number) => {
        setSelectedUserId(userId)
        setModalOpen(true)
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Users Panel - Left Side */}
                <div className="lg:col-span-1">
                    <Card className="p-4 h-full">
                        <UsersPanel
                            users={users}
                            selectedUserId={selectedUserId}
                            onUserSelect={handleUserSelect}
                        />
                    </Card>
                </div>

                {/* Main Content Area */}
                <div className="lg:col-span-3">
                    <Card className="p-8">
                        {selectedUserId ? (
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <UsersIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        Managing tasks for {selectedUser?.username}
                                    </h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Use the assignment modal to manage this user&apos;s today&apos;s tasks.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center space-y-4">
                                <UsersIcon className="h-16 w-16 text-muted-foreground opacity-50" />
                                <div>
                                    <h3 className="text-xl font-semibold mb-2">
                                        Select a User to Manage Tasks
                                    </h3>
                                    <p className="text-muted-foreground max-w-md">
                                        Click on a user from the panel on the left to assign and manage their today&apos;s tasks.
                                        You can filter by project and move tasks between available and today&apos;s focus.
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {selectedUser && (
                <AssignmentModal
                    userId={selectedUser.id}
                    userName={selectedUser.username}
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                />
            )}
        </>
    )
}

