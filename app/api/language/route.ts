import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { locale } = await request.json()
    const validLocale = ['ru', 'kz'].includes(locale) ? locale : 'ru'

    const response = NextResponse.json({ success: true })
    response.cookies.set('locale', validLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    })

    return response
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
