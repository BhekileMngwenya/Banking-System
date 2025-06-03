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

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    console.log(`Balance request for ${user.email}: R${user.balance}`)

    return NextResponse.json({
      balance: user.balance,
      accountNumber: user.accountNumber,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Balance fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
