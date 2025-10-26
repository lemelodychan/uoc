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

// Store polling interval reference for cleanup
let pollingInterval: NodeJS.Timeout | null = null
let lastCheckedEventId: string | null = null

/**
 * Subscribe to long rest events using database polling instead of websockets
 * This avoids websocket connection issues while maintaining collaborative functionality
 */
export const subscribeToLongRestEvents = (
  onLongRestEvent: (event: LongRestEvent) => void,
  onError?: (error: any) => void
) => {
  
  // Clear any existing polling
  if (pollingInterval) {
    clearInterval(pollingInterval)
  }
  
  // Poll the database every 2 seconds for new long rest events
  pollingInterval = setInterval(async () => {
    try {
      const { data, error } = await supabase
        .from('long_rest_events')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5) // Get more events to handle multiple pending events

      if (error) {
        console.error("[Realtime] Error polling for events:", error)
        onError?.(error)
        return
      }

      if (data && data.length > 0) {
        // Process events in order, but only if we haven't seen them before
        for (const event of data) {
          if (event.id !== lastCheckedEventId) {
            lastCheckedEventId = event.id
            onLongRestEvent(event as LongRestEvent)
            break // Only process one event at a time to avoid conflicts
          }
        }
      }
    } catch (error) {
      console.error("[Realtime] Polling error:", error)
      onError?.(error)
    }
  }, 2000) // Poll every 2 seconds
  
  // Return subscription object with cleanup function
  return {
    unsubscribe: () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
        pollingInterval = null
      }
      lastCheckedEventId = null
    }
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
