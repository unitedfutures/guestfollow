import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// 予約に清掃担当者を割り当て（null で解除）
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cleaning_staff_id } = await req.json()

  // 担当者が指定されている場合、本人のスタッフか検証
  if (cleaning_staff_id) {
    const { data: staff } = await supabase
      .from('cleaning_staff')
      .select('id')
      .eq('id', cleaning_staff_id)
      .eq('user_id', user.id)
      .single()
    if (!staff) return NextResponse.json({ error: '清掃担当者が見つかりません' }, { status: 404 })
  }

  const { error } = await supabase
    .from('bookings')
    .update({ cleaning_staff_id: cleaning_staff_id || null })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
