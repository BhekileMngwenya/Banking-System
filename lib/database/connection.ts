// Database connection and configuration
import mysql from "mysql2/promise"

interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit: number
  acquireTimeout: number
  timeout: number
  reconnect: boolean
}

class DatabaseConnection {
  private static instance: DatabaseConnection
  private pool: mysql.Pool | null = null

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection()
    }
    return DatabaseConnection.instance
  }

  async initialize(): Promise<void> {
    try {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || "localhost",
        port: Number.parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "banking_portal",
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true,
      }

      this.pool = mysql.createPool(config)

      // Test connection
      const connection = await this.pool.getConnection()
      console.log("✅ Database connected successfully")
      connection.release()
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      throw error
    }
  }

  getPool(): mysql.Pool {
    if (!this.pool) {
      throw new Error("Database not initialized. Call initialize() first.")
    }
    return this.pool
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    if (!this.pool) {
      throw new Error("Database not initialized")
    }

    try {
      const [rows] = await this.pool.execute(sql, params)
      return rows as T[]
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? results[0] : null
  }

  async transaction<T>(callback: (connection: mysql.PoolConnection) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error("Database not initialized")
    }

    const connection = await this.pool.getConnection()

    try {
      await connection.beginTransaction()
      const result = await callback(connection)
      await connection.commit()
      return result
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end()
      this.pool = null
      console.log("Database connection closed")
    }
  }
}

export const db = DatabaseConnection.getInstance()

// Initialize database connection
if (typeof window === "undefined") {
  db.initialize().catch(console.error)
}
