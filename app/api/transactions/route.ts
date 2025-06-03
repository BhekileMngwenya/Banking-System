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

    // Get transactions for this user
    const transactions = SecureDatabase.getUserTransactions(user.accountNumber)

    console.log(`Returning ${transactions.length} transactions for user ${user.email}`)

    return NextResponse.json({
      transactions,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Transactions fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
