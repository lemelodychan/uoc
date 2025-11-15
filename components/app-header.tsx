"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useTheme } from 'next-themes'
import { createClient } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Icon } from "@iconify/react"
import { ThemeToggleSimple } from "@/components/theme-toggle-simple"
import { LogoSVG } from "@/components/logo"
import { useUser } from "@/lib/user-context"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { Badge } from "./ui/badge"
import type { Campaign } from "@/lib/character-data"
import { loadAllCampaigns } from "@/lib/database"
import { cn, getCampaignLogoUrl } from "@/lib/utils"

interface AppHeaderProps {
  currentView?: 'campaign' | 'wiki' | 'management'
  onViewChange?: (view: 'campaign' | 'wiki' | 'management') => void
  campaigns?: Campaign[]
  selectedCampaignId?: string
  onCampaignSelect?: (campaignId: string) => void
}

export function AppHeader({ 
  currentView = 'campaign', 
  onViewChange,
  campaigns: campaignsProp,
  selectedCampaignId,
  onCampaignSelect
}: AppHeaderProps) {
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
  const [campaigns, setCampaigns] = useState<Campaign[]>(campaignsProp || [])
  const [isCampaignsMenuOpen, setIsCampaignsMenuOpen] = useState(false)
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { resolvedTheme } = useTheme()
  const { isSuperadmin } = useUser()
  const supabase = createClient()

  // Load campaigns when menu opens if not provided as prop
  useEffect(() => {
    if (isCampaignsMenuOpen && campaigns.length === 0 && !campaignsProp) {
      const loadCampaigns = async () => {
        setIsLoadingCampaigns(true)
        try {
          const { campaigns: loadedCampaigns, error } = await loadAllCampaigns()
          if (error) {
            console.error('Error loading campaigns:', error)
            toast({
              title: "Error",
              description: "Failed to load campaigns.",
              variant: "destructive",
            })
          } else if (loadedCampaigns) {
            setCampaigns(loadedCampaigns)
          }
        } catch (error) {
          console.error('Error loading campaigns:', error)
        } finally {
          setIsLoadingCampaigns(false)
        }
      }
      loadCampaigns()
    }
  }, [isCampaignsMenuOpen, campaigns.length, campaignsProp, toast])

  // Update campaigns when prop changes
  useEffect(() => {
    if (campaignsProp) {
      setCampaigns(campaignsProp)
    }
  }, [campaignsProp])

  // Split campaigns into active and inactive groups, prioritizing default campaign
  const { activeCampaigns, inactiveCampaigns } = useMemo(() => {
    const active = campaigns.filter(c => c.isActive).sort((a, b) => {
      // Default campaign always comes first
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      // Then sort alphabetically
      return a.name.localeCompare(b.name)
    })
    const inactive = campaigns.filter(c => !c.isActive).sort((a, b) => {
      // Default campaign always comes first (even if inactive)
      if (a.isDefault && !b.isDefault) return -1
      if (!a.isDefault && b.isDefault) return 1
      // Then sort alphabetically
      return a.name.localeCompare(b.name)
    })
    return { activeCampaigns: active, inactiveCampaigns: inactive }
  }, [campaigns])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isCampaignsMenuOpen &&
        menuRef.current &&
        headerRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !headerRef.current.contains(event.target as Node)
      ) {
        setIsCampaignsMenuOpen(false)
      }
    }

    if (isCampaignsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isCampaignsMenuOpen])

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
    <>
      <header ref={headerRef} className="bg-card border-b border-border px-6 py-2 relative z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div
            onClick={() => {
              setIsCampaignsMenuOpen(false)
              if (selectedCampaignId && selectedCampaignId !== "all" && selectedCampaignId !== "no-campaign") {
                onCampaignSelect?.(selectedCampaignId)
                onViewChange?.('campaign')
              }
            }}
            className="cursor-pointer"
          >
          <LogoSVG width={120} height={77} className="h-12 w-auto" />
          </div>
          
          {/* Navigation Menu */}
          <nav className="flex items-center gap-4">
            <Button
              variant={currentView === 'campaign' || isCampaignsMenuOpen ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setIsCampaignsMenuOpen(!isCampaignsMenuOpen)}
              className="flex items-center gap-2"
            >
              <Icon icon="iconoir:hexagon-dice" className="w-4 h-4" />
              Campaigns
            </Button>
            <Button
              variant={currentView === 'wiki' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setIsCampaignsMenuOpen(false)
                onViewChange?.('wiki')
              }}
              className="flex items-center gap-2"
            >
              <Icon icon="lucide:book-open-text" className="w-4 h-4" />
              Wiki
              <Badge variant="secondary" className="text-xs text-accent-foreground border-accent/50 bg-accent/70 py-0 px-1 ml-auto">
                Beta
              </Badge>
            </Button>
            {isSuperadmin && (
              <Button
                variant={currentView === 'management' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => {
                  setIsCampaignsMenuOpen(false)
                  onViewChange?.('management')
                }}
                className="flex items-center gap-2"
              >
                <Icon icon="lucide:settings" className="w-4 h-4" />
                Settings
              </Button>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Welcome, {displayName}
          </span>
          
          <Dialog open={isProfileOpen} onOpenChange={(open) => {
            setIsProfileOpen(open)
            if (open) setIsCampaignsMenuOpen(false)
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCampaignsMenuOpen(false)}
              >
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
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setIsCampaignsMenuOpen(false)
              handleSignOut()
            }}
          >
            <Icon icon="lucide:log-out" className="w-4 h-4" />
            Sign Out
          </Button>

          <div onClick={() => setIsCampaignsMenuOpen(false)}>
          <ThemeToggleSimple />
          </div>
        </div>
      </div>
    </header>
    
    {/* Mega Menu Drawer */}
    {isCampaignsMenuOpen && (
      <>
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setIsCampaignsMenuOpen(false)}
        />
        {/* Mega Menu Panel */}
        <div
          ref={menuRef}
          className={cn(
            "fixed left-0 right-0 bg-card border-b border-border shadow-lg z-50",
            "animate-in slide-in-from-top-2 fade-in-0 duration-200",
            "max-h-[calc(100vh-80px)] overflow-y-auto"
          )}
          style={{ top: headerRef.current?.offsetHeight || 57 }}
        >
          <div className="container p-6 w-full max-w-full">
            
            {isLoadingCampaigns ? (
              <div className="flex items-center justify-center py-2">
                <Icon icon="lucide:loader-2" className="w-6 h-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading campaigns...</span>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex items-center justify-center py-2">
                <span className="text-muted-foreground">No campaigns available</span>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Active Campaigns Section */}
                {activeCampaigns.length > 0 && (
                  <div className="flex flex-col gap-3">
                      {/* <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Icon icon="lucide:play" className="w-2 h-2 fill-current text-primary" />
                      Active Campaigns
                    </h3> */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {activeCampaigns.map((campaign) => {
                        const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
                        const logoUrl = getCampaignLogoUrl(campaign, theme)
                        
                        return (
                          <button
                            key={campaign.id}
                            onClick={() => {
                              onCampaignSelect?.(campaign.id)
                              onViewChange?.('campaign')
                              setIsCampaignsMenuOpen(false)
                            }}
                            className={cn(
                              "relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md",
                              "flex flex-col justify-center gap-1 group",
                              selectedCampaignId === campaign.id
                                ? "border-primary bg-primary/5 shadow-sm"
                                : "border-border hover:border-primary/50 bg-card"
                            )}
                          >
                            {logoUrl ? (
                              <>
                                {selectedCampaignId === campaign.id && (
                                  <Badge variant="default" className="absolute right-0 top-0 left-auto px-1.5 py-0.5 text-white text-xs uppercase rounded-none rounded-bl-lg">
                                  <Icon 
                                    icon="lucide:check-circle" 
                                    className="w-3 h-3" 
                                  />
                                  Active
                                  </Badge>
                                )}
                                <div className="w-full h-20 p-2 flex items-center justify-center overflow-hidden">
                                  <img 
                                    src={logoUrl} 
                                    alt={campaign.name}
                                    className="max-w-full max-h-full object-contain"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                    }}
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                {selectedCampaignId === campaign.id && (
                                  <Badge variant="default" className="absolute right-0 top-0 left-auto px-1.5 py-0.5 text-white text-xs uppercase rounded-none rounded-bl-lg">
                                  <Icon 
                                    icon="lucide:check-circle" 
                                    className="w-3 h-3" 
                                  />
                                  Active
                                  </Badge>
                                )}
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <h3 className="font-display text-xl font-bold truncate group-hover:text-primary transition-colors">
                                    {campaign.name}
                                  </h3>
                                </div>
                              </div>
                            )}
                            {campaign.description && !logoUrl ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {campaign.description}
                              </p>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Inactive Campaigns Section */}
                {inactiveCampaigns.length > 0 && (
                  <div className="flex flex-row justify-start items-start gap-4 border-t border-border pt-6 pb-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2 w-[240px]">
                      <Icon icon="lucide:archive" className="w-3 h-3 fill-none text-muted-foreground" />
                      Inactive Campaigns
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                      {inactiveCampaigns.map((campaign) => (
                        <button
                          key={campaign.id}
                          onClick={() => {
                            onCampaignSelect?.(campaign.id)
                            onViewChange?.('campaign')
                            setIsCampaignsMenuOpen(false)
                          }}
                          className={cn(
                            "relative text-left transition-all hover:cursor-pointer",
                            "flex flex-col gap-1 group",
                            selectedCampaignId === campaign.id
                              ? "text-primary hover:text-primary/50 hover:cursor-pointer"
                              : ""
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1 flex-1 min-w-0">
                              <Icon icon="lucide:chevron-right" className="w-3 h-3
                             fill-none text-muted-foreground" />
                              <h3 className="font-semibold text-sm text-base truncate group-hover:text-primary transition-colors">
                                {campaign.name}
                              </h3>
                            </div>
                          </div>
                          {campaign.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                              {campaign.description}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )}
    </>
  )
}
