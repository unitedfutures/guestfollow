import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { WITHDRAW_CONFIRM_TEXT } from '@/lib/account'
import { withdrawAccount } from '@/lib/account-withdraw'

/** 退会：ログイン中のアカウントと、そのアカウントがオーナーの施設のデータを削除する */
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { confirm } = await request.json().catch(() => ({}))
  if (confirm !== WITHDRAW_CONFIRM_TEXT) {
    return NextResponse.json({ error: `確認のため「${WITHDRAW_CONFIRM_TEXT}」と入力してください` }, { status: 400 })
  }

  const { error } = await withdrawAccount(createServiceRoleClient(), { id: user.id, email: user.email ?? null })
  if (error) return NextResponse.json({ error: `退会処理に失敗しました（${error}）` }, { status: 500 })
  return NextResponse.json({ success: true })
}
