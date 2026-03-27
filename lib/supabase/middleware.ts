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

  if ((isProtected || isAdmin) && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAdmin && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userData?.role !== 'admin') {
      return NextResponse.redirect(new URL('/courses', request.url))
    }
  }

  if (isAuth && user) {
    return NextResponse.redirect(new URL('/courses', request.url))
  }

  // Persist locale cookie
  const locale = request.cookies.get('locale')?.value || 'ru'
  const validLocale = ['ru', 'kz'].includes(locale) ? locale : 'ru'
  supabaseResponse.cookies.set('locale', validLocale, { path: '/' })

  return supabaseResponse
}
