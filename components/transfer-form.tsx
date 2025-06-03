"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Send, Calculator, AlertTriangle, CheckCircle, Plus, Minus } from "lucide-react"
import { SecurityPatterns, validateInput, sanitizeInput, validateSouthAfricanBank } from "@/lib/security"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  accountNumber: string
  balance: number
}

interface TransferFormProps {
  user: User
  onTransferComplete: () => void
}

const currencies = [
  { code: "USD", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", flag: "🇬🇧" },
  { code: "ZAR", name: "South African Rand", flag: "🇿🇦" },
]

const southAfricanBanks = [
  { code: "ABSAZAJJ", name: "Absa Bank" },
  { code: "FIRNZAJJ", name: "First National Bank (FNB)" },
  { code: "NEDSZAJJ", name: "Nedbank" },
  { code: "SBZAZAJJ", name: "Standard Bank" },
  { code: "CABLZAJJ", name: "Capitec Bank" },
  { code: "INVEZAJJ", name: "Investec Bank" },
  { code: "AFRCZAJJ", name: "African Bank" },
  { code: "BIDVZAJJ", name: "Bidvest Bank" },
]

export function TransferForm({ user, onTransferComplete }: TransferFormProps) {
  const [activeTab, setActiveTab] = useState<"transfer" | "deposit" | "withdraw">("transfer")

  // Transfer form state
  const [transferData, setTransferData] = useState({
    recipientName: "",
    recipientEmail: "",
    recipientBank: "",
    recipientAccount: "",
    amount: "",
    currency: "USD",
    reference: "",
    purpose: "",
  })

  // Deposit/Withdrawal form state
  const [transactionData, setTransactionData] = useState({
    amount: "",
    reference: "",
    method: "",
  })

  const [exchangeRate, setExchangeRate] = useState<number | null>(null)
  const [zarAmount, setZarAmount] = useState<number | null>(null)
  const [fees, setFees] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const calculateExchange = async () => {
    if (!transferData.amount || !transferData.currency) return

    const amount = Number.parseFloat(transferData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount")
      return
    }

    setCalculating(true)
    setError("")

    try {
      const response = await fetch("/api/exchange/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount,
          fromCurrency: transferData.currency,
          toCurrency: "ZAR",
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setExchangeRate(data.exchangeRate)
        setZarAmount(data.convertedAmount)
        setFees(data.fees)
      } else {
        setError(data.error || "Failed to calculate exchange rate")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setCalculating(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    // Validation
    if (!validateInput(transferData.recipientName, SecurityPatterns.name)) {
      setError("Please enter a valid recipient name")
      setLoading(false)
      return
    }

    if (!validateInput(transferData.recipientEmail, SecurityPatterns.email)) {
      setError("Please enter a valid recipient email")
      setLoading(false)
      return
    }

    if (!validateInput(transferData.recipientAccount, SecurityPatterns.accountNumber)) {
      setError("Please enter a valid 10-digit account number")
      setLoading(false)
      return
    }

    if (!validateInput(transferData.reference, SecurityPatterns.reference)) {
      setError("Please enter a valid reference (1-35 characters)")
      setLoading(false)
      return
    }

    if (!validateSouthAfricanBank(transferData.recipientBank)) {
      setError("Please select a valid South African bank")
      setLoading(false)
      return
    }

    const amount = Number.parseFloat(transferData.amount)
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      setError("Amount must be between 0.01 and 1,000,000")
      setLoading(false)
      return
    }

    if (!zarAmount || !fees) {
      setError("Please calculate exchange rate first")
      setLoading(false)
      return
    }

    const totalDebit = zarAmount + fees
    if (totalDebit > user.balance) {
      setError(`Insufficient balance. Required: R${totalDebit.toFixed(2)}, Available: R${user.balance.toFixed(2)}`)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/transfer/international", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          recipientName: sanitizeInput(transferData.recipientName),
          recipientEmail: sanitizeInput(transferData.recipientEmail),
          recipientBank: transferData.recipientBank,
          recipientAccount: sanitizeInput(transferData.recipientAccount),
          amount,
          currency: transferData.currency,
          reference: sanitizeInput(transferData.reference),
          purpose: sanitizeInput(transferData.purpose),
          exchangeRate,
          zarAmount,
          fees,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          `Transfer initiated successfully! Transaction ID: ${data.transactionId}. New balance: R${data.newBalance.toFixed(2)}`,
        )
        setTransferData({
          recipientName: "",
          recipientEmail: "",
          recipientBank: "",
          recipientAccount: "",
          amount: "",
          currency: "USD",
          reference: "",
          purpose: "",
        })
        setExchangeRate(null)
        setZarAmount(null)
        setFees(null)

        // Trigger refresh with a small delay to ensure backend is updated
        setTimeout(() => {
          onTransferComplete()
        }, 1000)
      } else {
        setError(data.error || "Transfer failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const amount = Number.parseFloat(transactionData.amount)
    if (isNaN(amount) || amount <= 0 || amount > 500000) {
      setError("Deposit amount must be between R0.01 and R500,000")
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/transactions/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount,
          reference: sanitizeInput(transactionData.reference),
          depositMethod: transactionData.method,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          `Deposit completed successfully! Transaction ID: ${data.transactionId}. New balance: R${data.newBalance.toFixed(2)}`,
        )
        setTransactionData({ amount: "", reference: "", method: "" })

        // Trigger refresh with a small delay
        setTimeout(() => {
          onTransferComplete()
        }, 1000)
      } else {
        setError(data.error || "Deposit failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    const amount = Number.parseFloat(transactionData.amount)
    if (isNaN(amount) || amount <= 0 || amount > 50000) {
      setError("Withdrawal amount must be between R0.01 and R50,000")
      setLoading(false)
      return
    }

    const withdrawalFee = Math.min(amount * 0.001, 50)
    const totalDebit = amount + withdrawalFee

    if (totalDebit > user.balance) {
      setError(`Insufficient balance. Required: R${totalDebit.toFixed(2)}, Available: R${user.balance.toFixed(2)}`)
      setLoading(false)
      return
    }

    try {
      const response = await fetch("/api/transactions/withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          amount,
          reference: sanitizeInput(transactionData.reference),
          withdrawalMethod: transactionData.method,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          `Withdrawal completed successfully! Transaction ID: ${data.transactionId}. New balance: R${data.newBalance.toFixed(2)}`,
        )
        setTransactionData({ amount: "", reference: "", method: "" })

        // Trigger refresh with a small delay
        setTimeout(() => {
          onTransferComplete()
        }, 1000)
      } else {
        setError(data.error || "Withdrawal failed")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number, currency = "ZAR") => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Banking Operations</CardTitle>
            <CardDescription>Manage your account with secure banking operations</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("transfer")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "transfer" ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Send className="h-4 w-4 inline mr-2" />
                Transfer
              </button>
              <button
                onClick={() => setActiveTab("deposit")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "deposit" ? "bg-white text-green-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Deposit
              </button>
              <button
                onClick={() => setActiveTab("withdraw")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "withdraw" ? "bg-white text-red-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Minus className="h-4 w-4 inline mr-2" />
                Withdraw
              </button>
            </div>

            {/* Transfer Form */}
            {activeTab === "transfer" && (
              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Recipient Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientName">Full Name</Label>
                      <Input
                        id="recipientName"
                        value={transferData.recipientName}
                        onChange={(e) => setTransferData({ ...transferData, recipientName: e.target.value })}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientEmail">Email Address</Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={transferData.recipientEmail}
                        onChange={(e) => setTransferData({ ...transferData, recipientEmail: e.target.value })}
                        placeholder="john.doe@example.com"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipientBank">Bank</Label>
                      <Select
                        value={transferData.recipientBank}
                        onValueChange={(value) => setTransferData({ ...transferData, recipientBank: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select bank" />
                        </SelectTrigger>
                        <SelectContent>
                          {southAfricanBanks.map((bank) => (
                            <SelectItem key={bank.code} value={bank.code}>
                              {bank.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recipientAccount">Account Number</Label>
                      <Input
                        id="recipientAccount"
                        value={transferData.recipientAccount}
                        onChange={(e) => setTransferData({ ...transferData, recipientAccount: e.target.value })}
                        placeholder="1234567890"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Transfer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="1000000"
                        value={transferData.amount}
                        onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                        placeholder="1000.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={transferData.currency}
                        onValueChange={(value) => setTransferData({ ...transferData, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.flag} {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reference">Payment Reference</Label>
                      <Input
                        id="reference"
                        value={transferData.reference}
                        onChange={(e) => setTransferData({ ...transferData, reference: e.target.value })}
                        placeholder="Invoice payment"
                        maxLength={35}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purpose">Purpose (Optional)</Label>
                      <Input
                        id="purpose"
                        value={transferData.purpose}
                        onChange={(e) => setTransferData({ ...transferData, purpose: e.target.value })}
                        placeholder="Business payment"
                        maxLength={50}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={calculateExchange}
                    disabled={!transferData.amount || !transferData.currency || calculating}
                    className="w-full md:w-auto"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {calculating ? "Calculating..." : "Calculate Exchange Rate"}
                  </Button>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={loading || !zarAmount || zarAmount + (fees || 0) > user.balance}
                  className="w-full"
                >
                  {loading ? "Processing Transfer..." : "Send Transfer"}
                </Button>
              </form>
            )}

            {/* Deposit Form */}
            {activeTab === "deposit" && (
              <form onSubmit={handleDeposit} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Deposit Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="depositAmount">Amount (ZAR)</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="500000"
                        value={transactionData.amount}
                        onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                        placeholder="1000.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depositMethod">Deposit Method</Label>
                      <Select
                        value={transactionData.method}
                        onValueChange={(value) => setTransactionData({ ...transactionData, method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cash_deposit">Cash Deposit</SelectItem>
                          <SelectItem value="cheque">Cheque Deposit</SelectItem>
                          <SelectItem value="eft">EFT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositReference">Reference (Optional)</Label>
                    <Input
                      id="depositReference"
                      value={transactionData.reference}
                      onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
                      placeholder="Salary deposit"
                      maxLength={35}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Processing Deposit..." : "Deposit Funds"}
                </Button>
              </form>
            )}

            {/* Withdrawal Form */}
            {activeTab === "withdraw" && (
              <form onSubmit={handleWithdrawal} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Withdraw Funds</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdrawAmount">Amount (ZAR)</Label>
                      <Input
                        id="withdrawAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="50000"
                        value={transactionData.amount}
                        onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                        placeholder="1000.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="withdrawMethod">Withdrawal Method</Label>
                      <Select
                        value={transactionData.method}
                        onValueChange={(value) => setTransactionData({ ...transactionData, method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="atm">ATM Withdrawal</SelectItem>
                          <SelectItem value="bank_counter">Bank Counter</SelectItem>
                          <SelectItem value="eft_transfer">EFT Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="withdrawReference">Reference (Optional)</Label>
                    <Input
                      id="withdrawReference"
                      value={transactionData.reference}
                      onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
                      placeholder="Cash withdrawal"
                      maxLength={35}
                    />
                  </div>

                  {transactionData.amount && (
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Withdrawal Fee:</strong> R
                        {Math.min(Number.parseFloat(transactionData.amount || "0") * 0.001, 50).toFixed(2)}
                      </p>
                      <p className="text-sm text-yellow-800">
                        <strong>Total Debit:</strong> R
                        {(
                          Number.parseFloat(transactionData.amount || "0") +
                          Math.min(Number.parseFloat(transactionData.amount || "0") * 0.001, 50)
                        ).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Processing Withdrawal..." : "Withdraw Funds"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Balance and Summary Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(user.balance)}</div>
            <p className="text-sm text-gray-500">Available for transactions</p>
          </CardContent>
        </Card>

        {/* Exchange Rate Summary for Transfers */}
        {activeTab === "transfer" && exchangeRate && zarAmount && fees && (
          <Card>
            <CardHeader>
              <CardTitle>Exchange Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Exchange Rate:</span>
                <span className="font-medium">
                  1 {transferData.currency} = {formatCurrency(exchangeRate)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Amount to Send:</span>
                <span className="font-medium">
                  {transferData.currency} {Number.parseFloat(transferData.amount || "0").toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ZAR Equivalent:</span>
                <span className="font-medium">{formatCurrency(zarAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Transfer Fee:</span>
                <span className="font-medium">{formatCurrency(fees)}</span>
              </div>

              <hr />

              <div className="flex justify-between">
                <span className="font-medium">Total Debit:</span>
                <span className="font-bold text-lg">{formatCurrency(zarAmount + fees)}</span>
              </div>

              {zarAmount + fees > user.balance && (
                <Badge variant="destructive" className="w-full justify-center">
                  Insufficient Balance
                </Badge>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction Limits */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeTab === "transfer" && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Daily Transfer Limit:</span>
                  <span className="font-medium">{formatCurrency(100000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Monthly Transfer Limit:</span>
                  <span className="font-medium">{formatCurrency(1000000)}</span>
                </div>
              </>
            )}
            {activeTab === "deposit" && (
              <div className="flex justify-between text-sm">
                <span>Daily Deposit Limit:</span>
                <span className="font-medium">{formatCurrency(500000)}</span>
              </div>
            )}
            {activeTab === "withdraw" && (
              <>
                <div className="flex justify-between text-sm">
                  <span>Daily Withdrawal Limit:</span>
                  <span className="font-medium">{formatCurrency(50000)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Withdrawal Fee:</span>
                  <span className="font-medium">0.1% (max R50)</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
