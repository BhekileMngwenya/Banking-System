// Database connection and configuration
import { Pool, type PoolClient } from "pg"

interface DatabaseConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl?: boolean | { rejectUnauthorized: boolean }
  max: number // connection pool max size
  idleTimeoutMillis: number
  connectionTimeoutMillis: number
}

class DatabaseConnection {
  private static instance: DatabaseConnection
  private pool: Pool | null = null

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
        port: Number.parseInt(process.env.DB_PORT || "5432"),
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "banking_portal",
        max: 10, // max number of clients in the pool
        idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 10000, // how long to wait for a connection
      }

      // Add SSL configuration if needed (e.g., for production)
      if (process.env.NODE_ENV === "production" && process.env.DB_SSL === "true") {
        config.ssl = {
          rejectUnauthorized: false, // Set to true in production with proper certificates
        }
      }

      this.pool = new Pool(config)

      // Test connection
      const client = await this.pool.connect()
      console.log("✅ PostgreSQL database connected successfully")
      client.release()

      // Handle pool errors
      this.pool.on("error", (err) => {
        console.error("Unexpected error on idle PostgreSQL client", err)
      })
    } catch (error) {
      console.error("❌ Database connection failed:", error)
      throw error
    }
  }

  getPool(): Pool {
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
      const result = await this.pool.query(sql, params)
      return result.rows as T[]
    } catch (error) {
      console.error("Database query error:", error)
      throw error
    }
  }

  async queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results.length > 0 ? results[0] : null
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error("Database not initialized")
    }

    const client = await this.pool.connect()

    try {
      await client.query("BEGIN")
      const result = await callback(client)
      await client.query("COMMIT")
      return result
    } catch (error) {
      await client.query("ROLLBACK")
      throw error
    } finally {
      client.release()
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
