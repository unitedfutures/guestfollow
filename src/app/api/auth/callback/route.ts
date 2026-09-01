import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirect = searchParams.get('redirect') || '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    // サインアップ時に入力した会社名（auth メタデータ）を profiles に反映する。
    // DBトリガー handle_new_user は id / email しか作らないため、ここで補完する。
    const user = data?.user
    const companyName = (user?.user_metadata?.company_name as string | undefined)?.trim()
    if (user && companyName) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', user.id)
        .maybeSingle()
      if (!profile?.company_name) {
        await supabase
          .from('profiles')
          .update({ company_name: companyName, updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }
    }
  }

  return NextResponse.redirect(`${origin}${redirect}`)
}
