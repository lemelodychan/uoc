import { createClient } from "./supabase"
import type { CharacterData } from "./character-data"

const supabase = createClient()

export interface LongRestEvent {
  id: string
  initiated_by_character_id: string
  selected_character_ids: string[]
  event_type: string
  event_data: any
  created_at: string
  processed_at?: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  confirmed_by_character_id?: string
  confirmed_at?: string
}

export interface LongRestEventData {
  effects_applied: string[]
  characters_affected: {
    id: string
    name: string
    hp_restored: number
  }[]
  modal_open: boolean
  awaiting_confirmation: boolean
}

// Store polling state for cleanup when re-subscribing
let currentPollTimeout: ReturnType<typeof setTimeout> | null = null
let lastCheckedEventId: string | null = null

const POLL_INTERVAL_MS = 2000
const MAX_POLL_INTERVAL_MS = 30000
const BACKOFF_MULTIPLIER = 1.5
const RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000
const CONSECUTIVE_FAILURES_BEFORE_NOTIFY = 3

/**
 * Fetch pending long rest events with retries (handles idle tab timeouts).
 */
async function fetchPendingEvents(): Promise<{ data: LongRestEvent[] | null; error: any }> {
  let lastError: any = null
  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const { data, error } = await supabase
        .from('long_rest_events')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        lastError = error
        if (attempt < RETRY_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
        }
        continue
      }
      return { data: (data || []) as LongRestEvent[], error: null }
    } catch (err) {
      lastError = err
      if (attempt < RETRY_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS))
      }
    }
  }
  return { data: null, error: lastError }
}

/**
 * Subscribe to long rest events using database polling instead of websockets.
 * Uses retries and exponential backoff when idle to avoid ERR_CONNECTION_TIMED_OUT
 * and only notifies after sustained failures.
 */
export const subscribeToLongRestEvents = (
  onLongRestEvent: (event: LongRestEvent) => void,
  onError?: (error: any) => void
) => {
  if (currentPollTimeout) {
    clearTimeout(currentPollTimeout)
    currentPollTimeout = null
  }

  let currentIntervalMs = POLL_INTERVAL_MS
  let consecutiveFailures = 0

  const scheduleNext = () => {
    currentPollTimeout = setTimeout(async () => {
      currentPollTimeout = null
      const { data, error } = await fetchPendingEvents()

      if (error) {
        consecutiveFailures++
        console.error("[Realtime] Error polling for events:", error)
        if (consecutiveFailures >= CONSECUTIVE_FAILURES_BEFORE_NOTIFY) {
          onError?.(error)
        }
        currentIntervalMs = Math.min(
          Math.round(currentIntervalMs * BACKOFF_MULTIPLIER),
          MAX_POLL_INTERVAL_MS
        )
      } else {
        consecutiveFailures = 0
        currentIntervalMs = POLL_INTERVAL_MS
        if (data && data.length > 0) {
          for (const event of data) {
            if (event.id !== lastCheckedEventId) {
              lastCheckedEventId = event.id
              onLongRestEvent(event)
              break
            }
          }
        }
      }
      scheduleNext()
    }, currentIntervalMs)
  }

  scheduleNext()

  return {
    unsubscribe: () => {
      if (currentPollTimeout) {
        clearTimeout(currentPollTimeout)
        currentPollTimeout = null
      }
      lastCheckedEventId = null
    },
  }
}

/**
 * Broadcast a long rest event to all connected clients via database
 * This creates a database record that other clients will pick up via polling
 */
export const broadcastLongRestEvent = async (
  initiatedByCharacterId: string,
  selectedCharacterIds: string[],
  eventData: LongRestEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> => {
  try {
    
    const { data, error } = await supabase
      .from('long_rest_events')
      .insert({
        initiated_by_character_id: initiatedByCharacterId,
        selected_character_ids: selectedCharacterIds,
        event_type: 'long_rest_started',
        event_data: eventData,
        status: 'pending',
      })
      .select()
      .maybeSingle()

    if (error) {
      console.error("[Realtime] Error broadcasting long rest event:", error)
      return { success: false, error: error.message }
    }

    return { success: true, eventId: data.id }
  } catch (error) {
    console.error("[Realtime] Error in broadcastLongRestEvent:", error)
    return { success: false, error: "Failed to broadcast long rest event" }
  }
}

/**
 * Confirm a long rest event (any player can confirm)
 * This updates the database record to mark the event as completed
 */
export const confirmLongRestEvent = async (
  eventId: string,
  confirmedByCharacterId: string,
  finalEventData?: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    
    // First, check if the event exists and is still pending
    const { data: existingEvent, error: fetchError } = await supabase
      .from('long_rest_events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle()

    if (fetchError) {
      console.error("[Realtime] Error fetching event for confirmation:", fetchError)
      return { success: false, error: "Event not found" }
    }

    if (!existingEvent) {
      console.error("[Realtime] Event not found:", eventId)
      return { success: false, error: "Event not found" }
    }

    if (existingEvent.status !== 'pending') {
      return { success: true } // Return success since it's already processed
    }
    
    const updateData: any = {
      status: 'completed',
      processed_at: new Date().toISOString(),
      confirmed_by_character_id: confirmedByCharacterId,
      confirmed_at: new Date().toISOString()
    }
    
    if (finalEventData) {
      updateData.event_data = finalEventData
    }

    const { error } = await supabase
      .from('long_rest_events')
      .update(updateData)
      .eq('id', eventId)
      .eq('status', 'pending') // Only update if still pending to prevent race conditions

    if (error) {
      console.error("[Realtime] Error confirming long rest event:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("[Realtime] Error in confirmLongRestEvent:", error)
    return { success: false, error: "Failed to confirm long rest event" }
  }
}

/**
 * Mark a long rest event as completed (legacy function, use confirmLongRestEvent instead)
 */
export const markLongRestEventCompleted = async (
  eventId: string,
  finalEventData?: any
): Promise<{ success: boolean; error?: string }> => {
  return confirmLongRestEvent(eventId, '', finalEventData)
}

/**
 * Get recent long rest events (for debugging or history)
 */
export const getRecentLongRestEvents = async (
  limit: number = 10
): Promise<{ events: LongRestEvent[]; error?: string }> => {
  try {
    const { data, error } = await supabase
      .from('long_rest_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error("[Realtime] Error fetching recent events:", error)
      return { events: [], error: error.message }
    }

    return { events: data || [] }
  } catch (error) {
    console.error("[Realtime] Error in getRecentLongRestEvents:", error)
    return { events: [], error: "Failed to fetch recent events" }
  }
}
