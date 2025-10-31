"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import { RichTextDisplay } from "@/components/ui/rich-text-display"
import type { CharacterData } from "@/lib/character-data"

interface LanguagesProps {
  character: CharacterData
  onEdit: () => void
  canEdit?: boolean
}

export function Languages({ character, onEdit, canEdit = true }: LanguagesProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:globe" className="w-5 h-5" />
            Languages
          </CardTitle>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Icon icon="lucide:edit" className="w-4 h-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <RichTextDisplay
          content={character.languages || "No languages listed"}
          className={!character.languages ? "text-muted-foreground text-center py-4" : ""}
        />
      </CardContent>
    </Card>
  )
}
