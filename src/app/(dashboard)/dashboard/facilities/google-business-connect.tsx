'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Check, AlertTriangle, RefreshCw, ExternalLink, Link2, Unlink } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type FacilityLink = {
  id: string
  name: string
  googleLocationName: string | null
  googleLocationTitle: string | null
}

type Location = { name: string; title: string; address: string }

/**
 * Googleビジネスプロフィール連携の設定。
 * ①クライアントID/シークレットを保存 →②Googleアカウントを連携 →③施設ごとに店舗を紐づけ
 */
export function GoogleBusinessConnect({
  initialConfigured, initialConnectedEmail, facilities, redirectUri,
}: {
  initialConfigured: boolean
  initialConnectedEmail: string | null
  facilities: FacilityLink[]
  redirectUri: string
}) {
  const [configured, setConfigured] = useState(initialConfigured)
  const [connectedEmail, setConnectedEmail] = useState(initialConnectedEmail)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [openForm, setOpenForm] = useState(!initialConfigured)
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<Location[] | null>(null)
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [links, setLinks] = useState<FacilityLink[]>(facilities)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const saveCredentials = async () => {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/google/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId.trim(), client_secret: clientSecret.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '保存に失敗しました' }); return }
      setConfigured(true); setOpenForm(false); setClientId(''); setClientSecret('')
      setMsg({ type: 'ok', text: '保存しました。続けて「Googleアカウントを連携」を押してください。' })
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setSaving(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('Googleとの連携を解除します。取り込み済みのクチコミは残りますが、再取得や返信はできなくなります。よろしいですか？')) return
    const res = await fetch('/api/google/settings', { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '解除に失敗しました' }); return }
    setConnectedEmail(null)
    setMsg({ type: 'ok', text: '連携を解除しました。' })
  }

  const loadLocations = async () => {
    setLoadingLocations(true); setMsg(null)
    try {
      const res = await fetch('/api/google/locations')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '取得に失敗しました' }); return }
      setLocations(data.locations ?? [])
      if ((data.locations ?? []).length === 0) {
        setMsg({ type: 'err', text: '管理しているビジネス（店舗）が見つかりませんでした。連携したGoogleアカウントの権限をご確認ください。' })
      }
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setLoadingLocations(false)
    }
  }

  const linkFacility = async (facilityId: string, locationName: string) => {
    const loc = (locations ?? []).find(l => l.name === locationName)
    setMsg(null)
    const res = await fetch('/api/google/locations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_id: facilityId, location_name: locationName, location_title: loc?.title ?? null }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '紐づけに失敗しました' }); return }
    setLinks(list => list.map(f => f.id === facilityId
      ? { ...f, googleLocationName: locationName || null, googleLocationTitle: loc?.title ?? null }
      : f))
    setMsg({ type: 'ok', text: locationName ? '紐づけました。' : '紐づけを解除しました。' })
  }

  const linkedCount = links.filter(f => f.googleLocationName).length

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-red-500" />
            <h3 className="font-semibold text-gray-900">Googleビジネスプロフィール連携</h3>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border ${
            connectedEmail ? 'text-green-700 bg-green-50 border-green-200' : 'text-gray-500 bg-gray-50 border-gray-200'
          }`}>
            {connectedEmail ? <><Check size={11} /> 連携済み（{connectedEmail}）</> : <><AlertTriangle size={11} /> 未連携</>}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 leading-relaxed">
          Googleに届いたクチコミの一覧・返信を
          <Link href="/dashboard/reviews" className="text-navy-600 hover:underline mx-1">Googleクチコミ</Link>
          ページで行えるようになります。
        </p>

        {/* ① OAuthクライアント */}
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">① Google CloudのOAuthクライアント</p>
          {!openForm ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs ${configured ? 'text-green-700' : 'text-gray-400'}`}>
                {configured ? '設定済み' : '未設定'}
              </span>
              <Button variant="outline" onClick={() => setOpenForm(true)} className="!py-1.5 text-xs">
                {configured ? '変更' : '設定する'}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <input type="text" value={clientId} onChange={e => setClientId(e.target.value)}
                placeholder="クライアントID（◯◯.apps.googleusercontent.com）" autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-300" />
              <input type="password" value={clientSecret} onChange={e => setClientSecret(e.target.value)}
                placeholder="クライアントシークレット" autoComplete="off"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300" />
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Google Cloudで「ウェブアプリケーション」のOAuthクライアントを作成し、承認済みのリダイレクトURIに
                <code className="bg-gray-100 px-1 rounded mx-1 break-all">{redirectUri}</code>
                を登録してください。Business Profile APIの利用申請（承認）も必要です。
              </p>
              <div className="flex gap-2">
                <Button onClick={saveCredentials} loading={saving}
                  disabled={!clientId.trim() || !clientSecret.trim()} className="!py-1.5 text-xs">保存</Button>
                <Button variant="outline" onClick={() => { setOpenForm(false); setMsg(null) }}
                  disabled={saving} className="!py-1.5 text-xs">キャンセル</Button>
              </div>
            </div>
          )}
        </div>

        {/* ② Googleアカウント連携 */}
        <div className="border border-gray-200 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2">② Googleアカウントの連携</p>
          <div className="flex flex-wrap items-center gap-2">
            {connectedEmail ? (
              <>
                <span className="text-xs text-green-700">{connectedEmail} と連携中</span>
                <Button variant="outline" onClick={disconnect} className="!py-1.5 text-xs !border-red-200 !text-red-600 hover:!bg-red-50">
                  <Unlink size={12} /> 解除
                </Button>
              </>
            ) : (
              <a href="/api/google/oauth/start"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  configured ? 'bg-navy-600 text-white hover:bg-navy-700' : 'bg-gray-100 text-gray-400 pointer-events-none'
                }`}>
                <ExternalLink size={12} /> Googleアカウントを連携
              </a>
            )}
          </div>
        </div>

        {/* ③ 施設との紐づけ */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <p className="text-xs font-semibold text-gray-600">
              ③ 施設とGoogleのビジネス（店舗）の紐づけ
              <span className="font-normal text-gray-400 ml-1">（{linkedCount}/{links.length} 施設）</span>
            </p>
            <Button variant="outline" onClick={loadLocations} loading={loadingLocations}
              disabled={!connectedEmail} className="!py-1.5 text-xs">
              <RefreshCw size={12} /> 店舗一覧を取得
            </Button>
          </div>

          <div className="space-y-1.5">
            {links.map(f => (
              <div key={f.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-gray-700 w-40 shrink-0 truncate" title={f.name}>{f.name}</span>
                {locations ? (
                  <select
                    value={f.googleLocationName ?? ''}
                    onChange={e => linkFacility(f.id, e.target.value)}
                    className="flex-1 min-w-[12rem] text-sm bg-white border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-300"
                  >
                    <option value="">（紐づけなし）</option>
                    {locations.map(l => (
                      <option key={l.name} value={l.name}>{l.title}{l.address ? `（${l.address}）` : ''}</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    {f.googleLocationName
                      ? <><Link2 size={11} className="text-green-600" /> {f.googleLocationTitle || f.googleLocationName}</>
                      : '未紐づけ'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {msg && (
          <p className={`text-sm rounded-lg px-3 py-2 flex items-start gap-1.5 ${
            msg.type === 'ok' ? 'text-green-700 bg-green-50 border border-green-200' : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            {msg.type === 'ok' ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
            <span>{msg.text}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
