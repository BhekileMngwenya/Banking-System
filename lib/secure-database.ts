// Enhanced database with security features
import { SecureCrypto } from "./crypto"
import { sanitizeInput, validateInput, SecurityPatterns } from "./security"

interface SecureUser {
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
  createdAt: string
  lastLogin?: string
  failedLoginAttempts: number
  lockedUntil?: string
  sessionId?: string
  twoFactorEnabled: boolean
  loginHistory: Array<{ timestamp: string; ip: string; userAgent: string; success: boolean }>
}

interface SecureTransaction {
  id: string
  fromAccountNumber: string
  toAccountNumber: string
  amount: number
  currency: string
  amountInZAR: number
  reference: string
  recipientName: string
  recipientBank: string
  status: "pending" | "completed" | "failed" | "cancelled"
  createdAt: string
  completedAt?: string
  fees: number
  type: string
  ipAddress?: string
  userAgent?: string
  riskScore: number
}

// Secure global storage
const secureStorage = {
  users: [] as SecureUser[],
  transactions: [] as SecureTransaction[],
  sessions: new Map<string, { userId: string; expiresAt: number }>(),
}

export class SecureDatabase {
  // Initialize with default admin user
  static async initialize() {
    if (secureStorage.users.length === 0) {
      // Create default admin
      const { hash, salt } = await SecureCrypto.hashPassword("AdminPass123!")

      const adminUser: SecureUser = {
        id: "1",
        email: "your.example@gmail.com",
        passwordHash: hash,
        passwordSalt: salt,
        firstName: "System",
        lastName: "Administrator",
        role: "admin",
        accountNumber: "6200000001",
        balance: 50000,
        isActive: true,
        createdAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        loginHistory: [],
      }

      secureStorage.users.push(adminUser)

      // Create sample customer
      const { hash: customerHash, salt: customerSalt } = await SecureCrypto.hashPassword("Customer123!")

      const customerUser: SecureUser = {
        id: "2",
        email: "john.doe@example.com",
        passwordHash: customerHash,
        passwordSalt: customerSalt,
        firstName: "John",
        lastName: "Doe",
        role: "customer",
        accountNumber: "6200000002",
        balance: 25000,
        isActive: true,
        createdAt: new Date().toISOString(),
        failedLoginAttempts: 0,
        twoFactorEnabled: false,
        loginHistory: [],
      }

      secureStorage.users.push(customerUser)

      // Add some sample transactions for the customer
      this.createTransaction({
        fromAccountNumber: "SYSTEM_DEPOSIT",
        toAccountNumber: "6200000002",
        amount: 25000,
        currency: "ZAR",
        amountInZAR: 25000,
        reference: "Initial deposit",
        recipientName: "John Doe",
        recipientBank: "SECUREBANK",
        status: "completed",
        fees: 0,
        type: "deposit",
        completedAt: new Date().toISOString(),
      })

      console.log("Secure database initialized with default users and transactions")
    }
  }

  // Secure user authentication
  static async authenticateUser(
    email: string,
    password: string,
    ipAddress = "unknown",
    userAgent = "unknown",
  ): Promise<{ success: boolean; user?: SecureUser; token?: string; error?: string }> {
    // Input validation
    if (!validateInput(email, SecurityPatterns.email)) {
      return { success: false, error: "Invalid email format" }
    }

    const sanitizedEmail = sanitizeInput(email)
    const user = secureStorage.users.find((u) => u.email === sanitizedEmail)

    // Log login attempt
    const loginAttempt = {
      timestamp: new Date().toISOString(),
      ip: ipAddress,
      userAgent: userAgent,
      success: false,
    }

    if (!user) {
      return { success: false, error: "Invalid credentials" }
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
      return { success: false, error: "Account temporarily locked" }
    }

    // Check if account is active
    if (!user.isActive) {
      return { success: false, error: "Account is deactivated" }
    }

    // Verify password
    const isValidPassword = await SecureCrypto.verifyPassword(password, user.passwordHash, user.passwordSalt)

    if (!isValidPassword) {
      // Increment failed attempts
      user.failedLoginAttempts++

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      }

      user.loginHistory.push(loginAttempt)

      return {
        success: false,
        error: `Invalid credentials. ${5 - user.failedLoginAttempts} attempts remaining.`,
      }
    }

    // Successful login
    user.failedLoginAttempts = 0
    user.lockedUntil = undefined
    user.lastLogin = new Date().toISOString()
    user.sessionId = SecureCrypto.generateSecureToken()

    loginAttempt.success = true
    user.loginHistory.push(loginAttempt)

    // Keep only last 10 login attempts
    if (user.loginHistory.length > 10) {
      user.loginHistory = user.loginHistory.slice(-10)
    }

    // Generate secure session
    const sessionExpiry = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    secureStorage.sessions.set(user.sessionId, {
      userId: user.id,
      expiresAt: sessionExpiry,
    })

    // Generate token
    const token = SecureCrypto.generateJWT(
      {
        userId: user.id,
        sessionId: user.sessionId,
        role: user.role,
        exp: sessionExpiry,
      },
      process.env.JWT_SECRET || "fallback-secret",
    )

    return { success: true, user, token }
  }

  // Validate session
  static validateSession(token: string): SecureUser | null {
    try {
      const payload = SecureCrypto.verifyJWT(token, process.env.JWT_SECRET || "fallback-secret")

      if (!payload || payload.exp < Date.now()) {
        return null
      }

      const session = secureStorage.sessions.get(payload.sessionId)
      if (!session || session.expiresAt < Date.now()) {
        return null
      }

      const user = secureStorage.users.find((u) => u.id === payload.userId)
      if (!user || !user.isActive || user.sessionId !== payload.sessionId) {
        return null
      }

      return user
    } catch {
      return null
    }
  }

  // Create new user (admin only)
  static async createUser(userData: {
    email: string
    firstName: string
    lastName: string
    password: string
    initialBalance: number
  }): Promise<{ success: boolean; user?: SecureUser; error?: string }> {
    // Validate all inputs
    if (!validateInput(userData.email, SecurityPatterns.email)) {
      return { success: false, error: "Invalid email format" }
    }

    if (!validateInput(userData.firstName, SecurityPatterns.name)) {
      return { success: false, error: "Invalid first name" }
    }

    if (!validateInput(userData.lastName, SecurityPatterns.name)) {
      return { success: false, error: "Invalid last name" }
    }

    if (!validateInput(userData.password, SecurityPatterns.password)) {
      return { success: false, error: "Password does not meet security requirements" }
    }

    // Check if user exists
    const existingUser = secureStorage.users.find((u) => u.email === sanitizeInput(userData.email))
    if (existingUser) {
      return { success: false, error: "User with this email already exists" }
    }

    // Hash password
    const { hash, salt } = await SecureCrypto.hashPassword(userData.password)

    // Generate secure account number
    const accountNumber =
      "62" +
      Math.floor(Math.random() * 100000000)
        .toString()
        .padStart(8, "0")

    const newUser: SecureUser = {
      id: (secureStorage.users.length + 1).toString(),
      email: sanitizeInput(userData.email),
      passwordHash: hash,
      passwordSalt: salt,
      firstName: sanitizeInput(userData.firstName),
      lastName: sanitizeInput(userData.lastName),
      role: "customer",
      accountNumber,
      balance: userData.initialBalance,
      isActive: true,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
      twoFactorEnabled: false,
      loginHistory: [],
    }

    secureStorage.users.push(newUser)

    // Create initial deposit transaction
    if (userData.initialBalance > 0) {
      this.createTransaction({
        fromAccountNumber: "SYSTEM_DEPOSIT",
        toAccountNumber: accountNumber,
        amount: userData.initialBalance,
        currency: "ZAR",
        amountInZAR: userData.initialBalance,
        reference: "Initial account deposit",
        recipientName: `${newUser.firstName} ${newUser.lastName}`,
        recipientBank: "SECUREBANK",
        status: "completed",
        fees: 0,
        type: "deposit",
        completedAt: new Date().toISOString(),
      })
    }

    return { success: true, user: newUser }
  }

  // Get user by ID
  static findUserById(id: string): SecureUser | null {
    return secureStorage.users.find((u) => u.id === id) || null
  }

  // Get all customers
  static getAllCustomers(): SecureUser[] {
    return secureStorage.users.filter((u) => u.role === "customer")
  }

  // Update user status
  static updateUserStatus(userId: string, isActive: boolean): boolean {
    const user = secureStorage.users.find((u) => u.id === userId)
    if (user) {
      user.isActive = isActive
      return true
    }
    return false
  }

  // Create secure transaction
  static createTransaction(
    transactionData: Omit<SecureTransaction, "id" | "createdAt" | "riskScore">,
    ipAddress?: string,
    userAgent?: string,
  ): SecureTransaction {
    // Calculate risk score based on various factors
    let riskScore = 0

    // Large amounts increase risk
    if (transactionData.amountInZAR > 50000) riskScore += 30
    else if (transactionData.amountInZAR > 10000) riskScore += 15

    // International transfers have higher risk
    if (transactionData.type === "international_transfer") riskScore += 20

    // New recipient increases risk (simplified check)
    const existingTransactions = secureStorage.transactions.filter(
      (t) =>
        t.fromAccountNumber === transactionData.fromAccountNumber &&
        t.toAccountNumber === transactionData.toAccountNumber,
    )
    if (existingTransactions.length === 0) riskScore += 25

    const transaction: SecureTransaction = {
      ...transactionData,
      id: (secureStorage.transactions.length + 1).toString(),
      createdAt: new Date().toISOString(),
      ipAddress,
      userAgent,
      riskScore,
    }

    secureStorage.transactions.push(transaction)
    console.log(`Transaction created: ${transaction.id}, Type: ${transaction.type}, Amount: ${transaction.amountInZAR}`)

    return transaction
  }

  // Get user transactions
  static getUserTransactions(accountNumber: string): SecureTransaction[] {
    const userTransactions = secureStorage.transactions
      .filter((t) => t.fromAccountNumber === accountNumber || t.toAccountNumber === accountNumber)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    console.log(`Found ${userTransactions.length} transactions for account ${accountNumber}`)
    return userTransactions
  }

  // Get all transactions (admin only)
  static getAllTransactions(): SecureTransaction[] {
    return secureStorage.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Update user balance
  static updateUserBalance(userId: string, newBalance: number): boolean {
    const user = secureStorage.users.find((u) => u.id === userId)
    if (user) {
      const oldBalance = user.balance
      user.balance = newBalance
      console.log(`User ${user.email} balance updated: ${oldBalance} -> ${newBalance}`)
      return true
    }
    return false
  }

  // Logout user (invalidate session)
  static logoutUser(sessionId: string): void {
    secureStorage.sessions.delete(sessionId)

    // Clear session ID from user
    const user = secureStorage.users.find((u) => u.sessionId === sessionId)
    if (user) {
      user.sessionId = undefined
    }
  }

  // Clean up expired sessions
  static cleanupExpiredSessions(): void {
    const now = Date.now()
    for (const [sessionId, session] of secureStorage.sessions.entries()) {
      if (session.expiresAt < now) {
        secureStorage.sessions.delete(sessionId)
      }
    }
  }

  // Debug function
  static debugPrintUsers(): void {
    console.log("=== SECURE DATABASE USERS ===")
    secureStorage.users.forEach((user) => {
      console.log(
        `ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}, Balance: ${user.balance}`,
      )
    })
    console.log("=============================")
  }

  // Debug function for transactions
  static debugPrintTransactions(): void {
    console.log("=== SECURE DATABASE TRANSACTIONS ===")
    secureStorage.transactions.forEach((txn) => {
      console.log(
        `ID: ${txn.id}, Type: ${txn.type}, From: ${txn.fromAccountNumber}, To: ${txn.toAccountNumber}, Amount: ${txn.amountInZAR}, Status: ${txn.status}`,
      )
    })
    console.log("===================================")
  }
}

// Initialize database on import
SecureDatabase.initialize()

// Clean up expired sessions every hour
setInterval(
  () => {
    SecureDatabase.cleanupExpiredSessions()
  },
  60 * 60 * 1000,
)
