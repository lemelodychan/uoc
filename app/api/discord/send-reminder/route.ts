import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'

export async function POST(req: Request) {
  try {
    const { campaignId } = await req.json()
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId' }, { status: 400 })
    }

    const { campaigns, error } = await loadAllCampaigns()
    if (error) return NextResponse.json({ error }, { status: 500 })

    const campaign = campaigns?.find(c => c.id === campaignId)
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check if campaign has required fields for Discord notification
    if (!campaign.discordWebhookUrl || !campaign.discordNotificationsEnabled || !campaign.nextSessionDate || !campaign.nextSessionNumber) {
      return NextResponse.json({ 
        error: 'Campaign missing required fields for Discord notification. Ensure Discord notifications are enabled and all session details are set.' 
      }, { status: 400 })
    }

    // Parse session date and time correctly (matching cron job logic)
    let sessionUtc: Date
    if (campaign.nextSessionDate && campaign.nextSessionTime && campaign.nextSessionTimezone) {
      // Combine date and time in the specified timezone
      const dateTimeString = `${campaign.nextSessionDate}T${campaign.nextSessionTime}`
      const localDate = new Date(dateTimeString)
      
      // Convert from the session timezone to UTC
      const { fromZonedTime } = await import('date-fns-tz')
      sessionUtc = fromZonedTime(localDate, campaign.nextSessionTimezone)
    } else {
      // Fallback to old method
      sessionUtc = new Date(campaign.nextSessionDate)
    }
    
    if (isNaN(sessionUtc.getTime())) {
      return NextResponse.json({ error: 'Invalid session date' }, { status: 400 })
    }

    // Format the message with timezone information
    const eu = formatInTimeZone(sessionUtc, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
    const qc = formatInTimeZone(sessionUtc, 'America/Montreal', 'MMMM d, yyyy HH:mm')
    const jp = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
    const content = `@everyone Session #${campaign.nextSessionNumber} of ${campaign.name} starts in 24 hours (Europe ${eu} / Quebec ${qc} / Tokyo ${jp})`

    // Send Discord notification
    const response = await fetch(campaign.discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      return NextResponse.json({ 
        error: 'Discord webhook failed', 
        details: text 
      }, { status: 502 })
    }

    // Mark reminder as sent
    await updateCampaign({ 
      ...campaign, 
      updated_at: new Date().toISOString(), 
      discordReminderSent: true 
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Discord reminder sent successfully' 
    })

  } catch (error: any) {
    console.error('Error sending Discord reminder:', error)
    return NextResponse.json({ 
      error: 'Failed to send Discord reminder', 
      details: error?.message 
    }, { status: 500 })
  }
}
