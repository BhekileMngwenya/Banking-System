import { type NextRequest, NextResponse } from "next/server"
import { SecureDatabase } from "@/lib/secure-database"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = SecureDatabase.validateSession(token)

    if (user && user.sessionId) {
      SecureDatabase.logoutUser(user.sessionId)
      console.log(`User logged out: ${user.email}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
