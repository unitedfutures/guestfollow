'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CsvDownloadButton() {
  const [loading, setLoading] = useState(false)

  const handleDownload = async () => {
    setLoading(true)
    const res = await fetch('/api/guests/export-csv')
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `宿泊者名簿_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setLoading(false)
  }

  return (
    <Button variant="outline" onClick={handleDownload} loading={loading}>
      <Download size={16} className="mr-1.5" /> CSV出力
    </Button>
  )
}
