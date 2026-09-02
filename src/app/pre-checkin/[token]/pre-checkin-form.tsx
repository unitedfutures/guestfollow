'use client'

import { useState, useRef } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, ChevronRight, ChevronLeft, Upload, X, Fingerprint, Camera } from 'lucide-react'
import { useGuestLang } from '@/lib/i18n/guest-lang'

interface Props {
  token: string
  bookingId: string
  defaultEmail: string
  defaultName: string
  numGuests: number
  formConfig?: Record<string, string>
}

type Step = 'basic' | 'passport' | 'terms' | 'passkey' | 'done'
type Level = 'required' | 'optional' | 'off'

export function PreCheckinForm({ token, defaultEmail, defaultName, numGuests, formConfig = {} }: Props) {
  const { t } = useGuestLang()
  // form_config のヘルパー
  const cfg = (key: string): Level => (formConfig[key] as Level) ?? 'required'
  const show = (key: string) => cfg(key) !== 'off'
  const required = (key: string) => cfg(key) === 'required'
  const mark = (key: string) => (required(key) ? ' *' : t('optional'))

  const [step, setStep] = useState<Step>('basic')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [guestRecordId, setGuestRecordId] = useState('')
  const [setupToken, setSetupToken] = useState('') // パスキー登録を本人に紐づけるトークン（登録APIが返す）

  // Step 1: 基本情報
  const [basic, setBasic] = useState({
    full_name: defaultName,
    email: defaultEmail,
    phone: '',
    address: '',
    num_guests: numGuests,
    is_foreign: false,
  })

  // 顔写真
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [facePreview, setFacePreview] = useState<string>('')
  const faceInputRef = useRef<HTMLInputElement>(null)

  // Step 2: パスポート（外国人のみ）
  const [passport, setPassport] = useState({ nationality: '', passport_number: '' })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [passportPreview, setPassportPreview] = useState<string>('')
  const passportInputRef = useRef<HTMLInputElement>(null)

  // Step 3: 規約同意
  const [agreed, setAgreed] = useState(false)

  const setB = (k: string, v: string | number | boolean) => setBasic(b => ({ ...b, [k]: v }))

  const handleFileSelect = (file: File, setFile: (f: File) => void, setPreview: (s: string) => void) => {
    setFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  // Step 1 の次へバリデーション
  const basicValid = () => {
    if (!basic.full_name || !basic.email) return false
    if (show('phone') && required('phone') && !basic.phone) return false
    if (show('address') && required('address') && !basic.address) return false
    if (show('face_photo') && required('face_photo') && !faceFile) return false
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('token', token)
    formData.append('basic', JSON.stringify(basic))
    formData.append('passport', JSON.stringify(passport))
    if (passportFile) formData.append('passport_image', passportFile)
    if (faceFile) formData.append('face_photo', faceFile)

    const res = await fetch(`/api/pre-checkin/${token}`, { method: 'POST', body: formData })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t('error_generic'))
      setLoading(false)
      return
    }

    const data = await res.json()
    setGuestRecordId(data.guest_record_id)
    setSetupToken(data.passkey_setup_token ?? '')
    setStep('passkey')
    setLoading(false)
  }

  const handlePasskeyRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const optRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_record_id: guestRecordId, setup_token: setupToken }),
      })
      const options = await optRes.json()
      if (!optRes.ok) {
        setError(options.error || t('passkey_prepare_failed'))
        return
      }
      const credential = await startRegistration({ optionsJSON: options })
      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_record_id: guestRecordId, credential, setup_token: setupToken }),
      })
      if (!verifyRes.ok) {
        const data = await verifyRes.json()
        setError(data.error || t('passkey_failed'))
        return
      }
      setStep('done')
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setError(t('passkey_cancelled'))
      } else {
        setError(t('passkey_failed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (step === 'basic') setStep(basic.is_foreign ? 'passport' : 'terms')
    else if (step === 'passport') setStep('terms')
  }
  const prevStep = () => {
    if (step === 'terms') setStep(basic.is_foreign ? 'passport' : 'basic')
    else if (step === 'passport') setStep('basic')
  }

  // --- 完了画面 ---
  if (step === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
        <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('done_title')}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{t('done_desc')}</p>
      </div>
    )
  }

  // --- パスキー設定画面 ---
  if (step === 'passkey') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 text-center space-y-5">
          <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto">
            <Fingerprint size={32} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">{t('passkey_title')}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{t('passkey_desc')}</p>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <Button className="w-full" size="lg" loading={loading} onClick={handlePasskeyRegister}>
            {t('passkey_button')}
          </Button>
        </div>
      </div>
    )
  }

  // --- ステップインジケーター ---
  const steps = basic.is_foreign
    ? [t('step_basic'), t('step_passport'), t('step_terms')]
    : [t('step_basic'), t('step_terms')]
  const currentIdx = step === 'basic' ? 0 : step === 'passport' ? 1 : (basic.is_foreign ? 2 : 1)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ステップインジケーター */}
      <div className="flex border-b border-gray-100">
        {steps.map((s, i) => (
          <div key={s} className={`flex-1 py-3 text-center text-xs font-medium transition-colors
            ${i === currentIdx ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1
              ${i === currentIdx ? 'bg-indigo-600 text-white' : i < currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < currentIdx ? '✓' : i + 1}
            </span>
            {s}
          </div>
        ))}
      </div>

      <div className="p-6">
        {/* ===== Step 1: 基本情報 ===== */}
        {step === 'basic' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t('basic_title')}</h3>

            <Input id="full_name" label={`${t('full_name')} *`} placeholder={t('full_name_ph')}
              value={basic.full_name} onChange={e => setB('full_name', e.target.value)} required />
            <Input id="email" type="email" label={`${t('email')} *`} placeholder={t('email_ph')}
              value={basic.email} onChange={e => setB('email', e.target.value)} required />

            {show('phone') && (
              <Input id="phone" type="tel"
                label={`${t('phone')}${mark('phone')}`}
                placeholder={t('phone_ph')}
                value={basic.phone} onChange={e => setB('phone', e.target.value)}
                required={required('phone')} />
            )}

            {show('address') && (
              <Input id="address"
                label={`${t('address')}${mark('address')}`}
                placeholder={t('address_ph')}
                value={basic.address} onChange={e => setB('address', e.target.value)}
                required={required('address')} />
            )}

            {show('num_guests') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('num_guests')}{mark('num_guests')}
                </label>
                <select
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={basic.num_guests} onChange={e => setB('num_guests', parseInt(e.target.value))}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{t('guests_n', { n })}</option>)}
                </select>
              </div>
            )}

            {/* 顔写真（form_config で on の場合） */}
            {show('face_photo') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <span className="flex items-center gap-1.5">
                    <Camera size={14} className="text-gray-500" />
                    {t('face_photo')}{mark('face_photo')}
                  </span>
                </label>
                <p className="text-xs text-gray-400 mb-2">{t('face_photo_hint')}</p>
                {facePreview ? (
                  <div className="relative">
                    <img src={facePreview} alt="face" className="w-32 h-32 object-cover rounded-xl border border-gray-200" />
                    <button onClick={() => { setFaceFile(null); setFacePreview('') }}
                      className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                      <X size={12} className="text-gray-600" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => faceInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                    <Upload size={20} className="text-gray-400 mx-auto mb-1" />
                    <p className="text-sm text-gray-500">{t('select_photo')}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t('jpg_png')}</p>
                  </button>
                )}
                <input ref={faceInputRef} type="file" accept="image/*" capture="user"
                  className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setFaceFile, setFacePreview) }} />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600"
                checked={basic.is_foreign} onChange={e => setB('is_foreign', e.target.checked)} />
              <span className="text-sm text-gray-700">{t('is_foreign')}</span>
            </label>

            <Button className="w-full" size="lg" disabled={!basicValid()} onClick={nextStep}>
              {t('next')} <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ===== Step 2: パスポート ===== */}
        {step === 'passport' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t('passport_title')}</h3>
            <Input id="nationality" label={`${t('nationality')} *`} placeholder={t('passport_nationality_ph')}
              value={passport.nationality} onChange={e => setPassport(p => ({ ...p, nationality: e.target.value }))} required />
            <Input id="passport_number" label={`${t('passport_number')} *`} placeholder={t('passport_number_ph')}
              value={passport.passport_number} onChange={e => setPassport(p => ({ ...p, passport_number: e.target.value }))} required />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('passport_image')} *</label>
              {passportPreview ? (
                <div className="relative">
                  <img src={passportPreview} alt="passport" className="w-full rounded-xl border border-gray-200 object-cover max-h-48" />
                  <button onClick={() => { setPassportFile(null); setPassportPreview('') }}
                    className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm border border-gray-200">
                    <X size={14} className="text-gray-600" />
                  </button>
                </div>
              ) : (
                <button onClick={() => passportInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                  <Upload size={24} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t('select_image')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('jpg_png')}</p>
                </button>
              )}
              <input ref={passportInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setPassportFile, setPassportPreview) }} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ChevronLeft size={16} className="mr-1" /> {t('back')}
              </Button>
              <Button className="flex-1"
                disabled={!passport.nationality || !passport.passport_number || !passportFile}
                onClick={nextStep}>
                {t('next')} <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== Step 3: 規約同意 ===== */}
        {step === 'terms' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 mb-4">{t('terms_title')}</h3>
            <div className="bg-gray-50 rounded-xl p-4 h-56 overflow-y-auto text-xs text-gray-600 leading-relaxed whitespace-pre-wrap border border-gray-200">
              {t('terms_text')}
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" className="mt-0.5 rounded border-gray-300 text-indigo-600"
                checked={agreed} onChange={e => setAgreed(e.target.checked)} />
              <span className="text-sm text-gray-700">
                {t('terms_agree')}<br />
                <span className="text-xs text-gray-400">{t('terms_record_note')}</span>
              </span>
            </label>
            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ChevronLeft size={16} className="mr-1" /> {t('back')}
              </Button>
              <Button className="flex-1" disabled={!agreed} loading={loading} onClick={handleSubmit}>
                {t('next_passkey')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
