import { getUser } from "@/app/actions/users";
import { calculateUserProductivity } from "@/lib/productivity";
import { ProductivityScoreCard } from "@/components/productivity/productivity-score-card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { startOfWeek, endOfWeek } from "date-fns";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

export default async function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const userId = parseInt(id);
    if (isNaN(userId)) notFound();

    const user = await getUser(userId);
    if (!user) notFound();

    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });

    // Fetch productivity score
    let productivityData = null;
    try {
        productivityData = await calculateUserProductivity(userId, { start, end });
    } catch (e) {
        console.error("Failed to fetch productivity score:", e);
    }

    return (
        <div className="space-y-6">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                        <AvatarFallback className="text-xl">
                            {user.username.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight mb-1">{user.username}</h2>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                                {user.role.replace("_", " ")}
                            </Badge>
                            {user.team && (
                                <Badge variant="secondary">{user.team.name}</Badge>
                            )}
                            <span className="text-sm text-muted-foreground ml-2">
                                {user.email}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                    <p>Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}</p>
                    <p className="mt-1">
                        Status: <span className={user.isActive ? "text-emerald-500 font-medium" : "text-red-500"}>
                            {user.isActive ? "Active" : "Inactive"}
                        </span>
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Productivity Score Card - Spans 2 cols */}
                <div className="lg:col-span-2">
                    <ProductivityScoreCard
                        data={productivityData}
                        periodLabel="This Week"
                    />
                </div>

                {/* Info / Quick Stats - Spans 1 col */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <span className="text-sm font-medium text-muted-foreground block">Role Scope</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {user.roles.length > 0 ? user.roles.map(ur => (
                                    <Badge key={ur.id} variant="secondary" className="text-xs">
                                        {ur.role.name} ({ur.scopeType})
                                    </Badge>
                                )) : <span className="text-sm">-</span>}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
