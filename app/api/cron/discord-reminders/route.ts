import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

// Secure this endpoint - Vercel cron jobs are automatically authenticated
// Optional CRON_SECRET for additional security (for manual testing)
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: Request) {
  // Vercel cron jobs are automatically secured, but we can add optional secret check for manual testing
  // Check for custom secret if CRON_SECRET is set (for manual testing via curl/etc)
  if (CRON_SECRET) {
    const customSecret = req.headers.get('x-cron-secret')
    if (customSecret !== CRON_SECRET) {
      // Allow if it's a Vercel cron invocation (they're automatically secured)
      // Otherwise require the secret
      const userAgent = req.headers.get('user-agent') || ''
      const isVercelCron = userAgent.includes('vercel-cron') || req.headers.get('x-vercel-cron')
      
      if (!isVercelCron) {
        console.error('[Cron] Unauthorized access attempt - missing CRON_SECRET')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }
  
  console.log('[Cron] Request authenticated, starting cron job execution')

  const { campaigns, error } = await loadAllCampaigns(true) // Use service role to bypass RLS
  if (error) {
    console.error('Error loading campaigns:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  console.log(`[Cron] Running at ${new Date().toISOString()}, found ${campaigns?.length || 0} campaigns`)

  const nowUtc = new Date()
  const twentyFourHMs = 24 * 60 * 60 * 1000
  let sent = 0
  let processed = 0
  let skipped = 0

  await Promise.all((campaigns || []).map(async (c) => {
    processed++
    
    // Skip if campaign doesn't have a Discord webhook URL configured
    if (!c.discordWebhookUrl) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - no Discord webhook URL configured`)
      skipped++
      return
    }
    
    // Validate webhook URL format
    if (!c.discordWebhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      console.error(`[Cron] Campaign "${c.name}": Invalid webhook URL format: ${c.discordWebhookUrl.substring(0, 50)}...`)
      skipped++
      return
    }
    
    // Skip if notifications are disabled
    if (!c.discordNotificationsEnabled) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - notifications disabled`)
      skipped++
      return
    }
    
    // Skip if no upcoming session is scheduled
    if (!c.nextSessionDate || !c.nextSessionNumber) {
      console.log(`[Cron] Campaign "${c.name}": Skipped - no upcoming session scheduled`)
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

    // Send reminder if:
    // - Session is exactly 24 hours away (within a 10 minute window) AND
    // - Reminder hasn't been sent yet AND
    // - Session hasn't passed yet
    const window = 10 * 60 * 1000 // 10 minute window
    const within24HourWindow = Math.abs(diff - twentyFourHMs) <= window
    const shouldSendReminder = !c.discordReminderSent && within24HourWindow && diff > 0
    
    console.log(`[Cron] Campaign "${c.name}":`)
    console.log(`  - Session UTC: ${sessionUtc.toISOString()}`)
    console.log(`  - Hours until session: ${hoursUntilSession.toFixed(2)}`)
    console.log(`  - Reminder already sent: ${c.discordReminderSent}`)
    console.log(`  - Within 24h window (±10min): ${within24HourWindow}`)
    console.log(`  - Should send reminder: ${shouldSendReminder}`)
    
    if (shouldSendReminder) {
      const eu = formatInTimeZone(sessionUtc, 'Europe/Amsterdam', 'MMMM d, yyyy HH:mm')
      const qc = formatInTimeZone(sessionUtc, 'America/Montreal', 'MMMM d, yyyy HH:mm')
      const jp = formatInTimeZone(sessionUtc, 'Asia/Tokyo', 'MMMM d, yyyy HH:mm')
      const content = `@everyone Session #${c.nextSessionNumber} of ${c.name} starts in 24 hours (Europe ${eu} / Quebec ${qc} / Tokyo ${jp})`
      console.log(`[Cron] Campaign "${c.name}": Sending reminder to Discord webhook`)
      console.log(`[Cron] Campaign "${c.name}": Webhook URL: ${c.discordWebhookUrl?.substring(0, 50)}...`)
      try {
        const response = await fetch(c.discordWebhookUrl!, {
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


