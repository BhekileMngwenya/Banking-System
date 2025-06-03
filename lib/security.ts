// Security utilities for input validation and sanitization
export const SecurityPatterns = {
  // Strict email validation
  email:
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,

  // Strong password requirements
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,

  // Names - only letters, spaces, hyphens, apostrophes
  name: /^[a-zA-Z\s'-]{2,50}$/,

  // South African account numbers
  accountNumber: /^[0-9]{10}$/,

  // Currency amounts - up to 2 decimal places
  amount: /^\d{1,10}(\.\d{1,2})?$/,

  // Currency codes
  currency: /^(USD|EUR|GBP|ZAR)$/,

  // Bank codes (SWIFT format)
  bankCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,

  // Payment reference - alphanumeric, spaces, hyphens, underscores
  reference: /^[a-zA-Z0-9\s\-_]{1,35}$/,

  // South African phone numbers
  phoneNumber: /^(\+27|0)[0-9]{9}$/,

  // Alphanumeric with basic punctuation
  alphanumeric: /^[a-zA-Z0-9\s\-_.,']{1,100}$/,
}

// Input sanitization to prevent XSS
export function sanitizeInput(input: string): string {
  if (typeof input !== "string") return ""

  return input
    .trim()
    .replace(/[<>"'&]/g, "") // Remove dangerous HTML characters
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, "") // Remove event handlers
    .slice(0, 1000) // Limit length to prevent DoS
}

// Validate input against whitelist patterns
export function validateInput(value: string, pattern: RegExp): boolean {
  if (typeof value !== "string") return false
  return pattern.test(value)
}

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
export function checkRateLimit(identifier: string, maxAttempts = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= maxAttempts) {
    return false
  }

  record.count++
  return true
}

// CSRF token generation and validation
const csrfTokens = new Set<string>()

export function generateCSRFToken(): string {
  const token = Math.random().toString(36).substring(2) + Date.now().toString(36)
  csrfTokens.add(token)

  // Clean up old tokens after 1 hour
  setTimeout(() => csrfTokens.delete(token), 60 * 60 * 1000)

  return token
}

export function validateCSRFToken(token: string): boolean {
  return csrfTokens.has(token)
}

// SQL injection prevention (for query building)
export function escapeSQL(input: string): string {
  return input.replace(/'/g, "''").replace(/;/g, "").replace(/--/g, "")
}

// Validate transaction amounts
export function validateTransactionAmount(amount: number): { valid: boolean; error?: string } {
  if (!Number.isFinite(amount)) {
    return { valid: false, error: "Invalid amount format" }
  }

  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than zero" }
  }

  if (amount > 1000000) {
    return { valid: false, error: "Amount exceeds maximum limit of R1,000,000" }
  }

  // Check for reasonable decimal places
  const decimalPlaces = (amount.toString().split(".")[1] || "").length
  if (decimalPlaces > 2) {
    return { valid: false, error: "Amount cannot have more than 2 decimal places" }
  }

  return { valid: true }
}

// Validate South African bank codes
export function validateSouthAfricanBank(bankCode: string): boolean {
  const validBanks = [
    "ABSAZAJJ", // Absa Bank
    "FIRNZAJJ", // First National Bank
    "NEDSZAJJ", // Nedbank
    "SBZAZAJJ", // Standard Bank
    "CABLZAJJ", // Capitec Bank
    "INVEZAJJ", // Investec Bank
    "AFRCZAJJ", // African Bank
    "BIDVZAJJ", // Bidvest Bank
    "GROSZAJJ", // Grobank
    "HABAZAJJ", // Habib Overseas Bank
  ]

  return validBanks.includes(bankCode.toUpperCase())
}

// Session security
export function generateSecureSessionId(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("")
}

// Password strength validation
export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long")
  }

  if (password.length > 128) {
    errors.push("Password must not exceed 128 characters")
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter")
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter")
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number")
  }

  if (!/[@$!%*?&]/.test(password)) {
    errors.push("Password must contain at least one special character (@$!%*?&)")
  }

  // Check for common weak passwords
  const commonPasswords = ["password", "123456", "qwerty", "admin", "letmein"]
  if (commonPasswords.some((weak) => password.toLowerCase().includes(weak))) {
    errors.push("Password contains common weak patterns")
  }

  return { valid: errors.length === 0, errors }
}
