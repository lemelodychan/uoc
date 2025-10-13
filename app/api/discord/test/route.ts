import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { webhookUrl, campaignName } = await req.json()
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json({ error: 'Missing webhookUrl' }, { status: 400 })
    }

    const content = `Test notification${campaignName ? ` for ${campaignName}` : ''}: If you see this, Discord integration works!`

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: 'Webhook POST failed', details: text }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: e?.message }, { status: 500 })
  }
}


