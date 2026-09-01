'use client'

import { useState, useRef } from 'react'
import { startRegistration } from '@simplewebauthn/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle, ChevronRight, ChevronLeft, Upload, X, Fingerprint, Camera, CalendarDays } from 'lucide-react'
import { useGuestLang } from '@/lib/i18n/guest-lang'

interface Props {
  qrSlug: string
  facilityName: string
  formConfig: Record<string, string>
  maxGuests?: number
}

type Step = 'booking' | 'basic' | 'passport' | 'terms' | 'passkey' | 'done'
type Level = 'required' | 'optional' | 'off'

export function RegisterForm({ qrSlug, formConfig, maxGuests = 10 }: Props) {
  const { t } = useGuestLang()
  const cfg = (key: string): Level => (formConfig[key] as Level) ?? 'required'
  const show = (key: string) => cfg(key) !== 'off'
  const isRequired = (key: string) => cfg(key) === 'required'
  // 必須は「 *」、任意は各言語の（任意）表記
  const mark = (key: string) => (isRequired(key) ? ' *' : t('optional'))

  const [step, setStep] = useState<Step>('booking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [guestRecordId, setGuestRecordId] = useState('')

  // Step 1: 宿泊日程
  const today = new Date().toISOString().split('T')[0]
  const [bookingInfo, setBookingInfo] = useState({
    checkin_date:      '',
    checkout_date:     '',
    num_guests:        1,
    checkin_time:      '',
    checkout_time:     '',
    previous_location: '',
    next_destination:  '',
  })

  // Step 2: 基本情報
  const [basic, setBasic] = useState({
    full_name:   '',
    email:       '',
    phone:       '',
    address:     '',
    age:         '',
    nationality: '',
    is_foreign:  false,
  })

  // 顔写真
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [facePreview, setFacePreview] = useState('')
  const faceInputRef = useRef<HTMLInputElement>(null)

  // Step 3: パスポート
  const [passport, setPassport] = useState({ nationality: '', passport_number: '' })
  const [passportFile, setPassportFile] = useState<File | null>(null)
  const [passportPreview, setPassportPreview] = useState('')
  const passportInputRef = useRef<HTMLInputElement>(null)

  // Step 4: 規約
  const [agreed, setAgreed] = useState(false)

  const setB = (k: string, v: string | number | boolean) => setBasic(b => ({ ...b, [k]: v }))
  const setBK = (k: string, v: string | number) => setBookingInfo(b => ({ ...b, [k]: v }))

  const handleFileSelect = (file: File, setFile: (f: File) => void, setPreview: (s: string) => void) => {
    setFile(file)
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const bookingValid = () =>
    !!bookingInfo.checkin_date &&
    !!bookingInfo.checkout_date &&
    bookingInfo.checkout_date > bookingInfo.checkin_date

  const basicValid = () => {
    if (!basic.full_name || !basic.email) return false
    if (show('phone')       && isRequired('phone')       && !basic.phone)       return false
    if (show('address')     && isRequired('address')     && !basic.address)     return false
    if (show('age')         && isRequired('age')         && !basic.age)         return false
    if (show('nationality') && isRequired('nationality') && !basic.nationality) return false
    if (show('face_photo')  && isRequired('face_photo')  && !faceFile)          return false
    return true
  }

  const bookingInfoValid = () => {
    if (!bookingValid()) return false
    if (show('num_guests')        && isRequired('num_guests')        && !bookingInfo.num_guests)        return false
    if (show('checkin_time')      && isRequired('checkin_time')      && !bookingInfo.checkin_time)      return false
    if (show('checkout_time')     && isRequired('checkout_time')     && !bookingInfo.checkout_time)     return false
    if (show('previous_location') && isRequired('previous_location') && !bookingInfo.previous_location) return false
    if (show('next_destination')  && isRequired('next_destination')  && !bookingInfo.next_destination)  return false
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    const formData = new FormData()
    formData.append('qr_slug', qrSlug)
    formData.append('booking', JSON.stringify(bookingInfo))
    formData.append('basic', JSON.stringify({
      ...basic,
      age: basic.age ? parseInt(basic.age) : null,
    }))
    formData.append('passport', JSON.stringify(passport))
    if (passportFile) formData.append('passport_image', passportFile)
    if (faceFile) formData.append('face_photo', faceFile)

    const res = await fetch('/api/register', { method: 'POST', body: formData })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || t('error_generic'))
      return
    }

    setGuestRecordId(data.guest_record_id)
    setStep('passkey')
  }

  const handlePasskeyRegister = async () => {
    setLoading(true)
    setError('')
    try {
      const optRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_record_id: guestRecordId }),
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
        body: JSON.stringify({ guest_record_id: guestRecordId, credential }),
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
    if (step === 'booking') setStep('basic')
    else if (step === 'basic') setStep(basic.is_foreign ? 'passport' : 'terms')
    else if (step === 'passport') setStep('terms')
  }
  const prevStep = () => {
    if (step === 'basic') setStep('booking')
    else if (step === 'terms') setStep(basic.is_foreign ? 'passport' : 'basic')
    else if (step === 'passport') setStep('basic')
  }

  // ─── 完了画面 ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100 text-center">
        <CheckCircle size={52} className="text-green-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">{t('done_title')}</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{t('done_desc')}</p>
      </div>
    )
  }

  // ─── パスキー登録画面 ──────────────────────────────────────────────
  if (step === 'passkey') {
    const passkeyOptional = formConfig['passkey'] === 'optional'
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
          {passkeyOptional && (
            <button
              onClick={() => setStep('done')}
              className="text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2"
            >
              {t('passkey_skip')}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ─── ステップインジケーター ───────────────────────────────────────
  const stepLabels = basic.is_foreign
    ? [t('step_booking'), t('step_basic'), t('step_passport'), t('step_terms')]
    : [t('step_booking'), t('step_basic'), t('step_terms')]
  const stepKeys: Step[] = basic.is_foreign
    ? ['booking', 'basic', 'passport', 'terms']
    : ['booking', 'basic', 'terms']
  const currentIdx = stepKeys.indexOf(step)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* ステップインジケーター */}
      <div className="flex border-b border-gray-100">
        {stepLabels.map((label, i) => (
          <div key={label} className={`flex-1 py-3 text-center text-xs font-medium transition-colors
            ${i === currentIdx ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-400'}`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs mr-1
              ${i === currentIdx ? 'bg-indigo-600 text-white' : i < currentIdx ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {i < currentIdx ? '✓' : i + 1}
            </span>
            {label}
          </div>
        ))}
      </div>

      <div className="p-6">

        {/* ===== Step 1: 宿泊日程 ===== */}
        {step === 'booking' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={18} className="text-indigo-500" />
              <h3 className="font-semibold text-gray-900">{t('booking_title')}</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="checkin" type="date" label={`${t('checkin_date')} *`}
                min={today}
                value={bookingInfo.checkin_date}
                onChange={e => setBK('checkin_date', e.target.value)}
                required
              />
              <Input
                id="checkout" type="date" label={`${t('checkout_date')} *`}
                min={bookingInfo.checkin_date || today}
                value={bookingInfo.checkout_date}
                onChange={e => setBK('checkout_date', e.target.value)}
                required
              />
            </div>
            {bookingInfo.checkin_date && bookingInfo.checkout_date && bookingInfo.checkout_date <= bookingInfo.checkin_date && (
              <p className="text-xs text-red-500">{t('date_order_error')}</p>
            )}
            {show('num_guests') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('num_guests')}{mark('num_guests')}
                </label>
                <select
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={bookingInfo.num_guests}
                  onChange={e => setBK('num_guests', parseInt(e.target.value))}
                >
                  {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{t('guests_n', { n })}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">{t('max_guests_note', { n: maxGuests })}</p>
              </div>
            )}

            {/* 追加フィールド：チェックイン・アウト時間 */}
            {(show('checkin_time') || show('checkout_time')) && (
              <div className="grid grid-cols-2 gap-3">
                {show('checkin_time') && (
                  <Input
                    id="checkin_time" type="time"
                    label={`${t('checkin_time')}${mark('checkin_time')}`}
                    value={bookingInfo.checkin_time}
                    onChange={e => setBK('checkin_time', e.target.value)}
                    required={isRequired('checkin_time')}
                  />
                )}
                {show('checkout_time') && (
                  <Input
                    id="checkout_time" type="time"
                    label={`${t('checkout_time')}${mark('checkout_time')}`}
                    value={bookingInfo.checkout_time}
                    onChange={e => setBK('checkout_time', e.target.value)}
                    required={isRequired('checkout_time')}
                  />
                )}
              </div>
            )}

            {show('previous_location') && (
              <Input
                id="previous_location"
                label={`${t('previous_location')}${mark('previous_location')}`}
                placeholder={t('previous_location_ph')}
                value={bookingInfo.previous_location}
                onChange={e => setBK('previous_location', e.target.value)}
                required={isRequired('previous_location')}
              />
            )}

            {show('next_destination') && (
              <Input
                id="next_destination"
                label={`${t('next_destination')}${mark('next_destination')}`}
                placeholder={t('next_destination_ph')}
                value={bookingInfo.next_destination}
                onChange={e => setBK('next_destination', e.target.value)}
                required={isRequired('next_destination')}
              />
            )}

            <Button className="w-full" size="lg" disabled={!bookingInfoValid()} onClick={nextStep}>
              {t('next')} <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        )}

        {/* ===== Step 2: 基本情報 ===== */}
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
                required={isRequired('phone')} />
            )}

            {show('age') && (
              <Input id="age" type="number"
                label={`${t('age')}${mark('age')}`}
                placeholder={t('age_ph')}
                value={basic.age} onChange={e => setB('age', e.target.value)}
                required={isRequired('age')} />
            )}

            {show('nationality') && (
              <Input id="nationality"
                label={`${t('nationality')}${mark('nationality')}`}
                placeholder={t('nationality_ph')}
                value={basic.nationality} onChange={e => setB('nationality', e.target.value)}
                required={isRequired('nationality')} />
            )}

            {show('address') && (
              <Input id="address"
                label={`${t('address')}${mark('address')}`}
                placeholder={t('address_ph')}
                value={basic.address} onChange={e => setB('address', e.target.value)}
                required={isRequired('address')} />
            )}

            {/* 顔写真 */}
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
                  <div className="relative inline-block">
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
                <input ref={faceInputRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f, setFaceFile, setFacePreview) }} />
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600"
                checked={basic.is_foreign} onChange={e => setB('is_foreign', e.target.checked)} />
              <span className="text-sm text-gray-700">{t('is_foreign')}</span>
            </label>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={prevStep}>
                <ChevronLeft size={16} className="mr-1" /> {t('back')}
              </Button>
              <Button className="flex-1" size="lg" disabled={!basicValid()} onClick={nextStep}>
                {t('next')} <ChevronRight size={16} className="ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ===== Step 3: パスポート ===== */}
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

        {/* ===== Step 4: 規約同意 ===== */}
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
