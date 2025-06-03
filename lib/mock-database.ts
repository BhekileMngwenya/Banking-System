// In-memory database that persists during the session
interface User {
  id: string
  email: string
  password: string
  firstName: string
  lastName: string
  role: "admin" | "customer"
  accountNumber: string
  balance: number
  isActive: boolean
  createdAt: string
  failedLoginAttempts: number
}

interface Transaction {
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
  fees: number
  type: string
}

// Global storage that persists across API calls
const globalStorage = {
  users: [
    {
      id: "1",
      email: "your.example@gmail.com",
      password: "AdminPass123!",
      firstName: "System",
      lastName: "Administrator",
      role: "admin" as const,
      accountNumber: "6200000001",
      balance: 50000,
      isActive: true,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
    },
    // Sample customer for demo
    {
      id: "2",
      email: "john.doe@example.com",
      password: "Customer123!",
      firstName: "John",
      lastName: "Doe",
      role: "customer" as const,
      accountNumber: "6200000002",
      balance: 25000,
      isActive: true,
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
    },
  ] as User[],
  transactions: [
    {
      id: "1",
      fromAccountNumber: "6200000002",
      toAccountNumber: "6200000003",
      amount: 1000,
      currency: "USD",
      amountInZAR: 18750,
      reference: "Payment for services",
      recipientName: "Jane Smith",
      recipientBank: "FIRNZAJJ",
      status: "completed",
      createdAt: new Date().toISOString(),
      fees: 100,
      type: "international_transfer",
    },
  ] as Transaction[],
}

export class MockDatabase {
  // User operations
  static findUserByEmail(email: string): User | null {
    return globalStorage.users.find((user) => user.email === email) || null
  }

  static findUserById(id: string): User | null {
    return globalStorage.users.find((user) => user.id === id) || null
  }

  static createUser(userData: Omit<User, "id" | "createdAt" | "failedLoginAttempts">): User {
    const newUser: User = {
      ...userData,
      id: (globalStorage.users.length + 1).toString(),
      createdAt: new Date().toISOString(),
      failedLoginAttempts: 0,
    }

    globalStorage.users.push(newUser)
    console.log("User created:", newUser.email, "Total users:", globalStorage.users.length)
    return newUser
  }

  static getAllCustomers(): User[] {
    return globalStorage.users.filter((user) => user.role === "customer")
  }

  static updateUserStatus(userId: string, isActive: boolean): boolean {
    const user = globalStorage.users.find((u) => u.id === userId)
    if (user) {
      user.isActive = isActive
      return true
    }
    return false
  }

  static updateUserBalance(userId: string, newBalance: number): boolean {
    const user = globalStorage.users.find((u) => u.id === userId)
    if (user) {
      user.balance = newBalance
      return true
    }
    return false
  }

  // Transaction operations
  static createTransaction(transactionData: Omit<Transaction, "id" | "createdAt">): Transaction {
    const newTransaction: Transaction = {
      ...transactionData,
      id: (globalStorage.transactions.length + 1).toString(),
      createdAt: new Date().toISOString(),
    }

    globalStorage.transactions.push(newTransaction)
    return newTransaction
  }

  static getUserTransactions(accountNumber: string): Transaction[] {
    return globalStorage.transactions
      .filter((t) => t.fromAccountNumber === accountNumber || t.toAccountNumber === accountNumber)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static getAllTransactions(): Transaction[] {
    return globalStorage.transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // Utility functions
  static generateAccountNumber(): string {
    const prefix = "62"
    const randomDigits = Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0")
    return prefix + randomDigits
  }

  static getAllUsers(): User[] {
    return globalStorage.users
  }

  static debugPrintUsers(): void {
    console.log("=== ALL USERS IN DATABASE ===")
    globalStorage.users.forEach((user) => {
      console.log(`ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}`)
    })
    console.log("=============================")
  }
}
