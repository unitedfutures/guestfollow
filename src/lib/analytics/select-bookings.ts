import type { SupabaseClient } from '@supabase/supabase-js'
import { isMissingColumn } from '@/lib/beds24/sync-write'

/**
 * 売上集計用に予約を取得する。
 * invoice_total（請求合計）は supabase/add-invoice-total.sql を実行するまで存在しないため、
 * 列が無いデータベースでは自動的に price だけで取得し直す（画面が落ちないようにする）。
 */
export async function selectBookingsForRevenue<T>(
  supabase: SupabaseClient,
  columns: string,
): Promise<T[]> {
  const withInvoice = `${columns}, invoice_total`
  const { data, error } = await supabase.from('bookings').select(withInvoice)
  if (isMissingColumn(error, 'invoice_total')) {
    const { data: fallback } = await supabase.from('bookings').select(columns)
    return (fallback ?? []) as T[]
  }
  return (data ?? []) as T[]
}
