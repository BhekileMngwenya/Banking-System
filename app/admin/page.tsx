"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Users,
  UserPlus,
  Shield,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { ValidationPatterns, validateInput, sanitizeInput } from "@/lib/validation"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  accountNumber: string
  balance: number
  isActive: boolean
  createdAt: string
  lastLogin?: string
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
  status: string
  createdAt: string
  type: string
  fees: number
}

export default function AdminDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  // Create user form state
  const [newUser, setNewUser] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    initialBalance: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }

    verifyAdminAccess(token)
    fetchUsers(token)
    fetchAllTransactions(token)
  }, [router])

  const verifyAdminAccess = async (token: string) => {
    try {
      const response = await fetch("/api/auth/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.user.role !== "admin") {
          router.push("/dashboard")
          return
        }
        setCurrentUser(data.user)
      } else {
        localStorage.removeItem("token")
        router.push("/")
      }
    } catch (error) {
      setError("Failed to verify admin access")
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async (token: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        console.log("Admin fetched users:", data.users.length)
      } else {
        console.error("Failed to fetch users:", await response.text())
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    }
  }

  const fetchAllTransactions = async (token: string) => {
    try {
      const response = await fetch("/api/admin/transactions", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions)
        console.log("Admin fetched transactions:", data.transactions.length)
      } else {
        console.error("Failed to fetch transactions:", await response.text())
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    const token = localStorage.getItem("token")
    if (token) {
      await Promise.all([fetchUsers(token), fetchAllTransactions(token)])
    }
    setRefreshing(false)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Validation
    if (!validateInput(newUser.email, ValidationPatterns.email)) {
      setError("Please enter a valid email address")
      return
    }

    if (!validateInput(newUser.firstName, ValidationPatterns.name)) {
      setError("First name must be 2-50 characters, letters only")
      return
    }

    if (!validateInput(newUser.lastName, ValidationPatterns.name)) {
      setError("Last name must be 2-50 characters, letters only")
      return
    }

    if (!validateInput(newUser.password, ValidationPatterns.password)) {
      setError("Password must be at least 8 characters with uppercase, lowercase, number and special character")
      return
    }

    const balance = Number.parseFloat(newUser.initialBalance)
    if (isNaN(balance) || balance < 0) {
      setError("Initial balance must be a valid positive number")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: sanitizeInput(newUser.email),
          firstName: sanitizeInput(newUser.firstName),
          lastName: sanitizeInput(newUser.lastName),
          password: newUser.password,
          initialBalance: balance,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setUsers([...users, data.user])
        setNewUser({
          email: "",
          firstName: "",
          lastName: "",
          password: "",
          initialBalance: "",
        })
        setShowCreateUser(false)
        setError("")

        // Refresh data to get updated statistics
        await refreshData()
      } else {
        setError(data.error || "Failed to create user")
      }
    } catch (error) {
      setError("Network error. Please try again.")
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch("/api/admin/toggle-user-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          isActive: !currentStatus,
        }),
      })

      if (response.ok) {
        setUsers(users.map((user) => (user.id === userId ? { ...user, isActive: !currentStatus } : user)))
      }
    } catch (error) {
      console.error("Failed to toggle user status:", error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    router.push("/")
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency: "ZAR",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  // Calculate real statistics from actual data
  const totalUsers = users.length
  const activeUsers = users.filter((u) => u.isActive).length
  const totalTransactions = transactions.length
  const completedTransactions = transactions.filter((t) => t.status === "completed").length
  const totalVolume = transactions.filter((t) => t.status === "completed").reduce((sum, t) => sum + t.amountInZAR, 0)
  const successRate = totalTransactions > 0 ? Math.round((completedTransactions / totalTransactions) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Admin Portal</h1>
                <p className="text-sm text-gray-500">System Administration</p>
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
                <p className="text-sm font-medium text-gray-900">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-sm text-gray-500">Administrator</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">{activeUsers} active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions}</div>
              <p className="text-xs text-muted-foreground">{completedTransactions} completed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transaction Volume</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalVolume)}</div>
              <p className="text-xs text-muted-foreground">Total processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{successRate}%</div>
              <p className="text-xs text-muted-foreground">Transaction success</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeUsers}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="transactions">Transaction Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">User Management</h2>
              <Dialog open={showCreateUser} onOpenChange={setShowCreateUser}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Create a new customer account with initial balance</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={newUser.firstName}
                          onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                          placeholder="John"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={newUser.lastName}
                          onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                          placeholder="Doe"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        placeholder="john.doe@example.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={newUser.password}
                          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                          placeholder="Secure password"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="initialBalance">Initial Balance (ZAR)</Label>
                      <Input
                        id="initialBalance"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newUser.initialBalance}
                        onChange={(e) => setNewUser({ ...newUser, initialBalance: e.target.value })}
                        placeholder="10000.00"
                        required
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button type="button" variant="outline" onClick={() => setShowCreateUser(false)}>
                        Cancel
                      </Button>
                      <Button type="submit">Create User</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Customer Accounts</CardTitle>
                <CardDescription>Manage customer accounts and access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          <p className="text-xs text-gray-400">Account: {user.accountNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">{formatCurrency(user.balance)}</p>
                          <p className="text-xs text-gray-500">
                            Created: {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <Button variant="outline" size="sm" onClick={() => toggleUserStatus(user.id, user.isActive)}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No users found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Monitoring</CardTitle>
                <CardDescription>Monitor all system transactions in real-time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          {transaction.status === "completed" && <CheckCircle className="h-4 w-4 text-green-500" />}
                          {transaction.status === "pending" && <Clock className="h-4 w-4 text-yellow-500" />}
                          {transaction.status === "failed" && <XCircle className="h-4 w-4 text-red-500" />}
                          <div>
                            <p className="font-medium">{transaction.recipientName}</p>
                            <p className="text-sm text-gray-500">From: {transaction.fromAccountNumber}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            transaction.status === "completed"
                              ? "default"
                              : transaction.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium">{transaction.type.replace("_", " ")}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium">{new Date(transaction.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      {transaction.fees > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          <strong>Fees:</strong> {formatCurrency(transaction.fees)}
                        </div>
                      )}
                    </div>
                  ))}
                  {transactions.length === 0 && (
                    <div className="text-center py-8">
                      <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No transactions found</p>
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
