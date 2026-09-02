import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generatePin(length = 4): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 10)).join('')
}

/**
 * 日本時間(JST)の暦日 "YYYY-MM-DD"。
 * サーバー(Vercel)はUTCで動くため、toISOString() をそのまま使うと
 * JSTの 0:00〜8:59 の間は「前日」になってしまう。チェックイン可否など
 * 日付比較には必ずこちらを使う。
 */
export function jstDate(d: Date = new Date()): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

/** 指定日(YYYY-MM-DD)の JST 23:59:59 を表す Date（暗証番号の有効期限などに使用） */
export function jstEndOfDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59+09:00`)
}

export function formatDate(date: string, locale = 'ja-JP'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: '未送信',
    pre_checkin_sent: '事前登録待ち',
    pre_checkin_done: '事前登録済み',
    checked_in: 'チェックイン済み',
    checked_out: 'チェックアウト済み',
  }
  return labels[status] ?? status
}

export function getStatusVariant(status: string): 'default' | 'warning' | 'info' | 'success' | 'danger' {
  const variants: Record<string, 'default' | 'warning' | 'info' | 'success' | 'danger'> = {
    pending: 'default',
    pre_checkin_sent: 'warning',
    pre_checkin_done: 'info',
    checked_in: 'success',
    checked_out: 'default',
  }
  return variants[status] ?? 'default'
}
