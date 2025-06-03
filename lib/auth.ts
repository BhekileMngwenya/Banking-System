// Simple password verification without bcrypt for demo purposes
// In production, use proper bcrypt hashing
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key-for-development"

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: "admin" | "customer"
  accountNumber: string
  balance: number
  isActive: boolean
  createdAt: Date
  lastLogin?: Date
  failedLoginAttempts: number
  lockedUntil?: Date
}

export interface Session {
  userId: string
  email: string
  role: "admin" | "customer"
  accountNumber?: string
}

// Simple hash function for demo (use bcrypt in production)
function simpleHash(password: string): string {
  // This is NOT secure - only for demo purposes
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString()
}

// Password hashing (simplified for demo)
export async function hashPassword(password: string): Promise<string> {
  // In production, use: return bcrypt.hash(password, 12)
  return `hashed_${simpleHash(password)}_${password.length}`
}

// Password verification (simplified for demo)
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  try {
    console.log("Comparing password with hash...")

    // For demo purposes, we'll use a simple comparison
    // In production, use: return bcrypt.compare(password, hashedPassword)

    // Check if it's our demo admin password
    if (password === "AdminPass123!" && hashedPassword === "demo_admin_hash") {
      console.log("Demo admin password matched")
      return true
    }

    // Check if it matches the simple hash format
    const expectedHash = `hashed_${simpleHash(password)}_${password.length}`
    const result = hashedPassword === expectedHash

    console.log("Password comparison result:", result)
    return result
  } catch (error) {
    console.error("Password verification error:", error)
    return false
  }
}

// JWT token generation
export function generateToken(user: User): string {
  const payload: Session = {
    userId: user.id,
    email: user.email,
    role: user.role,
    accountNumber: user.accountNumber,
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" })
}

// JWT token verification
export function verifyToken(token: string): Session | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Session
  } catch {
    return null
  }
}

// Account lockout check
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false
  return new Date() < user.lockedUntil
}

// Generate secure account number
export function generateAccountNumber(): string {
  const prefix = "62" // South African bank prefix
  const randomDigits = Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0")
  return prefix + randomDigits
}
