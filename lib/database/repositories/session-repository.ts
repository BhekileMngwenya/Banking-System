// Session repository for database operations
import { db } from "../connection"
import type { Session } from "../models"
import { SecureCrypto } from "../../crypto"
import { v4 as uuidv4 } from "uuid"

export class SessionRepository {
  // Create a new session
  static async create(userId: string, ipAddress?: string, userAgent?: string): Promise<Session> {
    const sessionId = uuidv4()
    const sessionToken = SecureCrypto.generateSecureToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    const sql = `
      INSERT INTO sessions (id, user_id, session_token, ip_address, user_agent, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    await db.query(sql, [sessionId, userId, sessionToken, ipAddress || null, userAgent || null, expiresAt])

    const session = await this.findById(sessionId)
    if (!session) {
      throw new Error("Failed to create session")
    }

    return session
  }

  // Find session by ID
  static async findById(id: string): Promise<Session | null> {
    const sql = `
      SELECT id, user_id as userId, session_token as sessionToken,
             ip_address as ipAddress, user_agent as userAgent,
             expires_at as expiresAt, created_at as createdAt
      FROM sessions WHERE id = ?
    `

    return await db.queryOne<Session>(sql, [id])
  }

  // Find session by token
  static async findByToken(token: string): Promise<Session | null> {
    const sql = `
      SELECT id, user_id as userId, session_token as sessionToken,
             ip_address as ipAddress, user_agent as userAgent,
             expires_at as expiresAt, created_at as createdAt
      FROM sessions WHERE session_token = ?
    `

    return await db.queryOne<Session>(sql, [token])
  }

  // Delete session
  static async delete(id: string): Promise<boolean> {
    const sql = "DELETE FROM sessions WHERE id = ?"
    const result = await db.query(sql, [id])
    return Array.isArray(result) && result.length > 0
  }

  // Delete expired sessions
  static async deleteExpired(): Promise<number> {
    const sql = "DELETE FROM sessions WHERE expires_at < NOW()"
    const result = await db.query(sql)
    return Array.isArray(result) ? result.length : 0
  }

  // Delete all sessions for a user
  static async deleteByUserId(userId: string): Promise<number> {
    const sql = "DELETE FROM sessions WHERE user_id = ?"
    const result = await db.query(sql, [userId])
    return Array.isArray(result) ? result.length : 0
  }

  // Get active sessions for a user
  static async getByUserId(userId: string): Promise<Session[]> {
    const sql = `
      SELECT id, user_id as userId, session_token as sessionToken,
             ip_address as ipAddress, user_agent as userAgent,
             expires_at as expiresAt, created_at as createdAt
      FROM sessions 
      WHERE user_id = ? AND expires_at > NOW()
      ORDER BY created_at DESC
    `

    return await db.query<Session>(sql, [userId])
  }
}
