"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { User, LogOut, Settings } from "lucide-react"
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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900">
            🎲 UOC DND 5e
          </h1>
          <span className="text-sm text-slate-600">
            Character Sheets & Campaign Management
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">
            Welcome, {displayName}
          </span>
          
          <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <User className="w-4 h-4" />
                Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Edit Profile
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">
                    Email cannot be changed
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
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
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  )
}
