import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect authenticated users away from login page
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Backward compat: ?character=UUID → /{campaignSlug}/{characterSlug}
  const charParam = request.nextUrl.searchParams.get('character')
  if (charParam && UUID_REGEX.test(charParam) && request.nextUrl.pathname === '/') {
    try {
      const { data } = await supabase
        .from('characters')
        .select('slug, campaigns:campaign_id(slug)')
        .eq('id', charParam)
        .maybeSingle()

      if (data?.slug) {
        const campaignSlug = (data.campaigns as any)?.slug
        const newPath = campaignSlug
          ? `/${campaignSlug}/${data.slug}`
          : `/${data.slug}`
        const redirectUrl = new URL(newPath, request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl, { status: 301 })
        // Preserve auth cookies
        supabaseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })
        return redirectResponse
      }
    } catch (err) {
      console.error('Error resolving ?character redirect:', err)
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely.

  return supabaseResponse
}
