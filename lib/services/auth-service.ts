// Authentication service
import { UserRepository } from "../database/repositories/user-repository"
import { SessionRepository } from "../database/repositories/session-repository"
import { SecureCrypto } from "../crypto"
import type { DatabaseUser, AuthResult } from "../database/models"
import { v4 as uuidv4 } from "uuid"

export class AuthService {
  // Authenticate a user
  static async authenticate(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthResult> {
    try {
      // Find user by email
      const user = await UserRepository.findByEmailWithPassword(email)

      if (!user) {
        return {
          success: false,
          error: "Invalid email or password",
        }
      }

      // Check if account is active
      if (!user.isActive) {
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Account is inactive")
        return {
          success: false,
          error: "Account is inactive. Please contact support.",
        }
      }

      // Check if account is locked
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Account is locked")
        return {
          success: false,
          error: "Account is temporarily locked. Please try again later.",
        }
      }

      // Verify password
      const isPasswordValid = await SecureCrypto.verifyPassword(password, user.passwordHash, user.passwordSalt)

      if (!isPasswordValid) {
        // Increment failed login attempts
        const maxAttempts = 5 // Should come from settings
        const newAttempts = user.failedLoginAttempts + 1
        let lockedUntil = null

        // Lock account if max attempts reached
        if (newAttempts >= maxAttempts) {
          const lockoutMinutes = 15 // Should come from settings
          lockedUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000)
        }

        await UserRepository.updateLoginAttempts(user.id, newAttempts, lockedUntil)
        await UserRepository.logLoginAttempt(user.id, false, ipAddress, userAgent, "Invalid password")

        return {
          success: false,
          error: "Invalid email or password",
        }
      }

      // Update last login and reset failed attempts
      await UserRepository.updateLastLogin(user.id)
      await UserRepository.logLoginAttempt(user.id, true, ipAddress, userAgent)

      // Generate JWT token
      const token = await this.generateToken(user.id)

      // Create session
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      await SessionRepository.create(user.id, token, expiresAt, ipAddress, userAgent)

      // Return user data without sensitive information
      const { passwordHash, passwordSalt, ...safeUser } = user

      return {
        success: true,
        user: safeUser,
        token,
      }
    } catch (error) {
      console.error("Authentication error:", error)
      return {
        success: false,
        error: "An error occurred during authentication",
      }
    }
  }

  // Validate session token
  static async validateSession(token: string): Promise<DatabaseUser | null> {
    try {
      // Find session by token
      const session = await SessionRepository.findByToken(token)

      if (!session) {
        return null
      }

      // Check if session is expired
      if (session.expiresAt < new Date()) {
        await SessionRepository.delete(token)
        return null
      }

      // Get user data
      const user = await UserRepository.findById(session.userId)

      if (!user || !user.isActive) {
        await SessionRepository.delete(token)
        return null
      }

      return user
    } catch (error) {
      console.error("Session validation error:", error)
      return null
    }
  }

  // Logout (invalidate session)
  static async logout(token: string): Promise<boolean> {
    try {
      return await SessionRepository.delete(token)
    } catch (error) {
      console.error("Logout error:", error)
      return false
    }
  }

  // Generate JWT token
  private static async generateToken(userId: string): Promise<string> {
    const jwtSecret = process.env.JWT_SECRET || "default-jwt-secret-key-for-development"

    // In a real implementation, use a proper JWT library
    // For simplicity, we're creating a simple token here
    const tokenId = uuidv4()
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours

    const tokenData = {
      id: tokenId,
      userId,
      exp: expiresAt,
    }

    // In production, use a proper JWT library
    return Buffer.from(JSON.stringify(tokenData)).toString("base64")
  }
}
