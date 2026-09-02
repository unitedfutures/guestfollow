'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, CheckCircle } from 'lucide-react'

interface Props {
  facility: {
    id: string
    name: string
    address?: string | null
    beds24_property_id?: string | null
    airhost_property_id?: string | null
    remote_lock_device_id?: string | null
    emergency_contact?: string | null
    checkin_instructions?: string | null
  }
}

const inputClass =
  'block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'

export function FacilityEditForm({ facility }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    name: facility.name ?? '',
    address: facility.address ?? '',
    beds24_property_id: facility.beds24_property_id ?? '',
    airhost_property_id: facility.airhost_property_id ?? '',
    remote_lock_device_id: facility.remote_lock_device_id ?? '',
    emergency_contact: facility.emergency_contact ?? '',
    checkin_instructions: facility.checkin_instructions ?? '',
  })
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }))

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('施設名は必須です')
      return
    }
    setSaving(true)
    setError('')
    try {
      // 空欄は null に正規化して送信（DB上の未設定と揃える）
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: facility.id,
          name: form.name.trim(),
          address: form.address.trim() || null,
          beds24_property_id: form.beds24_property_id.trim() || null,
          airhost_property_id: form.airhost_property_id.trim() || null,
          remote_lock_device_id: form.remote_lock_device_id.trim() || null,
          emergency_contact: form.emergency_contact.trim() || null,
          checkin_instructions: form.checkin_instructions.trim() || null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(d.error || '保存に失敗しました')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch {
      setError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Pencil size={13} className="text-gray-500" />
        <p className="text-xs font-semibold text-gray-700">施設情報の編集</p>
      </div>
      <p className="text-xs text-gray-400 leading-relaxed">
        施設名・住所・OTA連携ID・緊急連絡先などを後から変更できます。変更後は「保存」を押してください。
      </p>

      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">施設名 *</label>
          <input type="text" className={inputClass} placeholder="例：コテージ八ヶ岳"
            value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">住所</label>
          <input type="text" className={inputClass} placeholder="長野県諏訪郡原村〇〇"
            value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Beds24 Property ID</label>
          <input type="text" className={inputClass} placeholder="例：12345"
            value={form.beds24_property_id} onChange={e => set('beds24_property_id', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Airhost Property ID</label>
          <input type="text" className={inputClass} placeholder="例：prop_xxxx"
            value={form.airhost_property_id} onChange={e => set('airhost_property_id', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">RemoteLOCK Device ID</label>
          <input type="text" className={inputClass} placeholder="例：device_xxxx"
            value={form.remote_lock_device_id} onChange={e => set('remote_lock_device_id', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">緊急連絡先</label>
          <input type="text" className={inputClass} placeholder="例：090-0000-0000（管理人）"
            value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">チェックイン案内文</label>
          <textarea className={inputClass} rows={3} placeholder="駐車場は施設正面の〇〇です..."
            value={form.checkin_instructions} onChange={e => set('checkin_instructions', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
        >
          {saved
            ? <><CheckCircle size={13} /> 保存済み</>
            : saving ? '保存中…' : '保存'
          }
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
