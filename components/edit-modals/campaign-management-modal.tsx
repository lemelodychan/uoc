"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Edit, Trash2, Users, Calendar } from "lucide-react"
import { CampaignCreationModal } from "./campaign-creation-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import type { Campaign, CharacterData } from "@/lib/character-data"

interface CampaignManagementModalProps {
  isOpen: boolean
  onClose: () => void
  campaigns: Campaign[]
  characters: CharacterData[]
  onCreateCampaign: (campaign: Campaign) => void
  onUpdateCampaign: (campaign: Campaign) => void
  onDeleteCampaign: (campaignId: string) => void
  onAssignCharacterToCampaign: (characterId: string, campaignId: string) => void
  onRemoveCharacterFromCampaign: (characterId: string, campaignId: string) => void
  onSetActiveCampaign: (campaignId: string) => void
}

export function CampaignManagementModal({
  isOpen,
  onClose,
  campaigns,
  characters,
  onCreateCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onAssignCharacterToCampaign,
  onRemoveCharacterFromCampaign,
  onSetActiveCampaign
}: CampaignManagementModalProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getCharactersInCampaign = (campaignId: string) => {
    return characters.filter(char => char.campaignId === campaignId)
  }

  const handleCreateCampaign = (campaign: Campaign) => {
    onCreateCampaign(campaign)
    setShowCreateModal(false)
  }

  const handleUpdateCampaign = (campaign: Campaign) => {
    onUpdateCampaign(campaign)
    setEditingCampaign(null)
  }

  const handleDeleteCampaign = () => {
    if (deletingCampaign) {
      onDeleteCampaign(deletingCampaign.id)
      setDeletingCampaign(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] h-[90vh] flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Campaign Management</DialogTitle>
            <DialogDescription>
              Create and manage your D&D campaigns. Organize characters into different campaigns and track their status.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search and Create */}
            <div className="flex gap-2 flex-shrink-0">
              <Input
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                New Campaign
              </Button>
            </div>

            {/* Campaigns List */}
            <div className="flex-1 overflow-y-auto space-y-4">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? "No campaigns found matching your search." : "No campaigns created yet."}
                </div>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const campaignCharacters = getCharactersInCampaign(campaign.id)
                  const activeCharacters = campaignCharacters.filter(char => char.partyStatus === 'active')
                  const awayCharacters = campaignCharacters.filter(char => char.partyStatus === 'away')
                  const deceasedCharacters = campaignCharacters.filter(char => char.partyStatus === 'deceased')

                  return (
                    <Card key={campaign.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex flex-col gap-1">
                            <CardTitle className="text-lg">{campaign.name}</CardTitle>
                            {campaign.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {campaign.description.replace(/<[^>]*>/g, '')}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                Created {formatDate(campaign.created_at)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {/* Character Summary */}
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  <span className="text-xs">
                                    {campaignCharacters.length} character{campaignCharacters.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                                {campaignCharacters.length === 0 && (
                                  <div className="text-sm text-muted-foreground">
                                    No characters assigned to this campaign yet. Click Edit to manage characters.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {!campaign.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSetActiveCampaign(campaign.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                Set Active
                              </Button>
                            )}
                            {campaign.isActive && (
                              <Badge variant="default" className="bg-green-600">
                                Active
                              </Badge>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingCampaign(campaign)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingCampaign(campaign)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  )
                })
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Creation Modal */}
      <CampaignCreationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateCampaign}
      />

      {/* Campaign Edit Modal */}
      <CampaignCreationModal
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        onSave={handleUpdateCampaign}
        editingCampaign={editingCampaign}
        characters={characters}
        onAssignCharacterToCampaign={onAssignCharacterToCampaign}
        onRemoveCharacterFromCampaign={onRemoveCharacterFromCampaign}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCampaign} onOpenChange={() => setDeletingCampaign(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCampaign?.name}"? This action cannot be undone.
              Characters in this campaign will be moved to "No Campaign" status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCampaign} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
