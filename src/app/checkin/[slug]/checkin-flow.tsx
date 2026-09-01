'use client'

import { useState, useRef, useCallback } from 'react'
import { startAuthentication } from '@simplewebauthn/browser'
import { CheckCircle, AlertCircle, ChevronRight, ShieldCheck, Fingerprint, Camera, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useGuestLang, LanguageSwitcher } from '@/lib/i18n/guest-lang'

interface Facility {
  id: string
  name: string
  address: string | null
  checkin_instructions: string | null
  emergency_contact: string | null
  camera_checkin: boolean | null
}

type Step = 'welcome' | 'camera' | 'passkey' | 'verifying' | 'success' | 'error'

export function CheckinFlow({ facility }: { facility: Facility }) {
  const { t } = useGuestLang()
  const [step, setStep] = useState<Step>('welcome')
  const [pinCode, setPinCode] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)

  // カメラ関連
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')

  const startCamera = useCallback(async () => {
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setCameraReady(true)
      }
    } catch {
      setCameraError(t('ci_camera_error'))
    }
  }, [t])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraReady(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedPhoto(dataUrl)
    stopCamera()
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null)
    startCamera()
  }, [startCamera])

  const proceedToPasskey = () => {
    stopCamera()
    setStep('passkey')
  }

  const handleStartCheckin = () => {
    if (facility.camera_checkin) {
      setStep('camera')
      setTimeout(() => startCamera(), 100) // DOM描画後に起動
    } else {
      setStep('passkey')
    }
  }

  const handlePasskeyAuth = async () => {
    setStep('verifying')
    try {
      const optRes = await fetch('/api/passkey/auth-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facility_id: facility.id }),
      })
      if (!optRes.ok) {
        const data = await optRes.json()
        setErrorMsg(data.error || t('ci_prepare_failed'))
        setStep('error')
        return
      }
      const options = await optRes.json()
      const credential = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/passkey/auth-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, facility_id: facility.id, face_photo: capturedPhoto }),
      })

      const data = await verifyRes.json()
      if (!verifyRes.ok) {
        setErrorMsg(data.error || t('ci_verify_failed'))
        setStep('error')
        return
      }

      setPinCode(data.pin_code)
      setStep('success')
    } catch (e: unknown) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setErrorMsg(t('ci_auth_cancelled'))
      } else {
        setErrorMsg(t('ci_auth_failed'))
      }
      setStep('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* 言語切替 */}
        <div className="flex justify-end mb-3">
          <LanguageSwitcher dark />
        </div>

        {/* ヘッダー */}
        <div className="text-center mb-6">
          <p className="text-gold-400 font-bold text-lg tracking-widest">GuestFollow</p>
          <h1 className="text-white text-xl font-bold mt-1">{facility.name}</h1>
          {facility.address && <p className="text-gray-400 text-xs mt-1">{facility.address}</p>}
        </div>

        {/* STEP: 受付開始 */}
        {step === 'welcome' && (
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-navy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={32} className="text-white" />
            </div>
            <h2 className="text-white text-lg font-bold mb-2">{t('ci_welcome_title')}</h2>
            <p className="text-gray-400 text-sm mb-2 leading-relaxed">{t('ci_welcome_desc')}</p>
            {facility.camera_checkin && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-300 bg-indigo-900/40 rounded-lg px-3 py-2 mb-4">
                <Camera size={12} />
                {t('ci_camera_notice')}
              </div>
            )}
            {facility.checkin_instructions && (
              <div className="bg-gray-700 rounded-xl p-3 mb-4 text-left">
                <p className="text-xs text-gray-300 leading-relaxed">{facility.checkin_instructions}</p>
              </div>
            )}
            <Button className="w-full" size="lg" onClick={handleStartCheckin}>
              {t('ci_start')} <ChevronRight size={18} className="ml-1" />
            </Button>
          </div>
        )}

        {/* STEP: カメラ撮影 */}
        {step === 'camera' && (
          <div className="bg-gray-800 rounded-2xl overflow-hidden">
            <div className="p-4 text-center border-b border-gray-700">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Camera size={18} className="text-indigo-400" />
                <h2 className="text-white font-bold">{t('ci_camera_title')}</h2>
              </div>
              <p className="text-gray-400 text-xs">{t('ci_camera_desc')}</p>
            </div>

            <div className="relative bg-black aspect-[4/3]">
              {!capturedPhoto ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* ガイド枠 */}
                  {cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-48 h-56 border-2 border-white/40 rounded-full" />
                    </div>
                  )}
                  {!cameraReady && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <img src={capturedPhoto} alt="captured" className="w-full h-full object-cover" />
              )}
            </div>

            <div className="p-4 space-y-3">
              {cameraError && (
                <p className="text-xs text-red-400 text-center bg-red-900/30 rounded-lg px-3 py-2">{cameraError}</p>
              )}

              {!capturedPhoto ? (
                <Button
                  className="w-full"
                  size="lg"
                  disabled={!cameraReady}
                  onClick={capturePhoto}
                >
                  <Camera size={18} className="mr-2" />
                  {t('ci_capture')}
                </Button>
              ) : (
                <>
                  <p className="text-xs text-green-400 text-center flex items-center justify-center gap-1.5">
                    <CheckCircle size={13} /> {t('ci_captured')}
                  </p>
                  <Button className="w-full" size="lg" onClick={proceedToPasskey}>
                    {t('ci_use_photo')} <ChevronRight size={18} className="ml-1" />
                  </Button>
                  <button
                    onClick={retakePhoto}
                    className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors py-2"
                  >
                    <RotateCcw size={13} /> {t('ci_retake')}
                  </button>
                </>
              )}

              {cameraError && (
                <button
                  onClick={proceedToPasskey}
                  className="w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors py-2"
                >
                  {t('ci_skip')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP: パスキー認証 */}
        {step === 'passkey' && (
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-navy-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Fingerprint size={32} className="text-white" />
            </div>
            <h2 className="text-white font-bold text-lg mb-2">{t('ci_verify_title')}</h2>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{t('ci_verify_desc')}</p>
            <Button className="w-full" size="lg" onClick={handlePasskeyAuth}>
              {t('ci_auth_button')}
            </Button>
          </div>
        )}

        {/* STEP: 照合中 */}
        {step === 'verifying' && (
          <div className="bg-gray-800 rounded-2xl p-8 text-center">
            <div className="w-12 h-12 border-4 border-navy-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">{t('ci_verifying')}</p>
            <p className="text-gray-400 text-sm mt-1">{t('ci_wait')}</p>
          </div>
        )}

        {/* STEP: 成功 */}
        {step === 'success' && (
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <CheckCircle size={52} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-1">{t('ci_success_title')}</h2>
            <p className="text-gray-400 text-sm mb-6">{t('ci_success_desc')}</p>

            <div className="bg-navy-700/50 border border-gold-400 rounded-2xl p-6 mb-4">
              <p className="text-gold-300 text-sm mb-2">{t('ci_pin_label')}</p>
              <p className="text-white text-5xl font-black tracking-[0.3em] font-mono">{pinCode}</p>
              <p className="text-navy-300 text-xs mt-3">{t('ci_pin_note')}</p>
            </div>

            {facility.emergency_contact && (
              <div className="bg-gray-700 rounded-xl px-4 py-3 text-sm">
                <p className="text-gray-400 text-xs">{t('ci_emergency')}</p>
                <p className="text-white mt-0.5">{facility.emergency_contact}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP: エラー */}
        {step === 'error' && (
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <AlertCircle size={52} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-white text-lg font-bold mb-2">{t('ci_error_title')}</h2>
            <p className="text-gray-400 text-sm mb-4">{errorMsg}</p>
            {facility.emergency_contact && (
              <div className="bg-gray-700 rounded-xl px-4 py-3 text-sm mb-4">
                <p className="text-gray-400 text-xs">{t('ci_contact')}</p>
                <p className="text-white mt-0.5">{facility.emergency_contact}</p>
              </div>
            )}
            <Button variant="outline" className="w-full text-white border-gray-600" onClick={() => { stopCamera(); setStep('welcome') }}>
              {t('ci_retry')}
            </Button>
          </div>
        )}

      </div>
    </div>
  )
}
