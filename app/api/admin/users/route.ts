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

    const customers = SecureDatabase.getAllCustomers()
    console.log("Admin fetching customers, found:", customers.length)

    // Return customers without sensitive data
    const safeCustomers = customers.map((customer) => {
      const { passwordHash, passwordSalt, sessionId, loginHistory, ...safeCustomer } = customer
      return safeCustomer
    })

    return NextResponse.json({ users: safeCustomers })
  } catch (error) {
    console.error("Admin users fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
