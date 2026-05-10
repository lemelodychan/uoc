"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { Campaign } from "@/lib/character-data"
import { LoginModal } from "@/components/login-modal"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface GuestHomepageProps {
  campaigns: Campaign[]
  onSelectCampaign: (campaignId: string) => void
  onViewWiki: () => void
}

export function GuestHomepage({ campaigns, onSelectCampaign, onViewWiki }: GuestHomepageProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const router = useRouter()

  return (
    <div className="min-h-screen bg-background flex flex-col gap-6">
      {/* Public Campaigns */}
      <div className="container flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-6">
          <h2 className="text-2xl font-bold">Public Campaigns</h2>
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
                  className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-2"
                  onClick={() => onSelectCampaign(campaign.id)}
                >
                  <CardHeader className="flex items-center justify-center">
                    <div className="w-full h-20 flex items-center justify-center overflow-hidden bg-muted/50 p-3 rounded-lg w-full">
                    {campaign.logoDarkUrl || campaign.logoLightUrl ? (
                      <Image src={campaign.logoDarkUrl || campaign.logoLightUrl || ""} alt={campaign.name} width={100} height={100} className="w-full h-full object-contain" />
                      ) : (
                      <CardTitle className="text-lg font-bold flex flex-col justify-between gap-2 w-full h-full">
                        {campaign.allowGuestCharacters && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            Open
                          </Badge>
                        )}
                        <span className="truncate">{campaign.name}</span>
                      </CardTitle>
                    )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
                      )}
                      <Badge variant="outline" className="flex items-center gap-2 text-xs text-muted-foreground" size="xs">
                        <Icon icon="lucide:users" className="w-3 h-3" />
                        <span>{campaign.characters.length} character{campaign.characters.length !== 1 ? "s" : ""}</span>
                      </Badge>
                    </div>
                    <Button variant="default" size="sm" className="w-full">
                      View Campaign
                      <Icon icon="lucide:arrow-right" className="w-3 h-3 ml-auto" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>


        {/* Wiki CTA */}
        <div className="pt-6 border-t border-border">
          <Card
            className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all max-w-sm h-fit p-0"
            onClick={onViewWiki}
          >
            <CardContent className="flex items-center gap-4 p-3 pr-4 h-fit">
              <div className="p-3 rounded-md bg-accent/30">
                <Icon icon="lucide:book-open-text" className="w-4 h-4 text-accent-foreground" />
              </div>
              <div className="flex flex-col gap-0">
                <h3 className="font-semibold m-0">D&D 5e Wiki</h3>
                <p className="text-sm text-muted-foreground m-0">Browse spells, classes, monsters & more</p>
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
