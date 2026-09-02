import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  CLEANING_STAFF_SELECT as SELECT,
  withAccountStatus,
  type CleaningStaffRow as Staff,
} from '@/lib/cleaning/staff'

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim().toLowerCase()
  return v || null
}

function invalidEmail(email: string): boolean {
  return email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
