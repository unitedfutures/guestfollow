import type { SupabaseClient } from '@supabase/supabase-js'

// 宿泊者の画像は予約の登録経路によって保存先のバケットが異なる
const IMAGE_BUCKETS = ['passport-images', 'face-photos'] as const

/**
 * 退会：指定したアカウントと、そのアカウントがオーナーの施設のデータを削除する。
 * admin には service role のクライアントを渡す。
 *
 * データベースの行は auth.users からの ON DELETE CASCADE で消える。その前に、
 * 次の「連鎖で消えては困るもの」「連鎖では消えないもの」を処理する。
 * - 他のオーナーの施設で自分が作成・同期した予約／メッセージ（user_id が自分）
 *   → 施設オーナーに付け替える（付け替えないとオーナーの予約が消える）
 * - 自分が送った招待の invited_by（ON DELETE 指定なしで削除を妨げる）→ null にする
 * - Storage の宿泊者画像（DBの連鎖削除の対象外）→ ユーザー削除の成功後に消す
 */
export async function withdrawAccount(
  admin: SupabaseClient,
  user: { id: string; email: string | null },
): Promise<{ error?: string }> {
  const fail = (step: string, message: string) => ({ error: `${step}: ${message}` })

  // 自分がオーナーの施設（施設ごと削除される）
  const { data: ownFacilities, error: facErr } = await admin
    .from('facilities').select('id').eq('user_id', user.id)
  if (facErr) return fail('施設の取得', facErr.message)
  const ownIds = new Set((ownFacilities ?? []).map(f => f.id as string))

  // 他のオーナーの施設にある、自分の user_id が付いた行をオーナーへ付け替える
  for (const table of ['bookings', 'messages'] as const) {
    const { data: rows, error } = await admin
      .from(table).select('facility_id').eq('user_id', user.id)
    if (error) return fail(`${table}の取得`, error.message)
    const facilityIds = [...new Set((rows ?? []).map(r => r.facility_id as string))]
      .filter(id => !ownIds.has(id))
    if (facilityIds.length === 0) continue

    const { data: owners, error: ownErr } = await admin
      .from('facilities').select('id, user_id').in('id', facilityIds)
    if (ownErr) return fail('施設オーナーの取得', ownErr.message)

    for (const o of owners ?? []) {
      const { error: upErr } = await admin
        .from(table).update({ user_id: o.user_id })
        .eq('user_id', user.id).eq('facility_id', o.id)
      if (upErr) return fail(`${table}の付け替え`, upErr.message)
    }
  }

  // 自分が送った招待の記録を残しつつ、削除の妨げにならないようにする
  for (const table of ['facility_members', 'facility_invitations'] as const) {
    const { error } = await admin.from(table).update({ invited_by: null }).eq('invited_by', user.id)
    if (error) return fail(`${table}の更新`, error.message)
  }
  // 自分宛ての未承諾の招待は不要になる
  if (user.email) {
    // 大文字小文字を区別せずに一致させる。_ や % が他人のアドレスに当たらないようエスケープする
    const pattern = user.email.replace(/[\\%_]/g, '\\$&')
    const { error } = await admin.from('facility_invitations').delete()
      .ilike('invited_email', pattern).is('accepted_at', null)
    if (error) return fail('招待の削除', error.message)
  }

  // 削除前に、自分の施設の宿泊者画像のパスを控える
  const imagePaths: string[] = []
  if (ownIds.size > 0) {
    const { data: guests, error } = await admin
      .from('guest_records').select('passport_image_path, face_photo_path')
      .in('facility_id', [...ownIds])
    if (error) return fail('宿泊者画像の取得', error.message)
    for (const g of guests ?? []) {
      if (g.passport_image_path) imagePaths.push(g.passport_image_path)
      if (g.face_photo_path) imagePaths.push(g.face_photo_path)
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id)
  if (delErr) return fail('アカウントの削除', delErr.message)

  // 画像の削除に失敗してもアカウントは削除済みのため、退会自体は成功として扱う
  for (const bucket of IMAGE_BUCKETS) {
    for (let i = 0; i < imagePaths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(imagePaths.slice(i, i + 100))
      if (error) console.error(`[account] ${bucket} の画像削除に失敗:`, error.message)
    }
  }

  return {}
}
