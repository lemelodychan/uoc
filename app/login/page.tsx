"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import { updateLastLogin } from "@/lib/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import { LogoSVG } from "@/components/logo"

function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [authMethod, setAuthMethod] = useState<"magic-link" | "password" | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(true) // Start with true to show loading immediately
  const [isInitialCheck, setIsInitialCheck] = useState(true) // Track if we've done initial auth check
  
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Check for auth callback errors and handle authentication state
  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    let checkInterval: NodeJS.Timeout | null = null

    const checkAuthState = async () => {
      const error = searchParams.get("error")
      
      // Handle error from auth callback
      if (error === "auth_callback_error") {
        setIsAuthenticating(false)
        setIsInitialCheck(false)
        setMessage({
          type: "error",
          text: "Authentication failed. Please try again or use password login."
        })
        // Clean up URL
        router.replace("/login", { scroll: false })
        return
      }

      // Immediately check if already logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace("/")
        return
      }

      // If no user found, stop showing loading state and show login form
      setIsAuthenticating(false)
      setIsInitialCheck(false)

      // Set up auth state listener to detect when user becomes authenticated
      // This handles the case where magic link authentication completes
      const {
        data: { subscription: authSubscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === "SIGNED_IN" && session) {
          setIsAuthenticating(true)
          // Small delay to ensure cookies are set
          setTimeout(() => {
            router.replace("/")
            router.refresh()
          }, 100)
        }
      })

      subscription = authSubscription

      // Fallback: periodically check if user becomes authenticated
      // This handles edge cases where auth state change might not fire
      checkInterval = setInterval(async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
          setIsAuthenticating(true)
          if (checkInterval) {
            clearInterval(checkInterval)
          }
          router.replace("/")
          router.refresh()
        }
      }, 500) // Check more frequently

      // Stop checking after 5 seconds to avoid infinite polling
      setTimeout(() => {
        if (checkInterval) {
          clearInterval(checkInterval)
          checkInterval = null
        }
      }, 5000)
    }
    
    checkAuthState()

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
      if (checkInterval) {
        clearInterval(checkInterval)
      }
    }
  }, [router, searchParams, supabase])

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        setMessage({ 
          type: "success", 
          text: "Check your email for the magic link!" 
        })
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: "An unexpected error occurred. Please try again." 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage({ type: "error", text: error.message })
      } else {
        // Update last_login timestamp on authentication
        try { await updateLastLogin() } catch {}
        router.push("/")
        router.refresh()
      }
    } catch (error) {
      setMessage({ 
        type: "error", 
        text: "An unexpected error occurred. Please try again." 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  // Show loading state when authenticating or during initial check
  if (isAuthenticating || isInitialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="align-center justify-center flex">
              <LogoSVG width={120} height={77} className="h-12 w-auto" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4 py-8">
              <Icon icon="lucide:loader-2" className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Letting you in...</p>
                <p className="text-sm text-muted-foreground">
                  Please wait while we log you in. You'll be redirected shortly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {!authMethod ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                <Label htmlFor="email-magic">Email</Label>
                <Input
                  id="email-magic"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuthMethod(null)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!email || isLoading}
                >
                  {isLoading ? (
                    <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon="lucide:mail" className="h-4 w-4" />
                  )}
                  Send Magic Link
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSignIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-password">Email</Label>
                <Input
                  id="email-password"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAuthMethod(null)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={!email || !password || isLoading}
                >
                  {isLoading ? (
                    <Icon icon="lucide:loader-2" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon icon="lucide:arrow-right" className="h-4 w-4" />
                  )}
                  Sign In
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">
              🎲 UOC DND 5e
            </CardTitle>
            <CardDescription>
              Loading...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
