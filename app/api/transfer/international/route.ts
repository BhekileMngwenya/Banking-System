import { type NextRequest, NextResponse } from "next/server"
import { SecureDatabase } from "@/lib/secure-database"
import {
  SecurityPatterns,
  validateInput,
  sanitizeInput,
  validateTransactionAmount,
  validateSouthAfricanBank,
} from "@/lib/security"

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

    const {
      recipientName,
      recipientEmail,
      recipientBank,
      recipientAccount,
      amount,
      currency,
      reference,
      purpose,
      exchangeRate,
      zarAmount,
      fees,
    } = await request.json()

    // Comprehensive input validation
    if (!validateInput(recipientName, SecurityPatterns.name)) {
      return NextResponse.json({ error: "Invalid recipient name" }, { status: 400 })
    }

    if (!validateInput(recipientEmail, SecurityPatterns.email)) {
      return NextResponse.json({ error: "Invalid recipient email" }, { status: 400 })
    }

    if (!validateInput(recipientAccount, SecurityPatterns.accountNumber)) {
      return NextResponse.json({ error: "Invalid account number" }, { status: 400 })
    }

    if (!validateInput(reference, SecurityPatterns.reference)) {
      return NextResponse.json({ error: "Invalid reference" }, { status: 400 })
    }

    if (!validateSouthAfricanBank(recipientBank)) {
      return NextResponse.json({ error: "Invalid bank code" }, { status: 400 })
    }

    if (!validateInput(currency, SecurityPatterns.currency)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 })
    }

    // Validate amounts
    const amountValidation = validateTransactionAmount(amount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 })
    }

    const zarAmountValidation = validateTransactionAmount(zarAmount)
    if (!zarAmountValidation.valid) {
      return NextResponse.json({ error: "Invalid ZAR amount" }, { status: 400 })
    }

    const feesValidation = validateTransactionAmount(fees)
    if (!feesValidation.valid) {
      return NextResponse.json({ error: "Invalid fees amount" }, { status: 400 })
    }

    const totalDebit = zarAmount + fees

    // Check if user has sufficient balance
    if (totalDebit > user.balance) {
      return NextResponse.json(
        {
          error: `Insufficient balance. Required: R${totalDebit.toFixed(2)}, Available: R${user.balance.toFixed(2)}`,
        },
        { status: 400 },
      )
    }

    // Check daily/monthly limits (simplified for demo)
    if (zarAmount > 100000) {
      return NextResponse.json({ error: "Amount exceeds daily limit of R100,000" }, { status: 400 })
    }

    console.log(
      `Processing transfer: ${user.email} sending ${currency} ${amount} (R${zarAmount}) + fees R${fees} = Total R${totalDebit}`,
    )
    console.log(`User balance before: R${user.balance}`)

    // Create the transaction
    const transaction = SecureDatabase.createTransaction(
      {
        fromAccountNumber: user.accountNumber,
        toAccountNumber: sanitizeInput(recipientAccount),
        amount,
        currency,
        amountInZAR: zarAmount,
        reference: sanitizeInput(reference),
        recipientName: sanitizeInput(recipientName),
        recipientBank,
        status: "pending",
        fees,
        type: "international_transfer",
        completedAt: undefined,
      },
      clientIP,
      userAgent,
    )

    // Update user balance - DEDUCT the total amount (transfer + fees)
    const newBalance = user.balance - totalDebit
    const balanceUpdated = SecureDatabase.updateUserBalance(user.id, newBalance)

    if (!balanceUpdated) {
      return NextResponse.json({ error: "Failed to update balance" }, { status: 500 })
    }

    console.log(`User balance after: R${newBalance}`)
    console.log(`Transaction created with ID: ${transaction.id}`)

    // In a real system, you would:
    // 1. Send to payment processor
    // 2. Handle async processing
    // 3. Update status based on processor response

    // For demo, simulate processing after a delay
    setTimeout(() => {
      // Update transaction status to completed
      const allTransactions = SecureDatabase.getAllTransactions()
      const txn = allTransactions.find((t) => t.id === transaction.id)
      if (txn) {
        txn.status = "completed"
        txn.completedAt = new Date().toISOString()
        console.log(`Transaction ${transaction.id} marked as completed`)
      }
    }, 5000) // Complete after 5 seconds for demo

    return NextResponse.json({
      transactionId: transaction.id,
      status: "pending",
      message: "Transfer initiated successfully",
      newBalance: newBalance,
      amountDebited: totalDebit,
    })
  } catch (error) {
    console.error("International transfer error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
