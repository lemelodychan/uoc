import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Campaign } from './character-data'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the campaign logo URL for a specific theme with fallback logic.
 * If only one logo exists, it will be used for both themes.
 * 
 * @param campaign - The campaign object
 * @param theme - The theme ('light' | 'dark')
 * @returns The logo URL for the specified theme, or undefined if no logo exists
 */
export function getCampaignLogoUrl(campaign: Campaign | undefined, theme: 'light' | 'dark'): string | undefined {
  if (!campaign) return undefined
  
  const lightUrl = campaign.logoLightUrl
  const darkUrl = campaign.logoDarkUrl
  
  // If both logos exist, return the appropriate one for the theme
  if (lightUrl && darkUrl) {
    return theme === 'light' ? lightUrl : darkUrl
  }
  
  // If only one logo exists, use it for both themes
  if (lightUrl) return lightUrl
  if (darkUrl) return darkUrl
  
  // No logo exists
  return undefined
}
