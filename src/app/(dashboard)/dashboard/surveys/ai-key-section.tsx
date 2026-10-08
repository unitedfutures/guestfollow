'use client'

import { useState } from 'react'
import { Sparkles, Check, AlertTriangle, KeyRound, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * ☆5の回答者に出すクチコミ下書きを、AIで作るためのAPIキー設定。
 * キーはアカウント共通で、保存後は画面に表示しない（設定済みかどうかのみ）。
 */
export function AiKeySection({ initialConfigured }: { initialConfigured: boolean }) {
  const [configured, setConfigured] = useState(initialConfigured)
  const [apiKey, setApiKey] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/settings/ai-key', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '保存に失敗しました' }); return }
      setConfigured(true)
      setApiKey('')
      setOpen(false)
      setMsg({ type: 'ok', text: 'APIキーを保存しました。☆5の回答からAIがクチコミの下書きを作ります。' })
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!confirm('APIキーを削除します。以降のクチコミ下書きは、回答から組み立てた定型文になります。よろしいですか？')) return
    setRemoving(true); setMsg(null)
    try {
      const res = await fetch('/api/settings/ai-key', { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setMsg({ type: 'err', text: data.error ?? '削除に失敗しました' }); return }
      setConfigured(false)
      setMsg({ type: 'ok', text: 'APIキーを削除しました。' })
    } catch {
      setMsg({ type: 'err', text: '通信エラーが発生しました。時間をおいて再度お試しください。' })
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="font-semibold text-gray-900">AIクチコミ下書き</h3>
          </div>
          <span className={`inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 border ${
            configured
              ? 'text-green-700 bg-green-50 border-green-200'
              : 'text-gray-500 bg-gray-50 border-gray-200'
          }`}>
            {configured ? <><Check size={11} /> AI生成：有効</> : <><AlertTriangle size={11} /> 未設定（定型文で作成）</>}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600 leading-relaxed">
          総合満足度が☆5のゲストに、Googleクチコミ用の下書きを提示します。
          APIキーを設定すると回答内容からAIが文章を作成します。未設定でも、回答を組み立てた定型文が表示されます。
        </p>

        {!open ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(true)} className="text-sm">
              <KeyRound size={14} /> {configured ? 'APIキーを変更' : 'APIキーを設定'}
            </Button>
            {configured && (
              <Button variant="outline" onClick={remove} loading={removing}
                className="text-sm !border-red-200 !text-red-600 hover:!bg-red-50">
                <Trash2 size={14} /> 削除
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm text-gray-700">
              Anthropic APIキー
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-navy-300"
              />
            </label>
            <p className="text-xs text-gray-400 leading-relaxed">
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
                className="text-navy-600 hover:underline">Anthropic Console</a>
              で発行したキーを貼り付けてください。保存時に有効かどうかを確認します。
              キーはサーバー側だけで使い、画面やアンケートページには出しません。
            </p>
            <div className="flex gap-2">
              <Button onClick={save} loading={saving} disabled={!apiKey.trim()} className="text-sm">
                保存して有効にする
              </Button>
              <Button variant="outline" onClick={() => { setOpen(false); setApiKey(''); setMsg(null) }}
                disabled={saving} className="text-sm">
                キャンセル
              </Button>
            </div>
          </div>
        )}

        {msg && (
          <p className={`text-sm rounded-lg px-3 py-2 flex items-start gap-1.5 ${
            msg.type === 'ok'
              ? 'text-green-700 bg-green-50 border border-green-200'
              : 'text-red-600 bg-red-50 border border-red-200'
          }`}>
            {msg.type === 'ok' ? <Check size={15} className="mt-0.5 shrink-0" /> : <AlertTriangle size={15} className="mt-0.5 shrink-0" />}
            <span>{msg.text}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
