// Input validation with RegEx patterns for security
export const ValidationPatterns = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  name: /^[a-zA-Z\s'-]{2,50}$/,
  accountNumber: /^[0-9]{10}$/,
  amount: /^\d+(\.\d{1,2})?$/,
  currency: /^(USD|EUR|GBP|ZAR)$/,
  bankCode: /^[A-Z0-9]{6,11}$/,
  reference: /^[a-zA-Z0-9\s\-_]{1,35}$/,
  phoneNumber: /^(\+27|0)[0-9]{9}$/,
}

export function validateInput(value: string, pattern: RegExp): boolean {
  return pattern.test(value)
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>"'&]/g, "")
}

export function validateTransactionAmount(amount: number): boolean {
  return amount > 0 && amount <= 1000000 && Number.isFinite(amount)
}

export function validateSouthAfricanBank(bankCode: string): boolean {
  const saBanks = [
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
  return saBanks.includes(bankCode.toUpperCase())
}
