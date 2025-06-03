"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Lock, Globe, CreditCard } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    // Basic validation
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      setLoading(false)
      return
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    try {
      console.log("Attempting login with:", { email })

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      })

      console.log("Response status:", response.status)

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Non-JSON response:", text)
        setError("Server error. Please try again.")
        setLoading(false)
        return
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (response.ok) {
        localStorage.setItem("token", data.token)
        if (data.user.role === "admin") {
          router.push("/admin")
        } else {
          router.push("/dashboard")
        }
      } else {
        setError(data.error || "Login failed")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">SecureBank</h1>
          <p className="text-gray-600 mt-2">International Payments Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Secure Login</CardTitle>
            <CardDescription>Access your international banking portal</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.example@gmail.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Demo Credentials:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>
                  <strong>Admin:</strong> your.example@gmail.com / AdminPass123!
                </p>
                <p>
                  <strong>Customer:</strong> john.doe@example.com / Customer123!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 text-center text-sm text-gray-600">
          <div className="flex items-center justify-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>256-bit SSL</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Globe className="h-4 w-4" />
            <span>Global Transfers</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <CreditCard className="h-4 w-4" />
            <span>SA Banking</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Bank Grade Security</span>
          </div>
        </div>
      </div>
    </div>
  )
}
