'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Key, Mail, CheckCircle } from 'lucide-react'

interface Props {
  defaultCompanyName: string
  email: string
}

export function SettingsForm({ defaultCompanyName, email }: Props) {
  const [companyName, setCompanyName] = useState(defaultCompanyName)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_name: companyName }),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data.error || '保存に失敗しました')
    }
    setLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Key size={18} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900">アカウント情報</h3>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
            <Mail size={13} /> メールアドレス
          </label>
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">{email}</p>
        </div>

        <Input
          id="company_name"
          label="会社名・屋号"
          placeholder="株式会社〇〇"
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <Button onClick={handleSave} loading={loading} className="w-full">
          {saved
            ? <><CheckCircle size={15} className="mr-1.5" /> 保存しました</>
            : '設定を保存'
          }
        </Button>
      </CardContent>
    </Card>
  )
}
