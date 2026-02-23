import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'

// Secure this endpoint with a secret header
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { campaigns, error } = await loadAllCampaigns(true) // Use service role to bypass RLS
  if (error) {
    console.error('Error loading campaigns:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  // Fallback to environment variable if campaigns don't have webhook URLs
  const DEFAULT_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_WEBHOOK

  console.log(`[Cron] Running at ${new Date().toISOString()}, found ${campaigns?.length || 0} campaigns`)
  console.log(`[Cron] Default webhook URL from env: ${DEFAULT_WEBHOOK_URL ? 'SET' : 'NOT SET'}`)

  const nowUtc = new Date()
  const twentyFourHMs = 24 * 60 * 60 * 1000
  let sent = 0
  let processed = 0
  let skipped = 0

  await Promise.all((campaigns || []).map(async (c) => {
    processed++
    
    // Use environment variable as fallback if campaign doesn't have webhook URL
    const webhookUrl = c.discordWebhookUrl || DEFAULT_WEBHOOK_URL
    
    if (!webhookUrl) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - no webhook URL (campaign or env)`)
      skipped++
      return
    }
    
    if (!c.discordNotificationsEnabled) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - notifications disabled`)
      skipped++
      return
    }
    
    if (!c.nextSessionDate || !c.nextSessionNumber) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - missing session date or number`)
      skipped++
      return
    }

    // Parse session date and time correctly
    let sessionUtc: Date
    if (c.nextSessionDate && c.nextSessionTime && c.nextSessionTimezone) {
      // Combine date and time in the specified timezone
      const dateTimeString = `${c.nextSessionDate}T${c.nextSessionTime}`
      const localDate = new Date(dateTimeString)
      
      // Convert from the session timezone to UTC
      const { fromZonedTime } = await import('date-fns-tz')
      sessionUtc = fromZonedTime(localDate, c.nextSessionTimezone)
    } else {
      // Fallback to old method
      sessionUtc = new Date(c.nextSessionDate)
    }
    
    if (isNaN(sessionUtc.getTime())) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - invalid session date`)
      skipped++
      return
    }

    const diff = sessionUtc.getTime() - nowUtc.getTime()
    const hoursUntilSession = diff / (1000 * 60 * 60)

    // Send if:
    // 1. Within [24h window +/- 10m] and not already sent, OR
    // 2. Session is less than 24 hours away and reminder not sent (for immediate notifications)
    const window = 10 * 60 * 1000
    const within24HourWindow = Math.abs(diff - twentyFourHMs) <= window
    const lessThan24Hours = diff < twentyFourHMs && diff > 0
    const shouldSendReminder = !c.discordReminderSent && (within24HourWindow || lessThan24Hours)
    
    console.log(`[Cron] Campaign "${c.name}":`)
    console.log(`  - Session UTC: ${sessionUtc.toISOString()}`)
    console.log(`  - Hours until session: ${hoursUntilSession.toFixed(2)}`)
    console.log(`  - Reminder already sent: ${c.discordReminderSent}`)
    console.log(`  - Within 24h window: ${within24HourWindow}`)
    console.log(`  - Less than 24h away: ${lessThan24Hours}`)
    console.log(`  - Should send reminder: ${shouldSendReminder}`)
    
    if (shouldSendReminder) {
      const eu = formatInTimeZone(sessionUtc, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
      const qc = formatInTimeZone(sessionUtc, 'America/Montreal', 'MMMM d, yyyy HH:mm')
      const jp = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
      const content = `@everyone Session #${c.nextSessionNumber} of ${c.name} starts in 24 hours (Europe ${eu} / Quebec ${qc} / Tokyo ${jp})`
      console.log(`[Cron] Campaign "${c.name}": Attempting to send reminder to webhook`)
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content })
        })
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error')
          console.error(`[Cron] Campaign "${c.name}": Webhook failed with status ${response.status}: ${errorText}`)
        } else {
          console.log(`[Cron] Campaign "${c.name}": Reminder sent successfully`)
          await updateCampaign({ ...c, updated_at: new Date().toISOString(), discordReminderSent: true })
          sent++
        }
      } catch (e) {
        console.error(`[Cron] Campaign "${c.name}": Discord webhook error:`, e)
      }
    }

    // After session time passes, clear fields and disable notifications
    if (nowUtc.getTime() > sessionUtc.getTime()) {
      await updateCampaign({
        ...c,
        updated_at: new Date().toISOString(),
        nextSessionDate: undefined,
        nextSessionTime: undefined,
        nextSessionTimezone: undefined,
        nextSessionNumber: undefined,
        discordNotificationsEnabled: false,
        discordReminderSent: false,
      })
    }
  }))

  console.log(`[Cron] Summary: Processed ${processed}, Sent ${sent}, Skipped ${skipped}`)
  return NextResponse.json({ ok: true, sent, processed, skipped })
}


