// Secure password hashing using Web Crypto API
export class SecureCrypto {
  private static readonly SALT_LENGTH = 32
  private static readonly ITERATIONS = 100000
  private static readonly KEY_LENGTH = 64

  // Generate a random salt
  static generateSalt(): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH))
  }

  // Hash password with PBKDF2
  static async hashPassword(password: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
    const encoder = new TextEncoder()
    const passwordBuffer = encoder.encode(password)

    const saltBuffer = salt || this.generateSalt()

    // Import password as key material
    const keyMaterial = await crypto.subtle.importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, ["deriveBits"])

    // Derive key using PBKDF2
    const derivedKey = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: this.ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      this.KEY_LENGTH * 8,
    )

    // Convert to base64 for storage
    const hashArray = new Uint8Array(derivedKey)
    const hashBase64 = btoa(String.fromCharCode(...hashArray))
    const saltBase64 = btoa(String.fromCharCode(...saltBuffer))

    return { hash: hashBase64, salt: saltBase64 }
  }

  // Verify password against hash
  static async verifyPassword(password: string, storedHash: string, storedSalt: string): Promise<boolean> {
    try {
      // Convert salt from base64
      const saltArray = new Uint8Array(
        atob(storedSalt)
          .split("")
          .map((char) => char.charCodeAt(0)),
      )

      // Hash the provided password with the stored salt
      const { hash } = await this.hashPassword(password, saltArray)

      // Compare hashes
      return hash === storedHash
    } catch (error) {
      console.error("Password verification error:", error)
      return false
    }
  }

  // Generate secure random token
  static generateSecureToken(length = 32): string {
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
  }

  // Generate JWT-like token (simplified for demo)
  static generateJWT(payload: any, secret: string): string {
    const header = { alg: "HS256", typ: "JWT" }
    const encodedHeader = btoa(JSON.stringify(header))
    const encodedPayload = btoa(JSON.stringify(payload))

    // Simple signature (in production, use proper HMAC)
    const signature = btoa(`${encodedHeader}.${encodedPayload}.${secret}`)

    return `${encodedHeader}.${encodedPayload}.${signature}`
  }

  // Verify JWT-like token
  static verifyJWT(token: string, secret: string): any {
    try {
      const [header, payload, signature] = token.split(".")

      // Verify signature (simplified)
      const expectedSignature = btoa(`${header}.${payload}.${secret}`)

      if (signature !== expectedSignature) {
        return null
      }

      return JSON.parse(atob(payload))
    } catch {
      return null
    }
  }
}
