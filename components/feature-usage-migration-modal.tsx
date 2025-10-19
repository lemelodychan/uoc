"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { CharacterData } from "@/lib/character-data"
import { needsMigration, getMigrationSummary, migrateCharacterToUnifiedUsage } from "@/lib/feature-usage-migration"

interface FeatureUsageMigrationModalProps {
  characters: CharacterData[]
  onCharacterUpdate: (character: CharacterData) => Promise<void>
  trigger?: React.ReactNode
}

export function FeatureUsageMigrationModal({ 
  characters, 
  onCharacterUpdate, 
  trigger 
}: FeatureUsageMigrationModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState<Record<string, 'pending' | 'migrating' | 'completed' | 'error'>>({})
  const { toast } = useToast()

  // Find characters that need migration
  const charactersNeedingMigration = characters.filter(needsMigration)

  const handleMigrateAll = async () => {
    setMigrating(true)
    setMigrationProgress({})
    
    let successCount = 0
    let errorCount = 0
    
    for (const character of charactersNeedingMigration) {
      setMigrationProgress(prev => ({ ...prev, [character.id]: 'migrating' }))
      
      try {
        const migratedCharacter = migrateCharacterToUnifiedUsage(character)
        await onCharacterUpdate(migratedCharacter)
        
        setMigrationProgress(prev => ({ ...prev, [character.id]: 'completed' }))
        successCount++
      } catch (error) {
        console.error(`Failed to migrate character ${character.name}:`, error)
        setMigrationProgress(prev => ({ ...prev, [character.id]: 'error' }))
        errorCount++
      }
    }
    
    setMigrating(false)
    
    if (successCount > 0) {
      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${successCount} character${successCount > 1 ? 's' : ''} to unified feature usage tracking.`,
      })
    }
    
    if (errorCount > 0) {
      toast({
        title: "Migration Errors",
        description: `Failed to migrate ${errorCount} character${errorCount > 1 ? 's' : ''}. Please try again.`,
        variant: "destructive",
      })
    }
    
    if (successCount > 0 && errorCount === 0) {
      setIsOpen(false)
    }
  }

  const handleMigrateCharacter = async (character: CharacterData) => {
    setMigrationProgress(prev => ({ ...prev, [character.id]: 'migrating' }))
    
    try {
      const migratedCharacter = migrateCharacterToUnifiedUsage(character)
      await onCharacterUpdate(migratedCharacter)
      
      setMigrationProgress(prev => ({ ...prev, [character.id]: 'completed' }))
      
      toast({
        title: "Character Migrated",
        description: `${character.name} has been migrated to unified feature usage tracking.`,
      })
    } catch (error) {
      console.error(`Failed to migrate character ${character.name}:`, error)
      setMigrationProgress(prev => ({ ...prev, [character.id]: 'error' }))
      
      toast({
        title: "Migration Failed",
        description: `Failed to migrate ${character.name}. Please try again.`,
        variant: "destructive",
      })
    }
  }

  if (charactersNeedingMigration.length === 0) {
    return null // Don't show the modal if no characters need migration
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Icon icon="lucide:database" className="w-4 h-4 mr-2" />
            Migrate Feature Usage
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:database" className="w-5 h-5" />
            Feature Usage Migration
          </DialogTitle>
          <DialogDescription>
            Migrate your characters from individual feature columns to unified feature usage tracking.
            This improves performance and scalability.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Icon icon="lucide:info" className="w-4 h-4" />
            <AlertDescription>
              This migration will consolidate all class feature usage (Flash of Genius, Bardic Inspiration, 
              Infusions, etc.) into a single unified system. Your existing data will be preserved.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4">
            {charactersNeedingMigration.map(character => {
              const summary = getMigrationSummary(character)
              const status = migrationProgress[character.id] || 'pending'
              
              return (
                <Card key={character.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{character.name}</CardTitle>
                        <CardDescription>
                          Level {character.level} {character.class}
                          {character.subclass && ` (${character.subclass})`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {status === 'pending' && (
                          <Badge variant="outline">Pending</Badge>
                        )}
                        {status === 'migrating' && (
                          <Badge variant="secondary" className="animate-pulse">
                            <Icon icon="lucide:loader-2" className="w-3 h-3 mr-1 animate-spin" />
                            Migrating
                          </Badge>
                        )}
                        {status === 'completed' && (
                          <Badge variant="default" className="bg-green-600">
                            <Icon icon="lucide:check" className="w-3 h-3 mr-1" />
                            Complete
                          </Badge>
                        )}
                        {status === 'error' && (
                          <Badge variant="destructive">
                            <Icon icon="lucide:x" className="w-3 h-3 mr-1" />
                            Error
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-2">Features to migrate:</p>
                        <div className="flex flex-wrap gap-1">
                          {summary.featuresToMigrate.map(feature => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          {summary.totalFeatures} feature{summary.totalFeatures !== 1 ? 's' : ''} will be migrated
                        </p>
                        {status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleMigrateCharacter(character)}
                            disabled={migrating}
                          >
                            Migrate
                          </Button>
                        )}
                        {status === 'error' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMigrateCharacter(character)}
                            disabled={migrating}
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              {charactersNeedingMigration.length} character{charactersNeedingMigration.length !== 1 ? 's' : ''} need{charactersNeedingMigration.length === 1 ? 's' : ''} migration
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMigrateAll}
                disabled={migrating || charactersNeedingMigration.length === 0}
              >
                {migrating ? (
                  <>
                    <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
                    Migrating All...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:database" className="w-4 h-4 mr-2" />
                    Migrate All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
