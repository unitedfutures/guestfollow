import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST: 招待を承認してメンバーに追加
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 })

  const { token } = await request.json()
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  const serviceSupabase = createServiceRoleClient()

  // 招待レコード確認
  const { data: invitation } = await serviceSupabase
    .from('facility_invitations')
    .select('id, facility_id, invited_email, role, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (!invitation) {
    return NextResponse.json({ error: '招待リンクが無効です' }, { status: 404 })
  }

  if (invitation.accepted_at) {
    return NextResponse.json({ error: 'この招待リンクは既に使用済みです' }, { status: 409 })
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json({ error: '招待リンクの有効期限が切れています' }, { status: 410 })
  }

  // 招待先メールアドレスとログインユーザーのメールが一致する場合のみ承認可
  const invitedEmail = (invitation.invited_email ?? '').trim().toLowerCase()
  const userEmail = (user.email ?? '').trim().toLowerCase()
  if (!invitedEmail || invitedEmail !== userEmail) {
    return NextResponse.json({
      error: 'この招待は別のメールアドレス宛です。招待されたメールアドレスでログインしてください。',
    }, { status: 403 })
  }

  // 施設オーナー自身は参加不要
  const { data: facility } = await serviceSupabase
    .from('facilities')
    .select('user_id, name')
    .eq('id', invitation.facility_id)
    .single()

  if (facility?.user_id === user.id) {
    return NextResponse.json({ error: 'オーナーはすでにこの施設を管理しています' }, { status: 409 })
  }

  // 既にメンバーかどうか確認
  const { data: existingMember } = await serviceSupabase
    .from('facility_members')
    .select('id')
    .eq('facility_id', invitation.facility_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    // すでにメンバー → 招待を承認済みにして成功返却
    await serviceSupabase
      .from('facility_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invitation.id)
    return NextResponse.json({ success: true, facility_name: facility?.name })
  }

  // facility_membersに追加（service_roleでRLSバイパス）
  const { error: insertError } = await serviceSupabase
    .from('facility_members')
    .insert({
      facility_id: invitation.facility_id,
      user_id: user.id,
      role: invitation.role ?? 'manager',
      invited_by: null, // invitedByはinvitationsから参照可能
    })

  if (insertError) {
    return NextResponse.json({ error: 'メンバー追加に失敗しました: ' + insertError.message }, { status: 500 })
  }

  // 招待を承認済みにする
  await serviceSupabase
    .from('facility_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return NextResponse.json({ success: true, facility_name: facility?.name })
}
