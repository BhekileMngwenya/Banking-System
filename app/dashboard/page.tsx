"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Send,
  History,
  TrendingUp,
  Shield,
  LogOut,
  Banknote,
  Globe,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TransferForm } from "@/components/transfer-form"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  accountNumber: string
  balance: number
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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        console.log("User data refreshed, balance:", data.user.balance)
      } else {
        localStorage.removeItem("token")
        router.push("/")
      }
    } catch (error) {
      setError("Failed to load user data")
    } finally {
      setLoading(false)
    }
  }

  const fetchTransactions = async (token: string) => {
    try {
      console.log("Fetching transactions...")
      const response = await fetch("/api/transactions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        // Add cache busting parameter to prevent caching
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        console.log(`Fetched ${data.transactions.length} transactions`)
        setTransactions(data.transactions)
      } else {
        console.error("Failed to fetch transactions:", await response.text())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    }
  }

  // Add a refresh function for both user data and transactions
  const refreshData = async () => {
    setRefreshing(true)
    const token = localStorage.getItem("token")
    if (token) {
      await Promise.all([fetchUserData(token), fetchTransactions(token)])
    }
    setRefreshing(false)
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const formatCurrency = (amount: number, currency = "ZAR") => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "cancelled":
        return <AlertCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "failed":
        return "bg-red-100 text-red-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }

    fetchUserData(token)
    fetchTransactions(token)
  }, [router])

  useEffect(() => {
    // Refresh user data and transactions every 30 seconds
    const interval = setInterval(() => {
      const token = localStorage.getItem("token")
      if (token && user) {
        fetchUserData(token)
        fetchTransactions(token)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalBalance = user.balance
  const completedTransactions = transactions.filter((t) => t.status === "completed")
  const pendingTransactions = transactions.filter((t) => t.status === "pending")
  const monthlyTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.createdAt)
    const currentDate = new Date()
    return (
      transactionDate.getMonth() === currentDate.getMonth() &&
      transactionDate.getFullYear() === currentDate.getFullYear()
    )
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">SecureBank Portal</h1>
                <p className="text-sm text-gray-500">Welcome back, {user.firstName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh"}
              </Button>
              <div className="text-right">
                <p className="text-sm text-gray-500">Account: {user.accountNumber}</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground">South African Rand</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Transfers</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedTransactions.length}</div>
              <p className="text-xs text-muted-foreground">All time transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Transfers</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlyTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Transactions this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transfer">New Transfer</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Globe className="h-5 w-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription>Common banking operations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/transfer")}>
                    <Send className="h-4 w-4 mr-2" />
                    International Transfer
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/exchange")}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Currency Exchange
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => router.push("/statements")}>
                    <History className="h-4 w-4 mr-2" />
                    Download Statements
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Transactions</CardTitle>
                    <CardDescription>Your latest 5 transactions</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchTransactions(localStorage.getItem("token")!)}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="sr-only">Refresh</span>
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {transactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(transaction.status)}
                          <div>
                            <p className="font-medium text-sm">{transaction.recipientName}</p>
                            <p className="text-xs text-gray-500">{transaction.reference}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-sm">{formatCurrency(transaction.amountInZAR)}</p>
                          <Badge className={`text-xs ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && <p className="text-center text-gray-500 py-4">No transactions yet</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transfer">
            <TransferForm
              user={user}
              onTransferComplete={() => {
                // Refresh both user data and transactions
                const token = localStorage.getItem("token")
                if (token) {
                  fetchUserData(token)
                  fetchTransactions(token)
                }
              }}
            />
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>Complete history of all your transactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchTransactions(localStorage.getItem("token")!)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <div key={transaction.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(transaction.status)}
                            <div>
                              <p className="font-medium">{transaction.recipientName}</p>
                              <p className="text-sm text-gray-500">
                                {transaction.type === "deposit"
                                  ? "Deposit"
                                  : transaction.type === "withdrawal"
                                    ? "Withdrawal"
                                    : transaction.recipientBank}
                              </p>
                            </div>
                          </div>
                          <Badge className={getStatusColor(transaction.status)}>{transaction.status}</Badge>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Amount</p>
                            <p className="font-medium">
                              {transaction.currency} {transaction.amount.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">ZAR Amount</p>
                            <p className="font-medium">{formatCurrency(transaction.amountInZAR)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Reference</p>
                            <p className="font-medium">{transaction.reference}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Date</p>
                            <p className="font-medium">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm">
                          <p className="text-gray-500">
                            <strong>Type:</strong>{" "}
                            {transaction.type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                            {transaction.fees > 0 && ` • Fee: ${formatCurrency(transaction.fees)}`}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No transactions found</p>
                      <p className="text-gray-400 text-sm mt-2">Try making a deposit or transfer</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
