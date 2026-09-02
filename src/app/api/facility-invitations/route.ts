import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { canManage } from '@/lib/auth/can-manage'

const VALID_ROLES = ['manager', 'cleaner']

// GET: 施設のメンバー一覧と招待一覧を取得
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const facilityId = searchParams.get('facility_id')
  if (!facilityId) return NextResponse.json({ error: 'facility_id is required' }, { status: 400 })

  if (!(await canManage(supabase, facilityId, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const serviceSupabase = createServiceRoleClient()
  const { data: members } = await serviceSupabase
    .from('facility_members')
    .select('id, user_id, role, created_at')
    .eq('facility_id', facilityId)
    .order('created_at', { ascending: true })

  const membersWithEmail = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: { user: memberUser } } = await serviceSupabase.auth.admin.getUserById(m.user_id)
      return { ...m, email: memberUser?.email ?? '' }
    })
  )

  const { data: invitations } = await supabase
    .from('facility_invitations')
    .select('id, invited_email, role, token, expires_at, created_at')
    .eq('facility_id', facilityId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ members: membersWithEmail, invitations: invitations ?? [] })
}

// POST: 招待リンクを作成
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { facility_id, invited_email, role = 'manager' } = await request.json()
  if (!facility_id || !invited_email) {
    return NextResponse.json({ error: 'facility_id と invited_email は必須です' }, { status: 400 })
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'ロールが不正です' }, { status: 400 })
  }

  if (!(await canManage(supabase, facility_id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: existing } = await supabase
    .from('facility_invitations')
    .select('id')
    .eq('facility_id', facility_id)
    .eq('invited_email', invited_email.toLowerCase())
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existing) {
    return NextResponse.json({ error: 'このメールアドレスへの有効な招待が既に存在します' }, { status: 409 })
  }

  const { data: invitation, error } = await supabase
    .from('facility_invitations')
    .insert({
      facility_id,
      invited_email: invited_email.toLowerCase(),
      role,
      invited_by: user.id,
    })
    .select('token')
    .single()

  if (error || !invitation) {
    return NextResponse.json({ error: '招待の作成に失敗しました' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const inviteUrl = `${appUrl}/invite/${invitation.token}`

  return NextResponse.json({ invite_url: inviteUrl, token: invitation.token })
}

// DELETE: メンバーの削除 または 招待のキャンセル
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'member' | 'invitation'
  const id = searchParams.get('id')

  if (!type || !id) {
    return NextResponse.json({ error: 'type と id は必須です' }, { status: 400 })
  }

  const table = type === 'member' ? 'facility_members' : type === 'invitation' ? 'facility_invitations' : null
  if (!table) {
    return NextResponse.json({ error: 'typeは member または invitation を指定してください' }, { status: 400 })
  }

  const { data: row } = await supabase.from(table).select('facility_id').eq('id', id).single()
  if (!row) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 })

  if (!(await canManage(supabase, row.facility_id, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
