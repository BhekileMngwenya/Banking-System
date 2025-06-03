// Authentication service with database integration
import { UserRepository } from "../database/repositories/user-repository"
import { SessionRepository } from "../database/repositories/session-repository"
import { SecureCrypto } from "../crypto"
import type { AuthResult, DatabaseUser } from "../database/models"
import { validateInput, SecurityPatterns } from "../security"

export class AuthService {
  // Authenticate user
  static async authenticate(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    try {
      // Validate input
      if (!validateInput(email, SecurityPatterns.email)) {
        return { success: false, error: "Invalid email format" }
      }

      // Find user with password
      const user = await UserRepository.findByEmailWithPassword(email)
      if (!user) {
        return { success: false, error: "Invalid credentials" }
      }

      // Check if account is locked
      if (user.lockedUntil && new Date() < user.lockedUntil) {
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Account locked")
        return { success: false, error: "Account temporarily locked" }
      }

      // Check if account is active
      if (!user.isActive) {
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Account deactivated")
        return { success: false, error: "Account is deactivated" }
      }

      // Verify password
      const isValidPassword = await SecureCrypto.verifyPassword(password, user.passwordHash, user.passwordSalt)

      if (!isValidPassword) {
        // Increment failed attempts
        const newAttempts = user.failedLoginAttempts + 1
        let lockedUntil: Date | undefined

        // Lock account after 5 failed attempts
        if (newAttempts >= 5) {
          lockedUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
        }

        await UserRepository.updateLoginAttempts(user.id, newAttempts, lockedUntil)
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Invalid password")

        return {
          success: false,
          error: `Invalid credentials. ${5 - newAttempts} attempts remaining.`,
        }
      }

      // Successful login
      await UserRepository.updateLastLogin(user.id)
      await UserRepository.logLoginAttempt(user.id, true, ipAddress, userAgent)

      // Create session
      const session = await SessionRepository.create(user.id, ipAddress, userAgent)

      // Generate token
      const token = SecureCrypto.generateJWT(
        {
          userId: user.id,
          sessionId: session.id,
          role: user.role,
          exp: session.expiresAt.getTime(),
        },
        process.env.JWT_SECRET || "fallback-secret",
      )

      // Return user without sensitive data
      const { passwordHash, passwordSalt, ...safeUser } = user

      return {
        success: true,
        user: safeUser as DatabaseUser,
        token,
      }
    } catch (error) {
      console.error("Authentication error:", error)
      return { success: false, error: "Internal server error" }
    }
  }

  // Validate session token
  static async validateSession(token: string): Promise<DatabaseUser | null> {
    try {
      const payload = SecureCrypto.verifyJWT(token, process.env.JWT_SECRET || "fallback-secret")

      if (!payload || payload.exp < Date.now()) {
        return null
      }

      // Check if session exists and is valid
      const session = await SessionRepository.findById(payload.sessionId)
      if (!session || session.expiresAt < new Date()) {
        return null
      }

      // Get user
      const user = await UserRepository.findById(payload.userId)
      if (!user || !user.isActive) {
        return null
      }

      return user
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  // Logout user
  static async logout(sessionId: string): Promise<void> {
    try {
      await SessionRepository.delete(sessionId)
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  // Create new user
  static async createUser(userData: {
    email: string
    firstName: string
    lastName: string
    password: string
    role?: "admin" | "customer"
    initialBalance?: number
  }): Promise<{ success: boolean; user?: DatabaseUser; error?: string }> {
    try {
      // Validate inputs
      if (!validateInput(userData.email, SecurityPatterns.email)) {
        return { success: false, error: "Invalid email format" }
      }

      if (!validateInput(userData.firstName, SecurityPatterns.name)) {
        return { success: false, error: "Invalid first name" }
      }

      if (!validateInput(userData.lastName, SecurityPatterns.name)) {
        return { success: false, error: "Invalid last name" }
      }

      if (!validateInput(userData.password, SecurityPatterns.password)) {
        return { success: false, error: "Password does not meet security requirements" }
      }

      // Check if email already exists
      if (await UserRepository.emailExists(userData.email)) {
        return { success: false, error: "User with this email already exists" }
      }

      // Create user
      const user = await UserRepository.create(userData)

      return { success: true, user }
    } catch (error) {
      console.error("User creation error:", error)
      return { success: false, error: "Failed to create user" }
    }
  }
}
