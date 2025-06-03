// User repository for database operations
import { db } from "../connection"
import type { User, DatabaseUser, CreateUserData, UpdateUserData, LoginHistory } from "../models"
import { SecureCrypto } from "../../crypto"
import { v4 as uuidv4 } from "uuid"

export class UserRepository {
  // Create a new user
  static async create(userData: CreateUserData): Promise<DatabaseUser> {
    const { hash, salt } = await SecureCrypto.hashPassword(userData.password)

    // Generate unique account number
    const accountNumber =
      "62" +
      Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")

    const userId = uuidv4()

    const sql = `
      INSERT INTO users (
        id, email, password_hash, password_salt, first_name, last_name, 
        role, account_number, balance, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    await db.query(sql, [
      userId,
      userData.email,
      hash,
      salt,
      userData.firstName,
      userData.lastName,
      userData.role || "customer",
      accountNumber,
      userData.initialBalance || 0,
      true,
    ])

    const user = await this.findById(userId)
    if (!user) {
      throw new Error("Failed to create user")
    }

    return user
  }

  // Find user by ID
  static async findById(id: string): Promise<DatabaseUser | null> {
    const sql = `
      SELECT id, email, first_name as firstName, last_name as lastName, 
             role, account_number as accountNumber, balance, is_active as isActive,
             two_factor_enabled as twoFactorEnabled, failed_login_attempts as failedLoginAttempts,
             locked_until as lockedUntil, last_login as lastLogin, 
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE id = ?
    `

    return await db.queryOne<DatabaseUser>(sql, [id])
  }

  // Find user by email (with password for authentication)
  static async findByEmailWithPassword(email: string): Promise<User | null> {
    const sql = `
      SELECT id, email, password_hash as passwordHash, password_salt as passwordSalt,
             first_name as firstName, last_name as lastName, role, 
             account_number as accountNumber, balance, is_active as isActive,
             two_factor_enabled as twoFactorEnabled, failed_login_attempts as failedLoginAttempts,
             locked_until as lockedUntil, last_login as lastLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE email = ?
    `

    return await db.queryOne<User>(sql, [email])
  }

  // Find user by email
  static async findByEmail(email: string): Promise<DatabaseUser | null> {
    const sql = `
      SELECT id, email, first_name as firstName, last_name as lastName, 
             role, account_number as accountNumber, balance, is_active as isActive,
             two_factor_enabled as twoFactorEnabled, failed_login_attempts as failedLoginAttempts,
             locked_until as lockedUntil, last_login as lastLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE email = ?
    `

    return await db.queryOne<DatabaseUser>(sql, [email])
  }

  // Find user by account number
  static async findByAccountNumber(accountNumber: string): Promise<DatabaseUser | null> {
    const sql = `
      SELECT id, email, first_name as firstName, last_name as lastName, 
             role, account_number as accountNumber, balance, is_active as isActive,
             two_factor_enabled as twoFactorEnabled, failed_login_attempts as failedLoginAttempts,
             locked_until as lockedUntil, last_login as lastLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE account_number = ?
    `

    return await db.queryOne<DatabaseUser>(sql, [accountNumber])
  }

  // Get all customers
  static async getAllCustomers(): Promise<DatabaseUser[]> {
    const sql = `
      SELECT id, email, first_name as firstName, last_name as lastName, 
             role, account_number as accountNumber, balance, is_active as isActive,
             two_factor_enabled as twoFactorEnabled, failed_login_attempts as failedLoginAttempts,
             locked_until as lockedUntil, last_login as lastLogin,
             created_at as createdAt, updated_at as updatedAt
      FROM users WHERE role = 'customer'
      ORDER BY created_at DESC
    `

    return await db.query<DatabaseUser>(sql)
  }

  // Update user
  static async update(id: string, data: UpdateUserData): Promise<boolean> {
    const fields: string[] = []
    const values: any[] = []

    if (data.firstName !== undefined) {
      fields.push("first_name = ?")
      values.push(data.firstName)
    }
    if (data.lastName !== undefined) {
      fields.push("last_name = ?")
      values.push(data.lastName)
    }
    if (data.email !== undefined) {
      fields.push("email = ?")
      values.push(data.email)
    }
    if (data.isActive !== undefined) {
      fields.push("is_active = ?")
      values.push(data.isActive)
    }
    if (data.balance !== undefined) {
      fields.push("balance = ?")
      values.push(data.balance)
    }

    if (fields.length === 0) {
      return false
    }

    fields.push("updated_at = CURRENT_TIMESTAMP")
    values.push(id)

    const sql = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`

    const result = await db.query(sql, values)
    return Array.isArray(result) && result.length > 0
  }

  // Update login attempts
  static async updateLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void> {
    const sql = `
      UPDATE users 
      SET failed_login_attempts = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    await db.query(sql, [attempts, lockedUntil || null, id])
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    await db.query(sql, [id])
  }

  // Update balance
  static async updateBalance(id: string, newBalance: number): Promise<boolean> {
    const sql = `
      UPDATE users 
      SET balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    const result = await db.query(sql, [newBalance, id])
    return Array.isArray(result) && result.length > 0
  }

  // Log login attempt
  static async logLoginAttempt(
    userId: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string,
  ): Promise<void> {
    const sql = `
      INSERT INTO login_history (id, user_id, ip_address, user_agent, success, failure_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `

    await db.query(sql, [uuidv4(), userId, ipAddress || null, userAgent || null, success, failureReason || null])
  }

  // Get login history
  static async getLoginHistory(userId: string, limit = 10): Promise<LoginHistory[]> {
    const sql = `
      SELECT id, user_id as userId, ip_address as ipAddress, user_agent as userAgent,
             success, failure_reason as failureReason, created_at as createdAt
      FROM login_history 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `

    return await db.query<LoginHistory>(sql, [userId, limit])
  }

  // Delete user (soft delete by deactivating)
  static async delete(id: string): Promise<boolean> {
    return await this.update(id, { isActive: false })
  }

  // Check if email exists
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let sql = "SELECT COUNT(*) as count FROM users WHERE email = ?"
    const params = [email]

    if (excludeId) {
      sql += " AND id != ?"
      params.push(excludeId)
    }

    const result = await db.queryOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}
