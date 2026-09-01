'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Settings2, Save, CheckCircle, Users, CalendarDays, User, Fingerprint } from 'lucide-react'

export type FieldLevel = 'required' | 'optional' | 'off'
export type FormConfig = {
  // パスキー
  passkey:           'required' | 'optional'
  // 基本情報
  face_photo:        FieldLevel
  address:           FieldLevel
  phone:             FieldLevel
  age:               FieldLevel
  nationality:       FieldLevel
  num_guests:        FieldLevel
  // 宿泊日程
  checkin_time:      FieldLevel
  checkout_time:     FieldLevel
  previous_location: FieldLevel
  next_destination:  FieldLevel
}

export const DEFAULT_FORM_CONFIG: FormConfig = {
  passkey:           'required',
  face_photo:        'optional',
  address:           'required',
  phone:             'required',
  age:               'off',
  nationality:       'off',
  num_guests:        'required',
  checkin_time:      'off',
  checkout_time:     'off',
  previous_location: 'off',
  next_destination:  'off',
}

type FieldDef = {
  key: keyof FormConfig
  label: string
  desc: string
  levels: FieldLevel[]
}

const SECTION_BOOKING: FieldDef[] = [
  {
    key: 'num_guests',
    label: '宿泊人数',
    desc: '同伴者を含む宿泊人数',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'checkin_time',
    label: 'チェックイン時間',
    desc: '希望チェックイン時刻（例：15:00）',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'checkout_time',
    label: 'チェックアウト時間',
    desc: '希望チェックアウト時刻（例：10:00）',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'previous_location',
    label: '前出発地',
    desc: '宿泊前日までに滞在していた都市・場所',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'next_destination',
    label: '行き先地',
    desc: 'チェックアウト後の次の目的地',
    levels: ['required', 'optional', 'off'],
  },
]

const SECTION_BASIC: FieldDef[] = [
  {
    key: 'face_photo',
    label: '顔写真',
    desc: '本人確認用の顔写真（防犯カメラとの照合に利用）',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'address',
    label: '住所',
    desc: '宿泊者の住所（旅館業法上の記録として推奨）',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'phone',
    label: '電話番号',
    desc: '緊急時の連絡先',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'age',
    label: '年齢',
    desc: '代表者の年齢',
    levels: ['required', 'optional', 'off'],
  },
  {
    key: 'nationality',
    label: '国籍',
    desc: '日本人含む全宿泊者の国籍（外国人はパスポートで自動設定）',
    levels: ['required', 'optional', 'off'],
  },
]

const LEVEL_LABEL: Record<FieldLevel, string> = {
  required: '必須',
  optional: '任意',
  off:      '非表示',
}
const LEVEL_ACTIVE: Record<FieldLevel, string> = {
  required: 'bg-indigo-100 text-indigo-700 font-semibold',
  optional: 'bg-amber-100 text-amber-700 font-semibold',
  off:      'bg-gray-500 text-white font-semibold',
}

function FieldRow({
  field,
  value,
  onChange,
}: {
  field: FieldDef
  value: FieldLevel
  onChange: (v: FieldLevel) => void
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800">{field.label}</p>
        <p className="text-xs text-gray-400 leading-tight">{field.desc}</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {field.levels.map(level => (
          <button
            key={level}
            onClick={() => onChange(level)}
            className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
              value === level ? LEVEL_ACTIVE[level] : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
          >
            {LEVEL_LABEL[level]}
          </button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  facilityId:       string
  currentConfig?:   Partial<FormConfig>
  currentMaxGuests?: number
}

export function FormConfigEditor({ facilityId, currentConfig, currentMaxGuests = 10 }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<FormConfig>({ ...DEFAULT_FORM_CONFIG, ...currentConfig })
  const [maxGuests, setMaxGuests] = useState(currentMaxGuests)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const set = (key: keyof FormConfig, value: FieldLevel) =>
    setConfig(c => ({ ...c, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: facilityId, form_config: config, max_guests: maxGuests }),
      })
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setSaveError(data.error || '保存に失敗しました。再度お試しください。')
      }
    } catch {
      setSaveError('通信エラーが発生しました。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Settings2 size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">宿泊者名簿設定</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-5 bg-white">

          {/* ── 最大宿泊人数 ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={13} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">最大宿泊人数</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">事前登録フォームの人数選択肢の上限になります。</p>
            <div className="flex items-center gap-3">
              <input
                type="range" min={1} max={30} value={maxGuests}
                onChange={e => setMaxGuests(Number(e.target.value))}
                className="flex-1 accent-indigo-600"
              />
              <span className="w-16 text-center text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1">
                {maxGuests}名
              </span>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── パスキー認証 ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Fingerprint size={13} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">パスキー認証（チェックイン時の生体認証）</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              「任意」にするとゲストがパスキー登録をスキップできます。スキップした場合はメールのリンクのみでチェックインします。
            </p>
            <div className="flex gap-1">
              {(['required', 'optional'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => setConfig(c => ({ ...c, passkey: level }))}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
                    config.passkey === level
                      ? level === 'required'
                        ? 'bg-indigo-100 text-indigo-700 font-semibold'
                        : 'bg-amber-100 text-amber-700 font-semibold'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  {level === 'required' ? '必須' : '任意（スキップ可）'}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── 宿泊日程 ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CalendarDays size={13} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">宿泊日程の入力項目</p>
            </div>
            <div className="space-y-3">
              {SECTION_BOOKING.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onChange={v => set(field.key, v)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── 基本情報 ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <User size={13} className="text-indigo-500" />
              <p className="text-sm font-semibold text-gray-800">基本情報の入力項目</p>
            </div>
            <p className="text-xs text-gray-400 mb-3">
              <span className="font-medium text-gray-500">氏名・メールアドレス・規約同意</span>は常に必須です。
            </p>
            <div className="space-y-3">
              {SECTION_BASIC.map(field => (
                <FieldRow
                  key={field.key}
                  field={field}
                  value={config[field.key]}
                  onChange={v => set(field.key, v)}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-1">
            <p className="text-xs text-gray-400 mb-3">
              ※ 外国人宿泊者のパスポート情報は、外国人を含む場合に常に表示されます。
            </p>
            {saveError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-2">{saveError}</p>
            )}
            <Button size="sm" className="w-full" loading={saving} onClick={handleSave}>
              {saved
                ? <><CheckCircle size={13} className="mr-1.5" />保存しました</>
                : <><Save size={13} className="mr-1.5" />設定を保存する</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
