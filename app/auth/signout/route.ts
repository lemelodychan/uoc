import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = createClient()

  // Check if we have a session to retrieve
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    await supabase.auth.signOut()
  }

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  })
}
