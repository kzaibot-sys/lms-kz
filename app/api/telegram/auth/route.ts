import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

function verifyTelegramWebAppData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData)
    const hash = params.get('hash')
    if (!hash) return false

    params.delete('hash')

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('\n')

    const secretKey = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest()

    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex')

    return calculatedHash === hash
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initData } = body

    if (!initData) {
      return NextResponse.json({ error: 'Missing initData' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: 'Telegram bot not configured' }, { status: 503 })
    }

    // Verify Telegram initData
    const isValid = verifyTelegramWebAppData(initData, botToken)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid Telegram data' }, { status: 401 })
    }

    // Parse user data
    const params = new URLSearchParams(initData)
    const userDataStr = params.get('user')
    if (!userDataStr) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 })
    }

    const telegramUser = JSON.parse(userDataStr)
    const telegramEmail = `tg_${telegramUser.id}@telegram.local`

    const adminClient = createAdminClient()

    // Try to find existing user by telegram email
    const { data: existingUser } = await adminClient
      .from('users')
      .select('id, email, status')
      .eq('email', telegramEmail)
      .single()

    let userId: string

    if (existingUser) {
      if (existingUser.status === 'blocked') {
        return NextResponse.json({ error: 'Account blocked' }, { status: 403 })
      }
      userId = existingUser.id
    } else {
      // Create new user
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: telegramEmail,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramUser.id,
          first_name: telegramUser.first_name,
          last_name: telegramUser.last_name ?? '',
        },
      })

      if (authError || !authData.user) {
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
      }

      await adminClient.from('users').insert({
        id: authData.user.id,
        email: telegramEmail,
        first_name: telegramUser.first_name ?? 'User',
        last_name: telegramUser.last_name ?? '',
        role: 'student',
        status: 'active',
        language: 'ru',
      })

      userId = authData.user.id
    }

    // Create a session token using magic link approach
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: telegramEmail,
    })

    if (linkError) {
      return NextResponse.json({ error: 'Failed to generate session' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      userId,
      magicLink: linkData.properties?.action_link,
    })
  } catch (error) {
    console.error('POST /api/telegram/auth error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
