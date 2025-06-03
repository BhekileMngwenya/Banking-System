import { type NextRequest, NextResponse } from "next/server"
import { SecureDatabase } from "@/lib/secure-database"
import { validatePasswordStrength } from "@/lib/security"

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

    const { email, firstName, lastName, password, initialBalance } = await request.json()

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password)
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: `Password validation failed: ${passwordValidation.errors.join(", ")}` },
        { status: 400 },
      )
    }

    // Create user with security validation
    const result = await SecureDatabase.createUser({
      email,
      firstName,
      lastName,
      password,
      initialBalance: Number(initialBalance),
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    console.log(`New user created by admin ${user.email}: ${email}`)

    // Return user data without sensitive information
    const { passwordHash, passwordSalt, sessionId, loginHistory, ...safeUser } = result.user!

    return NextResponse.json({ user: safeUser })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
