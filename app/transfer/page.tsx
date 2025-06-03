"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TransferForm } from "@/components/transfer-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Shield } from "lucide-react"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  accountNumber: string
  balance: number
}

export default function TransferPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/")
      return
    }

    fetchUserData(token)
  }, [router])

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
      } else {
        localStorage.removeItem("token")
        router.push("/")
      }
    } catch (error) {
      console.error("Failed to load user data:", error)
      router.push("/")
    } finally {
      setLoading(false)
    }
  }

  const handleTransferComplete = () => {
    // Refresh user data to update balance
    const token = localStorage.getItem("token")
    if (token) {
      fetchUserData(token)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading transfer page...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="bg-blue-600 p-2 rounded-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">International Transfer</h1>
                <p className="text-sm text-gray-500">Send money globally with competitive rates</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Account: {user.accountNumber}</p>
              <p className="text-sm font-medium text-gray-900">
                {user.firstName} {user.lastName}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TransferForm user={user} onTransferComplete={handleTransferComplete} />
      </div>
    </div>
  )
}
