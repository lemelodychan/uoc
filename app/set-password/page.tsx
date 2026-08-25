"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import { LogoSVG } from "@/components/logo"

const MIN_PASSWORD_LENGTH = 8

export default function SetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Requires an active session (arrived via the magic/recovery link). If there's
  // no session, the link is missing/expired — send them to sign in.
  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) {
        router.replace("/login")
        return
      }
      setCheckingSession(false)
    }
    check()
    return () => {
      cancelled = true
    }
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` })
      return
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." })
      return
    }

    setIsLoading(true)
    try {
      // 1. Set the password on the auth user.
      const { error: pwError } = await supabase.auth.updateUser({ password })
      if (pwError) {
        throw new Error(pwError.message)
      }

      // 2. Finish signup server-side (promote to editor + clear needs_password).
      //    No-op for existing users / password resets. `promoted` is true only
      //    for a genuine first-time signup.
      const promoted = await fetch("/api/auth/complete-signup", { method: "POST" })
        .then((res) => res.json())
        .then((data) => data?.promoted === true)
        .catch(() => false)

      // 3. Refresh the local session so the cleared needs_password flag is
      //    reflected and the set-password guard stops redirecting here.
      await supabase.auth.refreshSession().catch(() => {})

      // First-time signups land on the general campaigns landing page (not a
      // specific campaign) so they can pick where to go. Existing users doing a
      // password reset go through the normal home redirect to their active campaign.
      router.replace(promoted ? "/?welcome=1" : "/")
      router.refresh()
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "An unexpected error occurred. Please try again." })
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
          {checkingSession ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-semibold">Set your password</h1>
                <p className="text-sm text-muted-foreground">
                  Choose a password to finish. Afterwards you can sign in with your password or a magic link.
                </p>
              </div>

              {message && (
                <Alert variant={message.type === "error" ? "destructive" : "default"}>
                  <AlertDescription>{message.text}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!password || !confirm || isLoading}>
                  {isLoading ? (
                    <Icon icon="lucide:loader-2" className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
                  )}
                  Set Password &amp; Continue
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
