import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Star, MessageSquare, ClipboardList } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { getAccountAccess } from '@/lib/auth/roles'

const RATING_KEYS = ['overall', 'cleanliness', 'facilities', 'location'] as const
const RATING_LABELS: Record<string, string> = {
  overall: '総合', cleanliness: '清潔さ', facilities: '設備', location: '立地',
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} size={12} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-200'} />
      ))}
    </span>
  )
}

export default async function SurveysPage() {
  const { isCleanerOnly } = await getAccountAccess()
  if (isCleanerOnly) redirect('/dashboard')

  const supabase = await createClient()

  const { data: responses } = await supabase
    .from('survey_responses')
    .select('*, facilities(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">アンケート結果</h2>
        <p className="text-gray-500 text-sm mt-1">
          回答一覧（URLと設問設定は<Link href="/dashboard/facilities" className="text-navy-500 hover:underline">施設管理</Link>から）
        </p>
      </div>

      {/* ── 回答一覧 ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">回答一覧</h3>
          <span className="text-sm text-gray-400">（{(responses ?? []).length}件）</span>
        </div>

        {(responses ?? []).length > 0 ? (
          <div className="space-y-3">
            {(responses ?? []).map(r => {
              const answers = r.answers as Record<string, number | string>
              const ratingEntries = RATING_KEYS.filter(k => typeof answers[k] === 'number')
              const comment = answers['comment'] as string | undefined

              return (
                <Card key={r.id} className="hover:shadow-sm transition-shadow">
                  <div className="px-5 py-4 space-y-3">
                    {/* ヘッダー行 */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {(r.facilities as { name: string } | null)?.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                          {r.respondent_name && ` ／ ${r.respondent_name}`}
                          {r.stay_checkin && ` ／ 滞在: ${formatDate(r.stay_checkin)}〜${r.stay_checkout ? formatDate(r.stay_checkout) : ''}`}
                        </p>
                      </div>
                      {typeof answers['overall'] === 'number' && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Stars value={answers['overall'] as number} />
                          <span className="text-sm font-bold text-amber-600">{answers['overall']}.0</span>
                        </div>
                      )}
                    </div>

                    {/* 各項目の評価 */}
                    {ratingEntries.length > 1 && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {ratingEntries.map(k => (
                          <div key={k} className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{RATING_LABELS[k]}:</span>
                            <Stars value={answers[k] as number} />
                          </div>
                        ))}
                        {typeof answers['revisit'] === 'string' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            answers['revisit'] === 'yes'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-600'
                          }`}>
                            再利用: {answers['revisit'] === 'yes' ? 'はい' : 'いいえ'}
                          </span>
                        )}
                      </div>
                    )}

                    {/* コメント */}
                    {comment && (
                      <div className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <MessageSquare size={13} className="text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700 leading-relaxed">{comment}</p>
                      </div>
                    )}

                    {/* カスタム回答 */}
                    {Object.entries(answers)
                      .filter(([k]) => k.startsWith('q_'))
                      .map(([k, v]) => (
                        <div key={k} className="text-xs text-gray-500 bg-gray-50 rounded px-3 py-1.5">
                          <span className="text-gray-400">Q: </span>{k} → {String(v)}
                        </div>
                      ))
                    }
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-sm">まだ回答がありません</p>
            <p className="text-xs mt-1">アンケートURLをゲストに送付してください</p>
          </div>
        )}
      </div>
    </div>
  )
}
