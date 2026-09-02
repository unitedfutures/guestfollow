'use client'

import { useState } from 'react'
import { QrCode, Info, KeyRound, CheckCircle, Camera } from 'lucide-react'
import { PreCheckinUrlDisplay } from './pre-checkin-url-generator'
import { FacilityQR } from './facility-qr'
import { Beds24SyncButton } from './beds24-sync-button'
import { AirhostSyncButton } from './airhost-sync-button'
import { FacilityEditForm } from './facility-edit-form'

interface Props {
  facility: {
    id: string
    name: string
    qr_slug: string
    address?: string | null
    beds24_property_id?: string | null
    airhost_property_id?: string | null
    remote_lock_device_id?: string | null
    emergency_contact?: string | null
    checkin_instructions?: string | null
    pin_code?: string | null
    camera_checkin?: boolean | null
  }
  appUrl: string
}

export function FacilityBasicInfo({ facility, appUrl }: Props) {
  const [open, setOpen] = useState(false)

  // 暗証番号
  const [pinCode, setPinCode] = useState(facility.pin_code ?? '')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaved, setPinSaved] = useState(false)
  const [pinError, setPinError] = useState('')

  // カメラ認証
  const [cameraCheckin, setCameraCheckin] = useState(facility.camera_checkin ?? false)
  const [cameraSaving, setCameraSaving] = useState(false)
  const [cameraSaved, setCameraSaved] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const handlePinSave = async () => {
    setPinSaving(true)
    setPinError('')
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: facility.id, pin_code: pinCode.trim() || null }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPinError(d.error || '保存に失敗しました')
        return
      }
      setPinSaved(true)
      setTimeout(() => setPinSaved(false), 3000)
    } catch {
      setPinError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setPinSaving(false)
    }
  }

  const handleCameraToggle = async (value: boolean) => {
    const prevValue = cameraCheckin
    setCameraCheckin(value)
    setCameraSaving(true)
    setCameraError('')
    try {
      const res = await fetch('/api/facilities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: facility.id, camera_checkin: value }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCameraCheckin(prevValue)
        setCameraError(d.error || '保存に失敗しました')
        return
      }
      setCameraSaved(true)
      setTimeout(() => setCameraSaved(false), 2000)
    } catch {
      setCameraCheckin(prevValue)
      setCameraError('通信エラーが発生しました。時間をおいて再度お試しください。')
    } finally {
      setCameraSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* トグルヘッダー */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Info size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">基本情報</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white">

          {/* 施設情報の編集 */}
          <FacilityEditForm facility={facility} />

          <div className="border-t border-gray-100" />

          {/* 事前登録URL */}
          <div>
            <PreCheckinUrlDisplay qrSlug={facility.qr_slug} appUrl={appUrl} />
          </div>

          <div className="border-t border-gray-100" />

          {/* チェックインQR */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <QrCode size={13} className="text-indigo-500" />
              <p className="text-xs font-semibold text-indigo-700">チェックインQR（施設玄関に掲示）</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              印刷して施設玄関付近に貼ってください。ゲストがQRコードを読み込みチェックインを完了します。
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              <QrCode size={13} />
              <span className="font-mono truncate">{facility.qr_slug}</span>
            </div>

            {/* OTA連携情報（IDの表示・変更は上部の「施設情報の編集」で行う） */}
            {(facility.beds24_property_id || facility.airhost_property_id) && (
              <p className="text-xs text-gray-400 mt-1">
                予約情報の照合に使用します。ゲストの事前登録情報と突合し、未登録・不一致をアラートします。
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 mt-1">
              <FacilityQR facility={facility} />
              {facility.beds24_property_id && <Beds24SyncButton facilityId={facility.id} />}
              {facility.airhost_property_id && <AirhostSyncButton facilityId={facility.id} />}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* 暗証番号設定 */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <KeyRound size={13} className="text-amber-500" />
              <p className="text-xs font-semibold text-amber-700">暗証番号（チェックイン後に表示）</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              チェックイン認証が完了したゲストに表示する暗証番号を設定してください。空欄の場合はランダムな4桁が自動生成されます。
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                placeholder="例：1234（数字・英字・記号 可）"
                value={pinCode}
                onChange={e => setPinCode(e.target.value)}
                maxLength={20}
              />
              <button
                onClick={handlePinSave}
                disabled={pinSaving}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {pinSaved
                  ? <><CheckCircle size={13} /> 保存済み</>
                  : pinSaving ? '保存中…' : '保存'
                }
              </button>
            </div>
            {pinError && <p className="text-xs text-red-600">{pinError}</p>}
          </div>

          <div className="border-t border-gray-100" />

          {/* カメラ認証設定 */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Camera size={13} className="text-indigo-500" />
              <p className="text-xs font-semibold text-indigo-700">チェックイン時のカメラ撮影</p>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              有効にすると、チェックイン認証の前にゲストのカメラが起動して顔写真を撮影・保存します。旅館業法の「顔確認」記録として活用できます。
            </p>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">カメラ撮影</span>
                {cameraSaved && <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={11} />保存済み</span>}
                {cameraSaving && <span className="text-xs text-gray-400">保存中…</span>}
              </div>
              <button
                onClick={() => handleCameraToggle(!cameraCheckin)}
                disabled={cameraSaving}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                  cameraCheckin ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  cameraCheckin ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            {cameraError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{cameraError}</p>}
            <p className="text-xs text-gray-400">
              現在: <span className={`font-medium ${cameraCheckin ? 'text-indigo-600' : 'text-gray-500'}`}>
                {cameraCheckin ? '有効（チェックイン時に撮影あり）' : '無効'}
              </span>
            </p>
          </div>

        </div>
      )}
    </div>
  )
}
