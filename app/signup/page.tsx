"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { getRegistrationEnabled } from "@/lib/app-settings"
import { ROUTES } from "@/config/routes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import { LogoSVG } from "@/components/logo"

function SignupForm() {
  const searchParams = useSearchParams()
  // Optional campaign slug from a DM's invite link (/signup?campaign=<slug>).
  const campaign = searchParams.get("campaign")?.trim().toLowerCase() || ""
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [registrationEnabled, setRegistrationEnabled] = useState<boolean | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    getRegistrationEnabled().then(setRegistrationEnabled)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, campaign }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error || "Sign up failed. Please try again.")
      }
      setSubmitted(true)
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "An unexpected error occurred. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="align-center justify-center flex">
            <LogoSVG width={120} height={77} className="h-12 w-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {registrationEnabled === null ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : registrationEnabled === false ? (
            <div className="space-y-4 text-center">
              <p className="text-lg font-medium">Registration is currently closed</p>
              <p className="text-sm text-muted-foreground">
                New account sign-ups are disabled right now. Please contact an administrator if you need access.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={ROUTES.login}>Back to Sign In</Link>
              </Button>
            </div>
          ) : submitted ? (
            <div className="space-y-4 text-center">
              <Icon icon="lucide:mail-check" className="h-10 w-10 mx-auto text-primary" />
              <p className="text-lg font-medium">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a link to <span className="font-medium">{email}</span>. Click it to confirm your account
                and set a password.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href={ROUTES.login}>Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-semibold">Create your account</h1>
                <p className="text-sm text-muted-foreground">
                  Sign up with your email and pick a username. We&apos;ll email you a link to set a password.
                </p>
              </div>

              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={2}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!email || !username || isLoading}>
                  {isLoading ? (
                    <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon="lucide:user-plus" className="mr-2 h-4 w-4" />
                  )}
                  Create Account
                </Button>
              </form>

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link href={ROUTES.login} className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  )
}
