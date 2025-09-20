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

/**
 * Subscribe to long rest events for real-time updates
 */
export const subscribeToLongRestEvents = (
  onLongRestEvent: (event: LongRestEvent) => void,
  onError?: (error: any) => void
) => {
  console.log("[Realtime] Subscribing to long rest events...")
  
  const subscription = supabase
    .channel('long_rest_events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'long_rest_events',
        filter: 'status=eq.pending'
      },
      (payload) => {
        console.log("[Realtime] Received long rest event:", payload)
        onLongRestEvent(payload.new as LongRestEvent)
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'long_rest_events',
        filter: 'status=eq.completed'
      },
      (payload) => {
        console.log("[Realtime] Long rest event completed:", payload)
        onLongRestEvent(payload.new as LongRestEvent)
      }
    )
    .subscribe((status) => {
      console.log("[Realtime] Subscription status:", status)
      if (status === 'SUBSCRIBED') {
        console.log("[Realtime] Successfully subscribed to long rest events")
      } else if (status === 'CHANNEL_ERROR') {
        console.error("[Realtime] Channel error occurred")
        onError?.(new Error("Failed to subscribe to long rest events"))
      }
    })

  return subscription
}

/**
 * Broadcast a long rest event to all connected clients
 */
export const broadcastLongRestEvent = async (
  initiatedByCharacterId: string,
  selectedCharacterIds: string[],
  eventData: LongRestEventData
): Promise<{ success: boolean; error?: string; eventId?: string }> => {
  try {
    console.log("[Realtime] Broadcasting long rest event...")
    
    const { data, error } = await supabase
      .from('long_rest_events')
      .insert({
        initiated_by_character_id: initiatedByCharacterId,
        selected_character_ids: selectedCharacterIds,
        event_type: 'long_rest_started',
        event_data: eventData,
        status: 'pending',
        // confirmed_by_character_id and confirmed_at are intentionally omitted
        // as they will be set when the event is confirmed
      })
      .select()
      .single()

    if (error) {
      console.error("[Realtime] Error broadcasting long rest event:", error)
      return { success: false, error: error.message }
    }

    console.log("[Realtime] Long rest event broadcasted successfully:", data.id)
    return { success: true, eventId: data.id }
  } catch (error) {
    console.error("[Realtime] Error in broadcastLongRestEvent:", error)
    return { success: false, error: "Failed to broadcast long rest event" }
  }
}

/**
 * Confirm a long rest event (any player can confirm)
 */
export const confirmLongRestEvent = async (
  eventId: string,
  confirmedByCharacterId: string,
  finalEventData?: any
): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log("[Realtime] Confirming long rest event:", eventId, "by character:", confirmedByCharacterId)
    
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

    if (error) {
      console.error("[Realtime] Error confirming long rest event:", error)
      return { success: false, error: error.message }
    }

    console.log("[Realtime] Long rest event confirmed successfully")
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
