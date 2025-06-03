// Database models and types
export interface User {
  id: string
  email: string
  passwordHash: string
  passwordSalt: string
  firstName: string
  lastName: string
  role: "admin" | "customer"
  accountNumber: string
  balance: number
  isActive: boolean
  twoFactorEnabled: boolean
  failedLoginAttempts: number
  lockedUntil: Date | null
  lastLogin: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface Session {
  id: string
  userId: string
  sessionToken: string
  ipAddress: string | null
  userAgent: string | null
  expiresAt: Date
  createdAt: Date
}

export interface Transaction {
  id: string
  fromAccountNumber: string
  toAccountNumber: string
  amount: number
  currency: string
  exchangeRate: number
  amountInZar: number
  reference: string
  recipientName: string
  recipientBank: string | null
  status: "pending" | "completed" | "failed" | "cancelled"
  transactionType: "international_transfer" | "domestic_transfer" | "deposit" | "withdrawal"
  fees: number
  riskScore: number
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
  completedAt: Date | null
  updatedAt: Date
}

export interface LoginHistory {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  success: boolean
  failureReason: string | null
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  resource: string | null
  resourceId: string | null
  oldValues: any
  newValues: any
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

export interface ExchangeRate {
  id: string
  currencyFrom: string
  currencyTo: string
  rate: number
  createdAt: Date
  updatedAt: Date
}

export interface SystemSetting {
  id: string
  settingKey: string
  settingValue: string | null
  description: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RateLimit {
  id: string
  identifier: string
  attempts: number
  resetTime: Date
  createdAt: Date
  updatedAt: Date
}

// Database result types
export interface DatabaseUser extends Omit<User, "passwordHash" | "passwordSalt"> {}

export interface CreateUserData {
  email: string
  firstName: string
  lastName: string
  password: string
  role?: "admin" | "customer"
  initialBalance?: number
}

export interface CreateTransactionData {
  fromAccountNumber: string
  toAccountNumber: string
  amount: number
  currency: string
  exchangeRate?: number
  amountInZar: number
  reference: string
  recipientName: string
  recipientBank?: string
  transactionType: Transaction["transactionType"]
  fees?: number
  ipAddress?: string
  userAgent?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  email?: string
  isActive?: boolean
  balance?: number
}

export interface AuthResult {
  success: boolean
  user?: DatabaseUser
  token?: string
  error?: string
}
