"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase"
import { updateLastLogin } from "@/lib/database"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import { LogoSVG } from "@/components/logo"

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function LoginModal({ open, onOpenChange, onSuccess }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authMethod, setAuthMethod] = useState<"magic-link" | "password" | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const supabase = createClient()

  const resetForm = () => {
    setEmail("")
    setPassword("")
    setAuthMethod(null)
    setMessage(null)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) resetForm()
    onOpenChange(open)
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false,
        },
      })
      if (error) {
        const isNotFound = error.message.toLowerCase().includes("user") || error.status === 422 || error.status === 400
        setMessage({
          type: "error",
          text: isNotFound
            ? "New account registration is currently disabled. Please contact an administrator if you need access."
            : error.message,
        })
      } else {
        setMessage({ type: "success", text: "Check your email for the magic link!" })
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        try { await updateLastLogin() } catch {}
        onOpenChange(false)
        resetForm()
        onSuccess?.()
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b text-center">
          <DialogTitle className="flex justify-center">
            <LogoSVG width={120} height={77} className="h-12 w-auto" />
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-6 flex flex-col gap-4">
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {!authMethod ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Button
                  onClick={() => setAuthMethod("magic-link")}
                  className="w-full"
                  variant="outline"
                  disabled={!email || isLoading}
                >
                  <Icon icon="lucide:mail" className="mr-2 h-4 w-4" />
                  Send Magic Link
                </Button>
                <Button
                  onClick={() => setAuthMethod("password")}
                  className="w-full"
                  variant="outline"
                  disabled={!email || isLoading}
                >
                  <Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
                  Sign in with Password
                </Button>
              </div>
            </div>
          ) : authMethod === "magic-link" ? (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-email-magic">Email</Label>
                <Input
                  id="modal-email-magic"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setAuthMethod(null)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={!email || isLoading}>
                  {isLoading ? <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" /> : <Icon icon="lucide:mail" className="h-4 w-4" />}
                  Send Magic Link
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="modal-email-password">Email</Label>
                <Input
                  id="modal-email-password"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-password">Password</Label>
                <Input
                  id="modal-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={() => setAuthMethod(null)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={!email || !password || isLoading}>
                  {isLoading ? <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" /> : <Icon icon="lucide:arrow-right" className="h-4 w-4" />}
                  Sign In
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
