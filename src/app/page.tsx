import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function Home() {
  const session = await getServerSession(authOptions)

  // If authenticated, redirect to dashboard
  // If not authenticated, redirect to login
  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
