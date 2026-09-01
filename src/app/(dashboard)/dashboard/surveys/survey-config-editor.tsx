'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Save, CheckCircle, Plus, Trash2, ClipboardList, Link2, ExternalLink, Copy } from 'lucide-react'
import type { SurveyConfig, CustomQuestion } from '@/app/survey/[qr_slug]/survey-form'

export const DEFAULT_SURVEY_CONFIG: SurveyConfig = {
  standard: { overall: true, cleanliness: true, facilities: true, location: true, revisit: false, comment: true },
  custom: [],
}

const STANDARD_ITEMS: { key: keyof SurveyConfig['standard']; label: string }[] = [
  { key: 'overall',     label: '総合満足度（★1〜5）' },
  { key: 'cleanliness', label: '清潔さ（★1〜5）' },
  { key: 'facilities',  label: '設備・アメニティ（★1〜5）' },
  { key: 'location',    label: '立地・アクセス（★1〜5）' },
  { key: 'revisit',     label: 'またご利用いただけますか？（はい/いいえ）' },
  { key: 'comment',     label: 'ご意見・ご感想（自由記述）' },
]

const TYPE_LABEL: Record<CustomQuestion['type'], string> = {
  rating: '★評価（1〜5）',
  yesno:  'はい / いいえ',
  text:   '自由記述',
}

interface Props {
  facilityId:    string
  currentConfig: SurveyConfig
  qrSlug?:       string
  appUrl?:       string
}

export function SurveyConfigEditor({ facilityId, currentConfig, qrSlug, appUrl }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState<SurveyConfig>(currentConfig)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [newQ, setNewQ] = useState({ text: '', type: 'rating' as CustomQuestion['type'] })

  const surveyUrl = qrSlug && appUrl ? `${appUrl}/survey/${qrSlug}` : null

  const handleCopy = async () => {
    if (!surveyUrl) return
    await navigator.clipboard.writeText(surveyUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const toggleStandard = (key: keyof SurveyConfig['standard']) =>
    setConfig(c => ({ ...c, standard: { ...c.standard, [key]: !c.standard[key] } }))

  const addCustom = () => {
    if (!newQ.text.trim()) return
    const q: CustomQuestion = { id: `q_${Date.now()}`, text: newQ.text.trim(), type: newQ.type }
    setConfig(c => ({ ...c, custom: [...c.custom, q] }))
    setNewQ({ text: '', type: 'rating' })
  }

  const removeCustom = (id: string) =>
    setConfig(c => ({ ...c, custom: c.custom.filter(q => q.id !== id) }))

  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/survey-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facility_id: facilityId, survey_config: config }),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); router.refresh() }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-600">アンケート設定</span>
        </div>
        <span className="text-xs text-gray-400">{open ? '▲ 閉じる' : '▼ 開く'}</span>
      </button>

      {open && (
        <div className="p-4 space-y-5 bg-white">

          {/* アンケートURL */}
          {surveyUrl && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Link2 size={13} className="text-amber-500" />
                <p className="text-xs font-semibold text-amber-700">アンケートURL（チェックアウト後にゲストへ送付）</p>
              </div>
              <p className="text-xs text-gray-400">※アンケート機能を使用しない場合は送付しなくてもOKです</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 truncate text-gray-600 font-mono">
                  {surveyUrl}
                </code>
                <button
                  onClick={handleCopy}
                  className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border font-medium transition-colors ${
                    copied
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
              <a href={surveyUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline">
                <ExternalLink size={11} /> フォームを確認する
              </a>
            </div>
          )}

          {surveyUrl && <div className="border-t border-gray-100" />}

          {/* Googleレビュー誘導URL */}
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-gray-800">Googleレビュー誘導</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              総合満足度が<span className="font-medium">☆5</span>のとき、回答後にGoogleレビューへの投稿を案内します（記入いただいた感想をコピーして貼り付けられます）。
              GoogleビジネスプロフィールのクチコミURL（<span className="font-mono">g.page/r/…/review</span> など）を入力してください。空欄の場合は誘導は表示されません。
            </p>
            <input
              type="url"
              placeholder="https://g.page/r/xxxxxxxx/review"
              value={config.google_review_url ?? ''}
              onChange={e => setConfig(c => ({ ...c, google_review_url: e.target.value }))}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="border-t border-gray-100" />

          {/* 固定設問 ON/OFF */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">固定設問</p>
            <div className="space-y-2">
              {STANDARD_ITEMS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={config.standard[key]}
                    onChange={() => toggleStandard(key)}
                    disabled={key === 'overall'}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 disabled:opacity-40"
                  />
                  <span className={`text-sm ${config.standard[key] ? 'text-gray-800' : 'text-gray-400'}`}>
                    {label}
                    {key === 'overall' && <span className="text-xs text-gray-400 ml-1">（常に表示）</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* カスタム設問 */}
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-3">独自設問</p>

            {config.custom.length > 0 && (
              <div className="space-y-2 mb-3">
                {config.custom.map(q => (
                  <div key={q.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 leading-tight">{q.text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{TYPE_LABEL[q.type]}</p>
                    </div>
                    <button onClick={() => removeCustom(q.id)} className="text-gray-300 hover:text-red-400 shrink-0 mt-0.5">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 新規追加 */}
            <div className="space-y-2 p-3 border border-dashed border-gray-300 rounded-xl">
              <p className="text-xs text-gray-400 font-medium">設問を追加</p>
              <Input
                id="new_q_text"
                placeholder="例：駐車場は利用しやすかったですか？"
                value={newQ.text}
                onChange={e => setNewQ(n => ({ ...n, text: e.target.value }))}
              />
              <div className="flex gap-2">
                <select
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newQ.type}
                  onChange={e => setNewQ(n => ({ ...n, type: e.target.value as CustomQuestion['type'] }))}
                >
                  {(Object.entries(TYPE_LABEL) as [CustomQuestion['type'], string][]).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={addCustom} disabled={!newQ.text.trim()}>
                  <Plus size={14} className="mr-1" /> 追加
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-1">
            <Button size="sm" className="w-full" loading={saving} onClick={handleSave}>
              {saved
                ? <><CheckCircle size={13} className="mr-1.5" />保存しました</>
                : <><Save size={13} className="mr-1.5" />設問を保存する</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
