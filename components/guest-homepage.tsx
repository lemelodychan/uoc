"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { Campaign } from "@/lib/character-data"
import { LoginModal } from "@/components/login-modal"
import { useRouter } from "next/navigation"

interface GuestHomepageProps {
  campaigns: Campaign[]
  onSelectCampaign: (campaignId: string) => void
  onViewWiki: () => void
}

export function GuestHomepage({ campaigns, onSelectCampaign, onViewWiki }: GuestHomepageProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background">
      {/* Public Campaigns */}
      <div className="container mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Public Campaigns</h2>
          <Button variant="outline" size="sm" onClick={onViewWiki} className="flex items-center gap-2">
            <Icon icon="lucide:book-open-text" className="w-4 h-4" />
            Browse the Wiki
          </Button>
        </div>

        {campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <Icon icon="iconoir:hexagon-dice" className="w-16 h-16 text-muted-foreground/40" />
            <p className="text-muted-foreground text-lg">No public campaigns available.</p>
            <p className="text-sm text-muted-foreground">
              Sign in to access your campaigns.
            </p>
            <Button onClick={() => setLoginModalOpen(true)} className="mt-2">
              <Icon icon="lucide:log-in" className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {campaigns.map((campaign) => (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                onClick={() => onSelectCampaign(campaign.id)}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-bold flex items-center justify-between gap-2">
                    <span className="truncate">{campaign.name}</span>
                    {campaign.allowGuestCharacters && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        Open
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Icon icon="lucide:users" className="w-3 h-3" />
                    <span>{campaign.characters.length} character{campaign.characters.length !== 1 ? "s" : ""}</span>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    View Campaign
                    <Icon icon="lucide:arrow-right" className="w-3 h-3 ml-auto" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Wiki CTA */}
        <div className="mt-12 pt-8 border-t border-border">
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all max-w-sm"
            onClick={onViewWiki}
          >
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-lg bg-accent/30">
                <Icon icon="lucide:book-open-text" className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">D&D 5e Wiki</h3>
                <p className="text-sm text-muted-foreground">Browse spells, classes, monsters & more</p>
              </div>
              <Icon icon="lucide:arrow-right" className="w-4 h-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      </div>

      <LoginModal
        open={loginModalOpen}
        onOpenChange={setLoginModalOpen}
        onSuccess={() => router.refresh()}
      />
    </div>
  )
}
