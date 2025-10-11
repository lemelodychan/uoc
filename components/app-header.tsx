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
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
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

  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      // First verify the current password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || "",
        password: passwordData.currentPassword,
      })

      if (signInError) {
        throw new Error("Current password is incorrect")
      }

      // If sign in successful, update the password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (updateError) {
        throw updateError
      }

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      })
      
      // Reset password form
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
      setShowPasswordChange(false)
    } catch (error) {
      console.error('Error changing password:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password. Please try again.",
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

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Password</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPasswordChange(!showPasswordChange)}
                    >
                      {showPasswordChange ? "Cancel" : "Change Password"}
                    </Button>
                  </div>
                  
                  {showPasswordChange && (
                    <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/50">
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="currentPassword">Current Password</Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          placeholder="Enter current password"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          placeholder="Enter new password"
                        />
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          placeholder="Confirm new password"
                        />
                      </div>
                      
                      <Button
                        type="button"
                        onClick={handlePasswordChange}
                        disabled={isLoading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="w-full"
                      >
                        {isLoading ? "Updating..." : "Update Password"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter className="p-4 border-t"> 
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsProfileOpen(false)
                    setShowPasswordChange(false)
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: ""
                    })
                  }}
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
