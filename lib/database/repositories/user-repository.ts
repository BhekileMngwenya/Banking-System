// User repository for PostgreSQL database operations
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
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
      SELECT id, email, first_name as "firstName", last_name as "lastName", 
             role, account_number as "accountNumber", balance, is_active as "isActive",
             two_factor_enabled as "twoFactorEnabled", failed_login_attempts as "failedLoginAttempts",
             locked_until as "lockedUntil", last_login as "lastLogin", 
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE id = $1
    `

    return await db.queryOne<DatabaseUser>(sql, [id])
  }

  // Find user by email (with password for authentication)
  static async findByEmailWithPassword(email: string): Promise<User | null> {
    const sql = `
      SELECT id, email, password_hash as "passwordHash", password_salt as "passwordSalt",
             first_name as "firstName", last_name as "lastName", role, 
             account_number as "accountNumber", balance, is_active as "isActive",
             two_factor_enabled as "twoFactorEnabled", failed_login_attempts as "failedLoginAttempts",
             locked_until as "lockedUntil", last_login as "lastLogin",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE email = $1
    `

    return await db.queryOne<User>(sql, [email])
  }

  // Find user by email
  static async findByEmail(email: string): Promise<DatabaseUser | null> {
    const sql = `
      SELECT id, email, first_name as "firstName", last_name as "lastName", 
             role, account_number as "accountNumber", balance, is_active as "isActive",
             two_factor_enabled as "twoFactorEnabled", failed_login_attempts as "failedLoginAttempts",
             locked_until as "lockedUntil", last_login as "lastLogin",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE email = $1
    `

    return await db.queryOne<DatabaseUser>(sql, [email])
  }

  // Find user by account number
  static async findByAccountNumber(accountNumber: string): Promise<DatabaseUser | null> {
    const sql = `
      SELECT id, email, first_name as "firstName", last_name as "lastName", 
             role, account_number as "accountNumber", balance, is_active as "isActive",
             two_factor_enabled as "twoFactorEnabled", failed_login_attempts as "failedLoginAttempts",
             locked_until as "lockedUntil", last_login as "lastLogin",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE account_number = $1
    `

    return await db.queryOne<DatabaseUser>(sql, [accountNumber])
  }

  // Get all customers
  static async getAllCustomers(): Promise<DatabaseUser[]> {
    const sql = `
      SELECT id, email, first_name as "firstName", last_name as "lastName", 
             role, account_number as "accountNumber", balance, is_active as "isActive",
             two_factor_enabled as "twoFactorEnabled", failed_login_attempts as "failedLoginAttempts",
             locked_until as "lockedUntil", last_login as "lastLogin",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM users WHERE role = 'customer'
      ORDER BY created_at DESC
    `

    return await db.query<DatabaseUser>(sql)
  }

  // Update user
  static async update(id: string, data: UpdateUserData): Promise<boolean> {
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (data.firstName !== undefined) {
      updates.push(`first_name = $${paramIndex++}`)
      values.push(data.firstName)
    }
    if (data.lastName !== undefined) {
      updates.push(`last_name = $${paramIndex++}`)
      values.push(data.lastName)
    }
    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`)
      values.push(data.email)
    }
    if (data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`)
      values.push(data.isActive)
    }
    if (data.balance !== undefined) {
      updates.push(`balance = $${paramIndex++}`)
      values.push(data.balance)
    }

    if (updates.length === 0) {
      return false
    }

    values.push(id)

    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex}`

    const result = await db.query(sql, values)
    return result.length > 0
  }

  // Update login attempts
  static async updateLoginAttempts(id: string, attempts: number, lockedUntil?: Date): Promise<void> {
    const sql = `
      UPDATE users 
      SET failed_login_attempts = $1, locked_until = $2
      WHERE id = $3
    `

    await db.query(sql, [attempts, lockedUntil || null, id])
  }

  // Update last login
  static async updateLastLogin(id: string): Promise<void> {
    const sql = `
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP, failed_login_attempts = 0, locked_until = NULL
      WHERE id = $1
    `

    await db.query(sql, [id])
  }

  // Update balance
  static async updateBalance(id: string, newBalance: number): Promise<boolean> {
    const sql = `
      UPDATE users 
      SET balance = $1
      WHERE id = $2
    `

    const result = await db.query(sql, [newBalance, id])
    return result.length > 0
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
      VALUES ($1, $2, $3, $4, $5, $6)
    `

    await db.query(sql, [uuidv4(), userId, ipAddress || null, userAgent || null, success, failureReason || null])
  }

  // Get login history
  static async getLoginHistory(userId: string, limit = 10): Promise<LoginHistory[]> {
    const sql = `
      SELECT id, user_id as "userId", ip_address as "ipAddress", user_agent as "userAgent",
             success, failure_reason as "failureReason", created_at as "createdAt"
      FROM login_history 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `

    return await db.query<LoginHistory>(sql, [userId, limit])
  }

  // Delete user (soft delete by deactivating)
  static async delete(id: string): Promise<boolean> {
    return await this.update(id, { isActive: false })
  }

  // Check if email exists
  static async emailExists(email: string, excludeId?: string): Promise<boolean> {
    let sql = "SELECT COUNT(*) as count FROM users WHERE email = $1"
    const params = [email]

    if (excludeId) {
      sql += " AND id != $2"
      params.push(excludeId)
    }

    const result = await db.queryOne<{ count: number }>(sql, params)
    return (result?.count || 0) > 0
  }
}
