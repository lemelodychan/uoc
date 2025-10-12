"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { isSuperadmin } from "@/lib/user-profiles"
import type { UserProfile } from "@/lib/user-profiles"
import type { CharacterData } from "@/lib/character-data"

interface AccessDeniedOverlayProps {
  isVisible: boolean
  currentUserProfile?: UserProfile | null
  character?: CharacterData | null
  onSuperadminAccess?: () => void
}

export function AccessDeniedOverlay({ isVisible, currentUserProfile, character, onSuperadminAccess }: AccessDeniedOverlayProps) {
  if (!isVisible) return null

  const isUserSuperadmin = isSuperadmin(currentUserProfile?.permissionLevel)

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <Card className="w-full max-w-md mx-4 pointer-events-auto">
        <CardContent className="p-4 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full border">
              <Icon icon="lucide:lock" className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                Access Denied
              </h3>
              <p className="text-sm text-muted-foreground">
                {character && character.visibility === 'private' 
                  ? "This character sheet is private and can only be viewed by its owner."
                  : "This character sheet belongs to another user."
                }
              </p>
              {isUserSuperadmin && onSuperadminAccess && (
                <Button 
                  onClick={onSuperadminAccess}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Icon icon="lucide:lock-open" className="w-4 h-4" />
                  Access Character Sheet
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
