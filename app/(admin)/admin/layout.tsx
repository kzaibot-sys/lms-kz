import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileRaw } = await supabase
    .from('users')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { role: string; first_name: string; last_name: string } | null

  if (!profile || profile.role !== 'admin') {
    redirect('/courses')
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar
          adminName={`${profile.first_name} ${profile.last_name}`}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
