"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Icon } from "@iconify/react"
import type { CharacterData } from "@/lib/character-data"

interface FeatsProps {
  character: CharacterData
  onEdit: () => void
  onOpenFeatureModal: (content: { title: string; description: string }) => void
}

export function Feats({ character, onEdit, onOpenFeatureModal }: FeatsProps) {
  return (
    <Card className="flex flex-col gap-3">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Icon icon="lucide:star" className="w-5 h-5" />
            Feats
          </CardTitle>
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Icon icon="lucide:edit" className="w-4 h-4" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {character.feats.map((feat, index) => (
            <div key={index} className="p-2 border rounded-lg flex items-center justify-between">
              <div className="font-medium text-sm">{feat.name}</div>
              <Button
                variant="outline"
                size="sm"
                className="px-2 h-7 shadow-sm text-foreground"
                onClick={() => {
                  onOpenFeatureModal({ title: feat.name, description: feat.description })
                }}
              >
                Read more
              </Button>
            </div>
          ))}
          {character.feats.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">No feats</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
