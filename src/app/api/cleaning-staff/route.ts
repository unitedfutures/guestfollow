import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 清掃担当者はアカウントを持つ人と持たない人が混在する。
// アカウントの有無は cleaning_staff.email を facility_members / facility_invitations と
// 突き合わせて判定する（状態を二重に持たない）。
export type AccountStatus = 'none' | 'invited' | 'active'

const SELECT = 'id, name, email, active, created_at'

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  if (!v) return null
  return v
}

function invalidEmail(email: string): boolean {
  return email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type Staff = { id: string; name: string; email: string | null; active: boolean; created_at: string }

// 担当者ごとに「アカウント状態」と「参加中の施設名」を付与して返す
async function withAccountStatus(
  staff: Staff[],
  ownerId: string
): Promise<(Staff & { account_status: AccountStatus; facilities: string[] })[]> {
  const emails = staff.map(s => s.email).filter((e): e is string => !!e)
  if (emails.length === 0) {
    return staff.map(s => ({ ...s, account_status: 'none' as const, facilities: [] }))
  }

  const service = createServiceRoleClient()

  // オーナーが持つ施設だけを対象にする
  const { data: facilities } = await service
    .from('facilities')
    .select('id, name')
    .eq('user_id', ownerId)

  const facilityNames = new Map((facilities ?? []).map(f => [f.id, f.name as string]))
  const facilityIds = [...facilityNames.keys()]
  if (facilityIds.length === 0) {
    return staff.map(s => ({ ...s, account_status: 'none' as const, facilities: [] }))
  }

  // 参加済みメンバー：user_id からメールアドレスを引く必要がある
  const { data: members } = await service
    .from('facility_members')
    .select('facility_id, user_id')
    .in('facility_id', facilityIds)

  const activeByEmail = new Map<string, string[]>()
  for (const m of members ?? []) {
    const { data: { user: memberUser } } = await service.auth.admin.getUserById(m.user_id)
    const email = memberUser?.email?.toLowerCase()
    if (!email || !emails.includes(email)) continue
    const list = activeByEmail.get(email) ?? []
    list.push(facilityNames.get(m.facility_id) ?? '')
    activeByEmail.set(email, list)
  }

  // 招待中（未承認かつ有効期限内）
  const { data: invitations } = await service
    .from('facility_invitations')
    .select('facility_id, invited_email')
    .in('facility_id', facilityIds)
    .in('invited_email', emails)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())

  const invitedByEmail = new Map<string, string[]>()
  for (const inv of invitations ?? []) {
    const email = (inv.invited_email as string).toLowerCase()
    const list = invitedByEmail.get(email) ?? []
    list.push(facilityNames.get(inv.facility_id) ?? '')
    invitedByEmail.set(email, list)
  }

  return staff.map(s => {
    const email = s.email?.toLowerCase()
    if (!email) return { ...s, account_status: 'none' as const, facilities: [] }
    const active = activeByEmail.get(email)
    if (active?.length) return { ...s, account_status: 'active' as const, facilities: active }
    const invited = invitedByEmail.get(email)
    if (invited?.length) return { ...s, account_status: 'invited' as const, facilities: invited }
    return { ...s, account_status: 'none' as const, facilities: [] }
  })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('cleaning_staff')
    .select(SELECT)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    // email 列を追加するSQL（supabase/add-cleaning-staff-email.sql）が未実行のとき
    if (error.code === '42703') {
      return NextResponse.json({
        error: 'データベースの更新が未適用です。supabase/add-cleaning-staff-email.sql を実行してください。',
      }, { status: 503 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(await withAccountStatus((data ?? []) as Staff[], user.id))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, email } = await request.json()
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
  }
  if (name.trim().length > 100) {
    return NextResponse.json({ error: '名前は100文字以内で入力してください' }, { status: 400 })
  }

  // メールアドレスは任意。入れた場合のみ形式を確認する
  const mail = normalizeEmail(email)
  if (mail && invalidEmail(mail)) {
    return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cleaning_staff')
    .insert({ user_id: user.id, name: name.trim(), email: mail })
    .select(SELECT)
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'このメールアドレスの清掃担当者は既に登録されています' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const [withStatus] = await withAccountStatus([data as Staff], user.id)
  return NextResponse.json(withStatus)
}

// 名前・メールアドレスの変更（あとからメールアドレスを足せるようにする）
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const patch: { name?: string; email?: string | null } = {}

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
    }
    if (body.name.trim().length > 100) {
      return NextResponse.json({ error: '名前は100文字以内で入力してください' }, { status: 400 })
    }
    patch.name = body.name.trim()
  }

  if (body.email !== undefined) {
    const mail = normalizeEmail(body.email)
    if (mail && invalidEmail(mail)) {
      return NextResponse.json({ error: 'メールアドレスの形式が正しくありません' }, { status: 400 })
    }
    patch.email = mail
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: '更新する項目がありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('cleaning_staff')
    .update(patch)
    .eq('id', id)
    .eq('user_id', user.id)
    .select(SELECT)
    .maybeSingle()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'このメールアドレスの清掃担当者は既に登録されています' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: '対象が見つかりません' }, { status: 404 })

  const [withStatus] = await withAccountStatus([data as Staff], user.id)
  return NextResponse.json(withStatus)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { error } = await supabase
    .from('cleaning_staff')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
