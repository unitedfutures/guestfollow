import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      guest_name, guest_email, checkin_date, checkout_date, num_guests, ota_source,
      facilities(name),
      guest_records(
        full_name, address, phone, email, num_guests,
        nationality, passport_number,
        terms_agreed_at, checkin_completed_at, created_at, delete_after
      )
    `)
    .order('checkin_date', { ascending: false })

  if (!bookings) return NextResponse.json({ error: 'データなし' }, { status: 500 })

  const headers = [
    '施設名', '予約システム', 'チェックイン日', 'チェックアウト日',
    '宿泊者氏名', 'SC登録氏名', 'SCメール',
    '住所', '電話番号', 'メール', '宿泊人数',
    '国籍', '旅券番号', '規約同意日時', 'チェックイン完了日時', '登録日', '削除予定日'
  ]

  const rows = bookings.map(b => {
    const f = b.facilities as unknown as { name: string } | null
    const gr = (Array.isArray(b.guest_records) ? b.guest_records[0] : b.guest_records) as unknown as {
      full_name: string; address: string; phone: string; email: string; num_guests: number;
      nationality: string; passport_number: string; terms_agreed_at: string;
      checkin_completed_at: string; created_at: string; delete_after: string;
    } | null

    return [
      f?.name ?? '',
      b.ota_source ?? '手動',
      b.checkin_date,
      b.checkout_date,
      gr?.full_name ?? '',
      b.guest_name ?? '',
      b.guest_email ?? '',
      gr?.address ?? '',
      gr?.phone ?? '',
      gr?.email ?? '',
      gr?.num_guests ?? b.num_guests,
      gr?.nationality ?? '',
      gr?.passport_number ?? '',
      gr?.terms_agreed_at ?? '',
      gr?.checkin_completed_at ?? '',
      gr?.created_at?.split('T')[0] ?? '',
      gr?.delete_after ?? '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
  })

  const bom = '﻿'
  const csv = bom + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="guestbook_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
