import { redirect } from 'next/navigation'
import { ThemeProvider } from '@/components/ui/theme-provider'
import { Sidebar } from '@/components/student/Sidebar'
import { BottomNav } from '@/components/student/BottomNav'
import { createClient } from '@/lib/supabase/server'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is blocked
  const { data: profileRaw } = await supabase
    .from('users')
    .select('status, role')
    .eq('id', user.id)
    .single()

  const profile = profileRaw as { status: string; role: string } | null

  if (!profile || profile.status === 'blocked') {
    redirect('/login?error=blocked')
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:shrink-0">
          <Sidebar />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <div className="min-h-full">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav />
      </div>
    </ThemeProvider>
  )
}
