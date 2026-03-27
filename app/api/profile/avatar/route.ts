import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('avatar') as File | null
  if (!file) {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Только изображения разрешены' }, { status: 400 })
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Файл слишком большой (максимум 5МБ)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const filePath = `avatars/${user.id}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('uploads')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Get public URL
  const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(filePath)
  const avatarUrl = urlData.publicUrl

  // Update user record
  const { error: updateError } = await supabase
    .from('users')
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ avatarUrl })
}
