// Session repository for PostgreSQL database operations
import { db } from "../connection"
import type { Session } from "../models"
import { v4 as uuidv4 } from "uuid"

export class SessionRepository {
  // Create a new session
  static async create(
    userId: string,
    sessionToken: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const sessionId = uuidv4()

    const sql = `
      INSERT INTO sessions (id, user_id, session_token, expires_at, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id as "userId", session_token as "sessionToken", 
                expires_at as "expiresAt", ip_address as "ipAddress", 
                user_agent as "userAgent", created_at as "createdAt"
    `

    const sessions = await db.query<Session>(sql, [
      sessionId,
      userId,
      sessionToken,
      expiresAt,
      ipAddress || null,
      userAgent || null,
    ])

    if (sessions.length === 0) {
      throw new Error("Failed to create session")
    }

    return sessions[0]
  }

  // Find session by token
  static async findByToken(token: string): Promise<Session | null> {
    const sql = `
      SELECT id, user_id as "userId", session_token as "sessionToken", 
             expires_at as "expiresAt", ip_address as "ipAddress", 
             user_agent as "userAgent", created_at as "createdAt"
      FROM sessions 
      WHERE session_token = $1
    `

    return await db.queryOne<Session>(sql, [token])
  }

  // Delete session
  static async delete(token: string): Promise<boolean> {
    const sql = "DELETE FROM sessions WHERE session_token = $1"
    const result = await db.query(sql, [token])
    return result.length > 0
  }

  // Delete all sessions for a user
  static async deleteAllForUser(userId: string): Promise<boolean> {
    const sql = "DELETE FROM sessions WHERE user_id = $1"
    const result = await db.query(sql, [userId])
    return result.length > 0
  }

  // Delete expired sessions
  static async deleteExpired(): Promise<number> {
    const sql = "DELETE FROM sessions WHERE expires_at < NOW() RETURNING id"
    const result = await db.query(sql)
    return result.length
  }
}
