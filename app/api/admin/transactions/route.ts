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

    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const transactions = SecureDatabase.getAllTransactions()
    console.log("Admin fetching transactions, found:", transactions.length)

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Admin transactions fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
