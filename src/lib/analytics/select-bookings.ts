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

/**
 * 後から追加した列（SQL未実行の環境では存在しない）を含めて予約を取得する。
 * 列が無ければその列を外して取り直し、画面が落ちないようにする。
 */
export async function selectBookingsWithOptional<T>(
  supabase: SupabaseClient,
  baseColumns: string,
  optionalColumns: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refine?: (query: any) => any,
): Promise<T[]> {
  let optional = [...optionalColumns]
  for (let i = 0; i <= optionalColumns.length; i++) {
    const columns = [baseColumns, ...optional].join(', ')
    const base = supabase.from('bookings').select(columns)
    const { data, error } = await (refine ? refine(base) : base)
    if (!error) return (data ?? []) as T[]
    const missing = optional.find(c => isMissingColumn(error, c))
    if (!missing) return []
    optional = optional.filter(c => c !== missing)
  }
  return []
}
