import { createClient } from '@/lib/supabase/server'
import type { User } from '@/lib/types/database'

export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError || !userData) return null

    return userData
  } catch {
    return null
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser()
  if (user.role !== 'admin') {
    throw new Error('Forbidden')
  }
  return user
}
