import { NextResponse } from 'next/server'
import { loadAllCampaigns, updateCampaign } from '@/lib/database'
import { formatInTimeZone } from 'date-fns-tz'

// Force dynamic rendering to prevent caching
export const dynamic = 'force-dynamic'

// Vercel cron jobs are automatically authenticated by Vercel's infrastructure
export async function GET(req: Request) {
  // Log immediately to verify the endpoint is being called
  console.log('[Cron] ========================================')
  console.log('[Cron] Endpoint called at', new Date().toISOString())
  console.log('[Cron] URL:', req.url)
  
  // Log headers for debugging (Vercel cron jobs send specific headers)
  const userAgent = req.headers.get('user-agent') || ''
  const vercelCron = req.headers.get('x-vercel-cron') || req.headers.get('vercel-cron')
  console.log('[Cron] User-Agent:', userAgent)
  console.log('[Cron] Vercel-Cron header:', vercelCron)
  
  // Vercel cron jobs are automatically authenticated at the infrastructure level
  // We only check CRON_SECRET if it's explicitly provided (for manual testing)
  const CRON_SECRET = process.env.CRON_SECRET
  if (CRON_SECRET) {
    const providedSecret = req.headers.get('x-cron-secret')
    // Only reject if a secret was provided but it's wrong
    // Don't reject if no secret is provided (Vercel cron jobs don't send it)
    if (providedSecret && providedSecret !== CRON_SECRET) {
      console.error('[Cron] Invalid CRON_SECRET provided')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  
  console.log('[Cron] Authentication passed, starting execution')

  const { campaigns, error } = await loadAllCampaigns(true) // Use service role to bypass RLS
  if (error) {
    console.error('Error loading campaigns:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  console.log(`[Cron] Running at ${new Date().toISOString()}, found ${campaigns?.length || 0} campaigns`)

  const nowUtc = new Date()
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
    const twentyFiveHMs = 25 * 60 * 60 * 1000 // 25 hours in milliseconds
    
    // If reminder was sent but session is more than 25 hours away, reset the flag
    // This handles cases where the session was rescheduled
    if (c.discordReminderSent && diff > twentyFiveHMs) {
      console.log(`[Cron] Campaign "${c.name}": Resetting reminder flag (session is ${hoursUntilSession.toFixed(2)} hours away)`)
      await updateCampaign({ ...c, updated_at: new Date().toISOString(), discordReminderSent: false })
      c.discordReminderSent = false
    }

    // Send reminder if:
    // - Session is 25 hours away or less AND
    // - Reminder hasn't been sent yet AND
    // - Session hasn't passed yet
    const isWithin25Hours = diff <= twentyFiveHMs
    const isFuture = diff > 0
    const reminderNotSent = !c.discordReminderSent
    const shouldSendReminder = reminderNotSent && isWithin25Hours && isFuture
    
    console.log(`[Cron] Campaign "${c.name}":`)
    console.log(`  - Session UTC: ${sessionUtc.toISOString()}`)
    console.log(`  - Now UTC: ${nowUtc.toISOString()}`)
    console.log(`  - Hours until session: ${hoursUntilSession.toFixed(2)}`)
    console.log(`  - Diff in ms: ${diff}`)
    console.log(`  - 25 hours in ms: ${twentyFiveHMs}`)
    console.log(`  - Reminder already sent: ${c.discordReminderSent}`)
    console.log(`  - Is within 25h: ${isWithin25Hours} (diff <= ${twentyFiveHMs})`)
    console.log(`  - Is future: ${isFuture} (diff > 0)`)
    console.log(`  - Reminder not sent: ${reminderNotSent}`)
    console.log(`  - Should send reminder: ${shouldSendReminder}`)
    
    if (!shouldSendReminder) {
      const reasons = []
      if (c.discordReminderSent) reasons.push('Reminder already sent')
      if (!isWithin25Hours) reasons.push(`Not within 25h (${hoursUntilSession.toFixed(2)} hours away)`)
      if (!isFuture) reasons.push('Session has already passed')
      console.log(`[Cron] Campaign "${c.name}": NOT sending - Reasons: ${reasons.join(', ')}`)
    }
    
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


