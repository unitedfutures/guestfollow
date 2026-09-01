import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardChrome } from '@/components/dashboard/dashboard-chrome'
import { getAccountAccess } from '@/lib/auth/roles'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { isCleanerOnly } = await getAccountAccess()

  return (
    <DashboardChrome cleanerOnly={isCleanerOnly}>
      {children}
    </DashboardChrome>
  )
}
