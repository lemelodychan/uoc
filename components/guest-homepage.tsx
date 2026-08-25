"use client"

import { useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Icon } from "@iconify/react"
import type { Campaign } from "@/lib/character-data"
import { LoginModal } from "@/components/login-modal"
import { getCampaignLogoUrl } from "@/lib/utils"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface GuestHomepageProps {
  campaigns: Campaign[]
  onSelectCampaign: (campaignId: string) => void
  onViewWiki: () => void
  /** Section heading. Defaults to the guest-facing "Public Campaigns". */
  heading?: string
  /** Empty-state message. Defaults to the guest-facing copy. */
  emptyMessage?: string
  /** Whether to show the "Sign in" prompt + button in the empty state (guests only). */
  showSignInCta?: boolean
  /** Optional second group, rendered below as smaller cards (e.g. inactive campaigns). */
  secondaryCampaigns?: Campaign[]
  /** Heading for the secondary group. */
  secondaryHeading?: string
}

export function GuestHomepage({
  campaigns,
  onSelectCampaign,
  onViewWiki,
  heading = "Public Campaigns",
  emptyMessage = "No public campaigns available.",
  showSignInCta = true,
  secondaryCampaigns,
  secondaryHeading = "Inactive Campaigns",
}: GuestHomepageProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'

  const hasPrimary = campaigns.length > 0
  const hasSecondary = !!(secondaryCampaigns && secondaryCampaigns.length > 0)
  const isEmpty = !hasPrimary && !hasSecondary

  // Full-size campaign card (logo, description, character count, CTA button).
  const renderBigCard = (campaign: Campaign) => {
    const logoUrl = getCampaignLogoUrl(campaign, theme)
    return (
      <Card
        key={campaign.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all flex flex-col gap-2"
        onClick={() => onSelectCampaign(campaign.id)}
      >
        <CardHeader className="flex items-center justify-center">
          <div className="w-full h-20 flex items-center justify-center overflow-hidden bg-muted/50 p-3 rounded-lg w-full">
            {logoUrl ? (
              <Image src={logoUrl} alt={campaign.name} width={100} height={100} className="w-full h-full object-contain" />
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
    )
  }

  // Compact horizontal card for the secondary (inactive) group.
  const renderCompactCard = (campaign: Campaign) => {
    const logoUrl = getCampaignLogoUrl(campaign, theme)
    return (
      <Card
        key={campaign.id}
        className="cursor-pointer hover:border-primary/50 hover:shadow-sm transition-all p-0"
        onClick={() => onSelectCampaign(campaign.id)}
      >
        <CardContent className="flex items-center gap-3 p-3">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden bg-muted/50 rounded-md">
            {logoUrl ? (
              <Image src={logoUrl} alt={campaign.name} width={40} height={40} className="w-full h-full object-contain" />
            ) : (
              <Icon icon="iconoir:hexagon-dice" className="w-5 h-5 text-muted-foreground/50" />
            )}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-medium truncate">{campaign.name}</span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Icon icon="lucide:users" className="w-3 h-3" />
              {campaign.characters.length} character{campaign.characters.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Icon icon="lucide:arrow-right" className="w-4 h-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col gap-6">
      <div className="container flex flex-col gap-6 p-6">
        {isEmpty ? (
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-bold">{heading}</h2>
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <Icon icon="iconoir:hexagon-dice" className="w-16 h-16 text-muted-foreground/40" />
              <p className="text-muted-foreground text-lg">{emptyMessage}</p>
              {showSignInCta && (
                <>
                  <p className="text-sm text-muted-foreground">
                    Sign in to access your campaigns.
                  </p>
                  <Button onClick={() => setLoginModalOpen(true)} className="mt-2">
                    <Icon icon="lucide:log-in" className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Primary (active / public) campaigns — full-size cards */}
            {hasPrimary && (
              <div className="flex flex-col gap-4">
                <h2 className="text-2xl font-bold">{heading}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {campaigns.map(renderBigCard)}
                </div>
              </div>
            )}

            {/* Secondary (inactive) campaigns — compact cards */}
            {hasSecondary && (
              <div className="flex flex-col gap-4 pt-2">
                <h2 className="text-lg font-semibold text-muted-foreground">{secondaryHeading}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {secondaryCampaigns!.map(renderCompactCard)}
                </div>
              </div>
            )}
          </>
        )}

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
