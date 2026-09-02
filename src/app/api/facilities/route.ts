import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, address, beds24_property_id, airhost_property_id, remote_lock_device_id, emergency_contact, checkin_instructions } = body

  if (!name) return NextResponse.json({ error: '施設名は必須です' }, { status: 400 })

  const { data, error } = await supabase
    .from('facilities')
    .insert({ user_id: user.id, name, address, beds24_property_id, airhost_property_id, remote_lock_device_id, emergency_contact, checkin_instructions })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  // 更新可能なカラムを明示（user_id / qr_slug / 予約トークン等の書き換えを防ぐ）
  const ALLOWED = [
    'name', 'address', 'beds24_property_id', 'airhost_property_id', 'remote_lock_device_id',
    'emergency_contact', 'checkin_instructions', 'pin_code', 'camera_checkin', 'memo',
    'max_guests', 'form_config', 'survey_config', 'ota_account_id',
    'accommodation_tax', 'pricing_rules',
  ] as const
  const fields: Record<string, unknown> = {}
  for (const k of ALLOWED) if (k in body) fields[k] = body[k]
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: '更新項目がありません' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('facilities')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })

  const { error } = await supabase.from('facilities').delete().eq('id', id).eq('user_id', user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
