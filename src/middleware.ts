import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { recordRequest } from "@/lib/metrics"

export default withAuth(
    function middleware(req: NextRequest & { nextauth?: { token: any } }) {
        const start = Date.now()
        const path = req.nextUrl.pathname

        if (
            req.nextUrl.pathname === "/login" ||
            req.nextUrl.pathname === "/register"
        ) {
            if (req.nextauth?.token) {
                const res = NextResponse.redirect(new URL("/dashboard", req.url))
                recordRequest(path, res.status, Date.now() - start)
                return res
            }
        }

        const res = NextResponse.next()
        recordRequest(path, res.status, Date.now() - start)
        return res
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const { pathname } = req.nextUrl

                // Allow access to public pages
                if (
                    pathname === "/login" ||
                    pathname === "/register" ||
                    pathname === "/"
                ) {
                    return true
                }

                // Require token for everything else
                return !!token
            },
        },
    }
)

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth flow)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images, etc)
         */
        "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads|assets).*)",
    ],
}
