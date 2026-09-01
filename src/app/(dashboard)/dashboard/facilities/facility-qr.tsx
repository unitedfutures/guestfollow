'use client'

import { useState } from 'react'
import { QrCode, Download, X, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import QRCode from 'qrcode'

interface Facility { id: string; name: string; qr_slug: string }

export function FacilityQR({ facility }: { facility: Facility }) {
  const [open, setOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const checkinUrl = `${appUrl}/checkin/${facility.qr_slug}`

  const handleOpen = async () => {
    const url = await QRCode.toDataURL(checkinUrl, {
      width: 400, margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    })
    setQrUrl(url)
    setOpen(true)
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = qrUrl
    a.download = `checkin-qr-${facility.qr_slug}.png`
    a.click()
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <html><head><title>GuestFollow QR - ${facility.name}</title>
      <style>body{text-align:center;font-family:sans-serif;padding:40px}h2{margin-bottom:4px}p{color:#666;font-size:14px;margin-bottom:20px}</style>
      </head><body>
      <h2>${facility.name}</h2>
      <p>このQRコードをスキャンしてチェックインしてください</p>
      <img src="${qrUrl}" width="300" /><br>
      <small style="color:#999">${checkinUrl}</small>
      </body></html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen} className="w-full">
        <QrCode size={14} className="mr-1.5" /> QRコード
      </Button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">{facility.name}</h3>
              <button onClick={() => setOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">玄関前に印刷・掲示してください</p>
            {qrUrl && <img src={qrUrl} alt="QR" className="mx-auto rounded-xl border border-gray-100 shadow-sm mb-3" />}
            <p className="text-xs text-gray-400 mb-4 break-all font-mono">{checkinUrl}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setOpen(false)}>閉じる</Button>
              <Button variant="secondary" size="sm" onClick={handlePrint}><Printer size={14} className="mr-1" />印刷</Button>
              <Button size="sm" className="flex-1" onClick={handleDownload}><Download size={14} className="mr-1" />保存</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
