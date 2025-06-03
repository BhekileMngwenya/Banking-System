// Mock database - In production, use a real database with proper ORM
import type { User } from "./auth"

interface Transaction {
  id: string
  fromAccountNumber: string
  toAccountNumber: string
  amount: number
  currency: string
  exchangeRate?: number
  amountInZAR: number
  reference: string
  recipientName: string
  recipientBank: string
  status: "pending" | "completed" | "failed" | "cancelled"
  createdAt: Date
  completedAt?: Date
  fees: number
  type: "international_transfer" | "domestic_transfer" | "deposit" | "withdrawal"
}

// Mock data storage (use real database in production)
const users: User[] = [
  {
    id: "1",
    email: "your.example@gmail.com",
    firstName: "System",
    lastName: "Administrator",
    role: "admin",
    accountNumber: "6200000001",
    balance: 0,
    isActive: true,
    createdAt: new Date(),
    failedLoginAttempts: 0,
  },
]

const transactions: Transaction[] = []
const userPasswords: Record<string, string> = {
  // Simple demo password for AdminPass123!
  "1": "demo_admin_hash",
}

export async function createUser(
  userData: Omit<User, "id" | "createdAt" | "failedLoginAttempts">,
  password: string,
): Promise<User> {
  const user: User = {
    ...userData,
    id: (users.length + 1).toString(),
    createdAt: new Date(),
    failedLoginAttempts: 0,
  }

  users.push(user)
  userPasswords[user.id] = password

  return user
}

export async function findUserByEmail(email: string): Promise<User | null> {
  return users.find((user) => user.email === email) || null
}

export async function findUserById(id: string): Promise<User | null> {
  return users.find((user) => user.id === id) || null
}

export async function getUserPassword(userId: string): Promise<string | null> {
  return userPasswords[userId] || null
}

export async function updateUserLoginAttempts(userId: string, attempts: number, lockedUntil?: Date): Promise<void> {
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.failedLoginAttempts = attempts
    user.lockedUntil = lockedUntil
    if (attempts === 0) {
      user.lastLogin = new Date()
    }
  }
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.balance = newBalance
  }
}

export async function createTransaction(transaction: Omit<Transaction, "id" | "createdAt">): Promise<Transaction> {
  const newTransaction: Transaction = {
    ...transaction,
    id: (transactions.length + 1).toString(),
    createdAt: new Date(),
  }

  transactions.push(newTransaction)
  return newTransaction
}

export async function getUserTransactions(accountNumber: string): Promise<Transaction[]> {
  return transactions
    .filter((t) => t.fromAccountNumber === accountNumber || t.toAccountNumber === accountNumber)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function getAllUsers(): Promise<User[]> {
  return users.filter((user) => user.role === "customer")
}

export async function getAllTransactions(): Promise<Transaction[]> {
  return transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<void> {
  const user = users.find((u) => u.id === userId)
  if (user) {
    user.isActive = isActive
  }
}

// Currency exchange rates (mock - use real API in production)
export const exchangeRates = {
  USD: 18.75,
  EUR: 20.45,
  GBP: 23.85,
  ZAR: 1.0,
}

export function convertToZAR(amount: number, currency: string): number {
  const rate = exchangeRates[currency as keyof typeof exchangeRates] || 1
  return amount * rate
}

export function calculateTransactionFees(amount: number, currency: string): number {
  const baseAmount = convertToZAR(amount, currency)

  // Fee structure based on ZAR amount
  if (baseAmount <= 1000) return 50 // R50 for small transfers
  if (baseAmount <= 10000) return 100 // R100 for medium transfers
  if (baseAmount <= 50000) return 250 // R250 for large transfers

  // 0.5% for very large transfers, capped at R500
  return Math.min(baseAmount * 0.005, 500)
}

// Daily and monthly limits tracking
const userLimits: Record<string, { daily: number; monthly: number; lastReset: Date }> = {}

export function checkTransferLimits(userId: string, amount: number): { allowed: boolean; reason?: string } {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()

  if (!userLimits[userId]) {
    userLimits[userId] = { daily: 0, monthly: 0, lastReset: today }
  }

  const limits = userLimits[userId]
  const lastReset = limits.lastReset

  // Reset daily limit if new day
  if (lastReset.getDate() !== currentDay) {
    limits.daily = 0
  }

  // Reset monthly limit if new month
  if (lastReset.getMonth() !== currentMonth) {
    limits.monthly = 0
  }

  // Check limits
  const DAILY_LIMIT = 100000 // R100,000
  const MONTHLY_LIMIT = 1000000 // R1,000,000

  if (limits.daily + amount > DAILY_LIMIT) {
    return { allowed: false, reason: "Daily transfer limit exceeded" }
  }

  if (limits.monthly + amount > MONTHLY_LIMIT) {
    return { allowed: false, reason: "Monthly transfer limit exceeded" }
  }

  // Update limits
  limits.daily += amount
  limits.monthly += amount
  limits.lastReset = today

  return { allowed: true }
}
