import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const protectedRoutes = ['/courses', '/profile', '/certificates']
const adminRoutes = ['/admin']
const authRoutes = ['/login', '/forgot-password', '/reset-password']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: any[]) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r))
  const isAdmin = adminRoutes.some((r) => pathname.startsWith(r))
  const isAuth = authRoutes.some((r) => pathname.startsWith(r))

  // Not a route we need to protect — pass through
  if (!isProtected && !isAdmin && !isAuth) {
    return supabaseResponse
  }

  if ((isProtected || isAdmin) && !user) {
    const url = new URL('/login', request.url)
    // Prevent redirect loop
    if (pathname !== '/login') {
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  if (isAdmin && user) {
    // Skip RLS — just let the page handle role check
    // Don't query DB in middleware to avoid RLS issues
  }

  if (isAuth && user) {
    // User is logged in but on auth page — redirect to courses
    // But only if not already redirecting (prevent loop)
    if (!request.nextUrl.searchParams.has('redirected')) {
      const url = new URL('/courses', request.url)
      url.searchParams.set('redirected', '1')
      return NextResponse.redirect(url)
    }
  }

  // Persist locale cookie
  const locale = request.cookies.get('locale')?.value || 'ru'
  const validLocale = ['ru', 'kz'].includes(locale) ? locale : 'ru'
  supabaseResponse.cookies.set('locale', validLocale, { path: '/' })

  return supabaseResponse
}
