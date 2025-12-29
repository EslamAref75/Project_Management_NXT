import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: "/login",
    },
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    console.log("[Auth] Missing credentials")
                    return null
                }

                try {
                    // Find user by username
                    const user = await prisma.user.findUnique({
                        where: {
                            username: credentials.username
                        }
                    })

                    if (!user) {
                        console.log(`[Auth] User not found: ${credentials.username}`)
                        return null
                    }

                    if (!user.isActive) {
                        console.log(`[Auth] User is inactive: ${credentials.username}`)
                        return null
                    }

                    // Verify password
                    const isValidPassword = await bcrypt.compare(
                        credentials.password,
                        user.passwordHash
                    )

                    if (!isValidPassword) {
                        console.log(`[Auth] Invalid password for user: ${credentials.username}`)
                        return null
                    }

                    console.log(`[Auth] Successfully authenticated user: ${user.username} (Role: ${user.role})`)

                    // Return user object
                    return {
                        id: user.id.toString(),
                        name: user.username,
                        email: user.email,
                        role: user.role
                    }
                } catch (error) {
                    console.error("[Auth] Error during authentication:", error)
                    return null
                }
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id as string
                session.user.role = token.role as string
            }
            return session
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
                token.role = user.role
            }
            return token
        }
    },
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-change-in-production"
}
