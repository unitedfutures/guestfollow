import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // オープンリダイレクト対策：同一オリジンの相対パス（"/..."）のみ許可。
  // "//evil.com" "@evil.com" ".evil.com" 等は既定の /dashboard に置き換える。
  const rawRedirect = searchParams.get('redirect') || '/dashboard'
  const redirect = /^\/(?![\/\\@.])[^\s]*$/.test(rawRedirect) ? rawRedirect : '/dashboard'

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

  return NextResponse.redirect(new URL(redirect, origin))
}
