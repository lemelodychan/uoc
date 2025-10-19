"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Icon } from "@iconify/react"
import type { ClassData } from "@/lib/class-utils"
import { useToast } from "@/components/ui/use-toast"

interface ClassDuplicationModalProps {
  sourceClass: ClassData
  onClose: () => void
  onSuccess?: (newClass: ClassData) => void
}

export function ClassDuplicationModal({ 
  sourceClass, 
  onClose, 
  onSuccess 
}: ClassDuplicationModalProps) {
  const [newName, setNewName] = useState(`${sourceClass.name} (Copy)`)
  const [copySubclasses, setCopySubclasses] = useState(true)
  const [copyFeatures, setCopyFeatures] = useState(true)
  const [copyFeatureSkills, setCopyFeatureSkills] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDuplicate = async () => {
    if (!newName.trim()) {
      setError("Class name is required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Create the new class data
      const newClass: Partial<ClassData> = {
        ...sourceClass,
        id: undefined,  // Generate new ID
        name: newName.trim(),
        subclass: null,  // Reset subclass for base class
        is_custom: true,
        created_by: "current-user-id", // TODO: Get from auth context
        duplicated_from: sourceClass.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // TODO: Implement actual duplication logic
      // This would involve:
      // 1. Creating the new class in the database
      // 2. Copying subclasses if requested
      // 3. Copying features if requested
      // 4. Copying feature skills if requested
      
      // For now, simulate the operation
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast({
        title: "Class Duplicated",
        description: `Successfully created "${newName}" based on "${sourceClass.name}"`
      })

      onSuccess?.(newClass as ClassData)
      onClose()
    } catch (err) {
      console.error("Error duplicating class:", err)
      setError(err instanceof Error ? err.message : "Failed to duplicate class")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    if (isLoading) return
    onClose()
  }

  return (
    <Dialog open onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="lucide:copy" className="w-5 h-5" />
            Duplicate Class: {sourceClass.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-name">New Class Name</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter new class name"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-3">
            <Label>What to copy:</Label>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-subclasses"
                  checked={copySubclasses}
                  onCheckedChange={setCopySubclasses}
                  disabled={isLoading}
                />
                <Label htmlFor="copy-subclasses" className="text-sm font-normal">
                  Subclasses
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="copy-features"
                  checked={copyFeatures}
                  onCheckedChange={setCopyFeatures}
                  disabled={isLoading}
                />
                <Label htmlFor="copy-features" className="text-sm font-normal">
                  Class Features
                </Label>
              </div>
              
              <div className="flex items-center space-x-2 ml-6">
                <Checkbox
                  id="copy-feature-skills"
                  checked={copyFeatureSkills}
                  onCheckedChange={setCopyFeatureSkills}
                  disabled={!copyFeatures || isLoading}
                />
                <Label htmlFor="copy-feature-skills" className="text-sm font-normal">
                  Feature Skills (usage tracking)
                </Label>
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">
              <strong>Note:</strong> The new class will be marked as custom and can be edited by you.
              {sourceClass.is_custom && (
                <div className="mt-1">
                  This will create a copy of a custom class. The original will remain unchanged.
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDuplicate}
            disabled={isLoading || !newName.trim()}
          >
            {isLoading ? (
              <>
                <Icon icon="lucide:loader-2" className="w-4 h-4 mr-2 animate-spin" />
                Duplicating...
              </>
            ) : (
              <>
                <Icon icon="lucide:copy" className="w-4 h-4 mr-2" />
                Duplicate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
