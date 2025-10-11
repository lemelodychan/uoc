"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Icon } from "@iconify/react"
import { ThemeToggleSimple } from "@/components/theme-toggle-simple"
import { LogoSVG } from "@/components/logo"
import type { User as SupabaseUser } from "@supabase/supabase-js"

export function AppHeader() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        // Get display name from user metadata or use email
        const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
        setDisplayName(name)
      }
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
        const name = session.user.user_metadata?.display_name || session.user.email?.split('@')[0] || 'User'
        setDisplayName(name)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const handleUpdateProfile = async () => {
    if (!user || !displayName.trim()) return

    setIsLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() }
      })

      if (error) {
        throw error
      }

      toast({
        title: "Profile Updated",
        description: "Your display name has been updated successfully.",
      })
      setIsProfileOpen(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/login'
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (!user) return null

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoSVG width={120} height={77} className="h-12 w-auto" />
          <span className="text-sm text-muted-foreground">
            Character Sheets & Campaign Management
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Welcome, {displayName}
          </span>
          
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Icon icon="lucide:user" className="w-4 h-4" />
                Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md p-0 gap-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <Icon icon="lucide:settings" className="w-5 h-5" />
                  Edit Profile
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-6 p-4 max-h-[70vh] overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
              </div>
              <DialogFooter className="p-4 border-t"> 
                <Button
                  variant="outline"
                  onClick={() => setIsProfileOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateProfile}
                  disabled={isLoading || !displayName.trim()}
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <Icon icon="lucide:log-out" className="w-4 h-4" />
            Sign Out
          </Button>

          <ThemeToggleSimple />
        </div>
      </div>
    </header>
  )
}
