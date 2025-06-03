import { type NextRequest, NextResponse } from "next/server"

const exchangeRates = {
  USD: 18.75,
  EUR: 20.45,
  GBP: 23.85,
  ZAR: 1.0,
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 })
    }

    const { amount, fromCurrency, toCurrency } = await request.json()

    if (!amount || !fromCurrency || !toCurrency) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // Get exchange rate
    const rate = exchangeRates[fromCurrency as keyof typeof exchangeRates]
    if (!rate) {
      return NextResponse.json({ error: "Unsupported currency" }, { status: 400 })
    }

    // Calculate converted amount
    const convertedAmount = amount * rate

    // Calculate fees
    let fees = 50
    if (convertedAmount > 1000) fees = 100
    if (convertedAmount > 10000) fees = 250
    if (convertedAmount > 50000) fees = Math.min(convertedAmount * 0.005, 500)

    return NextResponse.json({
      exchangeRate: rate,
      convertedAmount,
      fees,
      totalDebit: convertedAmount + fees,
    })
  } catch (error) {
    console.error("Exchange calculation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
