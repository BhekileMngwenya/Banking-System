import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "@/lib/services/auth-service"
import { checkRateLimit } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    // Get client information for security logging
    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Rate limiting - 5 attempts per 15 minutes per IP
    if (!checkRateLimit(`login_${clientIP}`, 5, 15 * 60 * 1000)) {
      console.log(`Rate limit exceeded for IP: ${clientIP}`)
      return NextResponse.json({ error: "Too many login attempts. Please try again later." }, { status: 429 })
    }

    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    console.log(`Login attempt for: ${email} from IP: ${clientIP}`)

    // Authenticate user using the new service
    const result = await AuthService.authenticate(email, password, clientIP, userAgent)

    if (!result.success) {
      console.log(`Failed login attempt for: ${email} - ${result.error}`)
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    console.log(`Successful login for: ${email}`)

    return NextResponse.json({
      token: result.token,
      user: result.user,
    })
  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
