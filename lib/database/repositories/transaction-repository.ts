// Transaction repository for database operations
import { db } from "../connection"
import type { Transaction, CreateTransactionData } from "../models"
import { v4 as uuidv4 } from "uuid"

export class TransactionRepository {
  // Create a new transaction
  static async create(data: CreateTransactionData): Promise<Transaction> {
    const transactionId = uuidv4()

    const sql = `
      INSERT INTO transactions (
        id, from_account_number, to_account_number, amount, currency, exchange_rate,
        amount_in_zar, reference, recipient_name, recipient_bank, transaction_type,
        fees, ip_address, user_agent, risk_score
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `

    // Calculate risk score
    const riskScore = this.calculateRiskScore(data)

    await db.query(sql, [
      transactionId,
      data.fromAccountNumber,
      data.toAccountNumber,
      data.amount,
      data.currency,
      data.exchangeRate || 1,
      data.amountInZar,
      data.reference,
      data.recipientName,
      data.recipientBank || null,
      data.transactionType,
      data.fees || 0,
      data.ipAddress || null,
      data.userAgent || null,
      riskScore,
    ])

    const transaction = await this.findById(transactionId)
    if (!transaction) {
      throw new Error("Failed to create transaction")
    }

    return transaction
  }

  // Find transaction by ID
  static async findById(id: string): Promise<Transaction | null> {
    const sql = `
      SELECT id, from_account_number as fromAccountNumber, to_account_number as toAccountNumber,
             amount, currency, exchange_rate as exchangeRate, amount_in_zar as amountInZar,
             reference, recipient_name as recipientName, recipient_bank as recipientBank,
             status, transaction_type as transactionType, fees, risk_score as riskScore,
             ip_address as ipAddress, user_agent as userAgent,
             created_at as createdAt, completed_at as completedAt, updated_at as updatedAt
      FROM transactions WHERE id = ?
    `

    return await db.queryOne<Transaction>(sql, [id])
  }

  // Get transactions for a user account
  static async getByAccountNumber(accountNumber: string, limit = 50): Promise<Transaction[]> {
    const sql = `
      SELECT id, from_account_number as fromAccountNumber, to_account_number as toAccountNumber,
             amount, currency, exchange_rate as exchangeRate, amount_in_zar as amountInZar,
             reference, recipient_name as recipientName, recipient_bank as recipientBank,
             status, transaction_type as transactionType, fees, risk_score as riskScore,
             ip_address as ipAddress, user_agent as userAgent,
             created_at as createdAt, completed_at as completedAt, updated_at as updatedAt
      FROM transactions 
      WHERE from_account_number = ? OR to_account_number = ?
      ORDER BY created_at DESC
      LIMIT ?
    `

    return await db.query<Transaction>(sql, [accountNumber, accountNumber, limit])
  }

  // Get all transactions (admin)
  static async getAll(limit = 100): Promise<Transaction[]> {
    const sql = `
      SELECT id, from_account_number as fromAccountNumber, to_account_number as toAccountNumber,
             amount, currency, exchange_rate as exchangeRate, amount_in_zar as amountInZar,
             reference, recipient_name as recipientName, recipient_bank as recipientBank,
             status, transaction_type as transactionType, fees, risk_score as riskScore,
             ip_address as ipAddress, user_agent as userAgent,
             created_at as createdAt, completed_at as completedAt, updated_at as updatedAt
      FROM transactions 
      ORDER BY created_at DESC
      LIMIT ?
    `

    return await db.query<Transaction>(sql, [limit])
  }

  // Update transaction status
  static async updateStatus(id: string, status: Transaction["status"]): Promise<boolean> {
    const completedAt = status === "completed" ? new Date() : null

    const sql = `
      UPDATE transactions 
      SET status = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `

    const result = await db.query(sql, [status, completedAt, id])
    return Array.isArray(result) && result.length > 0
  }

  // Get transaction statistics
  static async getStatistics(): Promise<{
    totalTransactions: number
    completedTransactions: number
    pendingTransactions: number
    totalVolume: number
    monthlyVolume: number
  }> {
    const totalSql = "SELECT COUNT(*) as count FROM transactions"
    const completedSql = "SELECT COUNT(*) as count FROM transactions WHERE status = 'completed'"
    const pendingSql = "SELECT COUNT(*) as count FROM transactions WHERE status = 'pending'"
    const volumeSql = "SELECT SUM(amount_in_zar) as volume FROM transactions WHERE status = 'completed'"
    const monthlyVolumeSql = `
      SELECT SUM(amount_in_zar) as volume 
      FROM transactions 
      WHERE status = 'completed' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
    `

    const [total, completed, pending, volume, monthlyVolume] = await Promise.all([
      db.queryOne<{ count: number }>(totalSql),
      db.queryOne<{ count: number }>(completedSql),
      db.queryOne<{ count: number }>(pendingSql),
      db.queryOne<{ volume: number }>(volumeSql),
      db.queryOne<{ volume: number }>(monthlyVolumeSql),
    ])

    return {
      totalTransactions: total?.count || 0,
      completedTransactions: completed?.count || 0,
      pendingTransactions: pending?.count || 0,
      totalVolume: volume?.volume || 0,
      monthlyVolume: monthlyVolume?.volume || 0,
    }
  }

  // Calculate risk score for a transaction
  private static calculateRiskScore(data: CreateTransactionData): number {
    let score = 0

    // Large amounts increase risk
    if (data.amountInZar > 50000) score += 30
    else if (data.amountInZar > 10000) score += 15

    // International transfers have higher risk
    if (data.transactionType === "international_transfer") score += 20

    // Weekend/night transactions have higher risk
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) score += 10

    return Math.min(score, 100) // Cap at 100
  }

  // Get transactions by date range
  static async getByDateRange(startDate: Date, endDate: Date, accountNumber?: string): Promise<Transaction[]> {
    let sql = `
      SELECT id, from_account_number as fromAccountNumber, to_account_number as toAccountNumber,
             amount, currency, exchange_rate as exchangeRate, amount_in_zar as amountInZar,
             reference, recipient_name as recipientName, recipient_bank as recipientBank,
             status, transaction_type as transactionType, fees, risk_score as riskScore,
             ip_address as ipAddress, user_agent as userAgent,
             created_at as createdAt, completed_at as completedAt, updated_at as updatedAt
      FROM transactions 
      WHERE created_at BETWEEN ? AND ?
    `

    const params = [startDate, endDate]

    if (accountNumber) {
      sql += " AND (from_account_number = ? OR to_account_number = ?)"
      params.push(accountNumber, accountNumber)
    }

    sql += " ORDER BY created_at DESC"

    return await db.query<Transaction>(sql, params)
  }
}
