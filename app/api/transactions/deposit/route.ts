import { type NextRequest, NextResponse } from "next/server"
import { SecureDatabase } from "@/lib/secure-database"
import { validateTransactionAmount, sanitizeInput } from "@/lib/security"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const user = SecureDatabase.validateSession(token)

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 401 })
    }

    const clientIP = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const { amount, reference, depositMethod } = await request.json()

    // Validate amount
    const amountValidation = validateTransactionAmount(amount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 })
    }

    // Validate deposit limits
    if (amount > 500000) {
      return NextResponse.json({ error: "Deposit amount exceeds daily limit of R500,000" }, { status: 400 })
    }

    console.log(`Processing deposit: ${user.email} depositing R${amount}`)
    console.log(`User balance before: R${user.balance}`)

    // Create the deposit transaction
    const transaction = SecureDatabase.createTransaction(
      {
        fromAccountNumber: "SYSTEM_DEPOSIT",
        toAccountNumber: user.accountNumber,
        amount,
        currency: "ZAR",
        amountInZAR: amount,
        reference: sanitizeInput(reference || "Account deposit"),
        recipientName: `${user.firstName} ${user.lastName}`,
        recipientBank: "SECUREBANK",
        status: "completed",
        fees: 0,
        type: "deposit",
        completedAt: new Date().toISOString(),
      },
      clientIP,
      userAgent,
    )

    // Update user balance - ADD the deposit amount
    const newBalance = user.balance + amount
    const balanceUpdated = SecureDatabase.updateUserBalance(user.id, newBalance)

    if (!balanceUpdated) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    console.log(`User balance after deposit: R${newBalance}`)
    console.log(`Deposit transaction created with ID: ${transaction.id}`)

    return NextResponse.json({
      transactionId: transaction.id,
      status: "completed",
      message: "Deposit completed successfully",
      newBalance: newBalance,
      amountCredited: amount,
    })
  } catch (error) {
    console.error("Deposit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
