import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getBaseSettings, updateBaseSettings, type Beds24BaseSettings } from '@/lib/beds24/client'
import { resolveBeds24Token } from '@/lib/ota/token'
import { canManage } from '@/lib/auth/can-manage'

type FacilityRow = { id: string; beds24_property_id: string | null; ota_account_id: string | null }

// 施設・部屋を確認し、権限のある利用者にだけ操作させる
async function loadFacility(request: Request, facilityId: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!facilityId) return { error: NextResponse.json({ error: 'facility_id は必須です' }, { status: 400 }) }

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, beds24_property_id, ota_account_id')
    .eq('id', facilityId)
    .single()
  if (!facility) return { error: NextResponse.json({ error: '施設が見つかりません' }, { status: 404 }) }
  if (!facility.beds24_property_id) {
    return { error: NextResponse.json({ error: 'この施設はBeds24と連携していません' }, { status: 400 }) }
  }
  if (!(await canManage(supabase, facility.id, user.id))) {
    return { error: NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 }) }
  }
  return { supabase, user, facility: facility as FacilityRow }
}

// 基本設定の現在値をBeds24から取得
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const roomId = searchParams.get('room_id')
  const loaded = await loadFacility(request, searchParams.get('facility_id'))
  if (loaded.error) return loaded.error
  if (!roomId) return NextResponse.json({ error: 'room_id は必須です' }, { status: 400 })

  const { token } = await resolveBeds24Token(loaded.supabase, loaded.user.id, loaded.facility, 'read')
  if (!token) return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })

  try {
    const settings = await getBaseSettings(token, loaded.facility.beds24_property_id!, roomId)
    return NextResponse.json({ settings })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `基本設定の取得に失敗しました: ${msg}` }, { status: 502 })
  }
}

// 基本設定をBeds24へ反映
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}))
  const { facility_id, room_id, settings, fixed_price_id, allow_create } = body as {
    facility_id?: string; room_id?: string; settings?: Partial<Beds24BaseSettings>
    fixed_price_id?: number | null; allow_create?: boolean
  }
  const loaded = await loadFacility(request, facility_id ?? null)
  if (loaded.error) return loaded.error
  if (!room_id) return NextResponse.json({ error: 'room_id は必須です' }, { status: 400 })

  // 入力を検証（Beds24が受け付ける範囲に収める）
  const int = (v: unknown) => Math.floor(Number(v))
  const inRange = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max
  const clean: Beds24BaseSettings = {
    basePeople: int(settings?.basePeople),
    extraPersonPrice: int(settings?.extraPersonPrice),
    minNights: int(settings?.minNights),
    maxNights: int(settings?.maxNights),
    minAdvance: int(settings?.minAdvance),
    maxAdvance: int(settings?.maxAdvance),
  }
  if (!inRange(clean.basePeople, 0, 99)) return NextResponse.json({ error: '基本人数は0〜99で入力してください（0で定員を使用）' }, { status: 400 })
  if (!inRange(clean.extraPersonPrice, 0, 10_000_000)) return NextResponse.json({ error: '人数追加料金が正しくありません' }, { status: 400 })
  if (!inRange(clean.minNights, 0, 99)) return NextResponse.json({ error: '最低宿泊日数は0〜99で入力してください' }, { status: 400 })
  if (!inRange(clean.maxNights, 1, 365)) return NextResponse.json({ error: '最大宿泊日数は1〜365で入力してください' }, { status: 400 })
  if (clean.maxNights < clean.minNights) return NextResponse.json({ error: '最大宿泊日数は最低宿泊日数以上にしてください' }, { status: 400 })
  if (!inRange(clean.minAdvance, 0, 999) || !inRange(clean.maxAdvance, 0, 999)) {
    return NextResponse.json({ error: 'チェックインまでの日数は0〜999で入力してください' }, { status: 400 })
  }
  if (clean.maxAdvance > 0 && clean.maxAdvance < clean.minAdvance) {
    return NextResponse.json({ error: 'チェックインまでの日数（最長）は最短以上にしてください' }, { status: 400 })
  }

  const { token, source } = await resolveBeds24Token(loaded.supabase, loaded.user.id, loaded.facility, 'write')
  if (!token) return NextResponse.json({ error: 'Beds24のトークンが設定されていません' }, { status: 400 })
  if (source !== 'refresh') {
    return NextResponse.json({
      error: '基本設定の反映には書き込み権限が必要です。設定 → サイトコントローラー連携で、write:inventory スコープを含む invite code から「Refresh Token」を設定してください。',
    }, { status: 400 })
  }
  // Beds24に「日別料金」が無い場合の新規作成は、画面で同意を得てから行う
  if (!fixed_price_id && !allow_create) {
    return NextResponse.json({ error: 'Beds24に日別料金の設定が無いため、新規作成の確認が必要です' }, { status: 400 })
  }

  try {
    const result = await updateBaseSettings(token, room_id, clean, { fixedPriceId: fixed_price_id ?? null })
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: `基本設定の反映に失敗しました: ${msg}` }, { status: 502 })
  }
}
