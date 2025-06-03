import { type NextRequest, NextResponse } from "next/server"
import { SecureDatabase } from "@/lib/secure-database"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = SecureDatabase.validateSession(token)

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
    }

    console.log(`Returning user data for ${user.email}, balance: R${user.balance}`)

    // Return user data without sensitive information
    const { passwordHash, passwordSalt, sessionId, loginHistory, ...safeUser } = user

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error("Token verification error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
