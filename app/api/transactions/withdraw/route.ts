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

    const { amount, reference, withdrawalMethod } = await request.json()

    // Validate amount
    const amountValidation = validateTransactionAmount(amount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 })
    }

    // Validate withdrawal limits
    if (amount > 50000) {
      return NextResponse.json({ error: "Withdrawal amount exceeds daily limit of R50,000" }, { status: 400 })
    }

    // Check if user has sufficient balance (including a small fee)
    const withdrawalFee = Math.min(amount * 0.001, 50) // 0.1% fee, max R50
    const totalDebit = amount + withdrawalFee

    if (totalDebit > user.balance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Required: R${totalDebit.toFixed(2)}, Available: R${user.balance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    console.log(`Processing withdrawal: ${user.email} withdrawing R${amount} + fee R${withdrawalFee}`)
    console.log(`User balance before: R${user.balance}`)

    // Create the withdrawal transaction
    const transaction = SecureDatabase.createTransaction(
      {
        fromAccountNumber: user.accountNumber,
        toAccountNumber: "SYSTEM_WITHDRAWAL",
        amount,
        currency: "ZAR",
        amountInZAR: amount,
        reference: sanitizeInput(reference || "Account withdrawal"),
        recipientName: `${user.firstName} ${user.lastName}`,
        recipientBank: "SECUREBANK",
        status: "completed",
        fees: withdrawalFee,
        type: "withdrawal",
        completedAt: new Date().toISOString(),
      },
      clientIP,
      userAgent,
    )

    // Update user balance - SUBTRACT the withdrawal amount and fee
    const newBalance = user.balance - totalDebit
    const balanceUpdated = SecureDatabase.updateUserBalance(user.id, newBalance)

    if (!balanceUpdated) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    console.log(`User balance after withdrawal: R${newBalance}`)
    console.log(`Withdrawal transaction created with ID: ${transaction.id}`)

    return NextResponse.json({
      transactionId: transaction.id,
      status: "completed",
      message: "Withdrawal completed successfully",
      newBalance: newBalance,
      amountDebited: totalDebit,
      withdrawalFee: withdrawalFee,
    })
  } catch (error) {
    console.error("Withdrawal error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
