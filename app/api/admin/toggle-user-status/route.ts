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

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { userId, isActive } = await request.json()

    if (!userId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const success = SecureDatabase.updateUserStatus(userId, isActive)

    if (!success) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log(`Admin ${user.email} updated user ${userId} status to: ${isActive}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Toggle user status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
