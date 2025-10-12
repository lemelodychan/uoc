"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { UserProfile, PermissionLevel } from "@/lib/user-profiles"
import { getCurrentUserProfile, updateUserProfile } from "@/lib/database"
import { isSuperadmin } from "@/lib/user-roles"

interface UserProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>("editor")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load user profile when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { profile: userProfile, error: profileError } = await getCurrentUserProfile()
      
      if (profileError) {
        setError(profileError)
        return
      }
      
      if (userProfile) {
        setProfile(userProfile)
        setDisplayName(userProfile.displayName || "")
        setPermissionLevel(userProfile.permissionLevel)
      }
    } catch (err) {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!profile) return
    
    setSaving(true)
    setError(null)
    
    try {
      const { success, error: saveError } = await updateUserProfile({
        displayName: displayName.trim() || undefined,
        permissionLevel
      })
      
      if (saveError) {
        setError(saveError)
        return
      }
      
      if (success) {
        onClose()
      }
    } catch (err) {
      setError("Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setError(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:user" className="w-5 h-5" />
            User Profile
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              {/* User ID (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  value={profile?.userId || ""}
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>

              {/* Permission Level (read-only for non-superadmins) */}
              <div className="space-y-2">
                <Label htmlFor="permissionLevel">Permission Level</Label>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={permissionLevel === 'superadmin' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    <Icon 
                      icon={permissionLevel === 'superadmin' ? 'lucide:shield-check' : 'lucide:user'} 
                      className="w-3 h-3" 
                    />
                    {permissionLevel === 'superadmin' ? 'Superadmin' : 'Editor'}
                  </Badge>
                  {permissionLevel === 'superadmin' && (
                    <span className="text-xs text-muted-foreground">
                      Full access to all features
                    </span>
                  )}
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-2">
                <Label>Account Information</Label>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Profile ID: {profile?.id}</div>
                  <div>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}</div>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
