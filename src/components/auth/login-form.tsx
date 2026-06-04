'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Mode = 'idle' | 'loading' | 'sent' | 'error'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<Mode>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/today'
  const supabase = createClient()

  // --- Magic link (email OTP) ---
  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setMode('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setMode('error')
    } else {
      setMode('sent')
    }
  }

  // --- Google OAuth ---
  async function handleGoogle() {
    setMode('loading')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setErrorMsg(error.message)
      setMode('error')
    }
  }

  if (mode === 'sent') {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-8 text-center">
        <div className="text-3xl mb-4">📬</div>
        <div className="font-medium text-neutral-900 mb-2">Kiểm tra email của bạn</div>
        <div className="text-sm text-neutral-500 mb-6">
          Mình đã gửi link đăng nhập đến <span className="font-medium text-neutral-700">{email}</span>.
          Nhấn vào link trong email để vào FlowDesk.
        </div>
        <button
          onClick={() => { setMode('idle'); setEmail('') }}
          className="text-sm text-neutral-400 hover:text-neutral-600 underline underline-offset-2"
        >
          Dùng email khác
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-8">
      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={mode === 'loading'}
        className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors disabled:opacity-50 mb-6"
      >
        <GoogleIcon />
        Đăng nhập với Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-neutral-100" />
        <span className="text-xs text-neutral-400">hoặc dùng email</span>
        <div className="flex-1 h-px bg-neutral-100" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
        <input
          type="email"
          placeholder="email@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl text-sm outline-none focus:border-neutral-400 transition-colors"
        />

        {mode === 'error' && (
          <div className="text-xs text-red-500 px-1">{errorMsg}</div>
        )}

        <button
          type="submit"
          disabled={mode === 'loading' || !email.trim()}
          className="w-full py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:opacity-85 transition-opacity disabled:opacity-40"
        >
          {mode === 'loading' ? 'Đang gửi...' : 'Gửi link đăng nhập'}
        </button>
      </form>

      <p className="text-xs text-neutral-400 text-center mt-4">
        Không cần mật khẩu — link đăng nhập gửi qua email
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M15.68 8.18c0-.57-.05-1.11-.14-1.64H8v3.1h4.3a3.68 3.68 0 01-1.6 2.41v2h2.58c1.51-1.39 2.4-3.44 2.4-5.87z" fill="#4285F4"/>
      <path d="M8 16c2.16 0 3.97-.72 5.3-1.94l-2.59-2.01c-.71.48-1.63.76-2.71.76-2.08 0-3.85-1.4-4.48-3.29H.86v2.08A8 8 0 008 16z" fill="#34A853"/>
      <path d="M3.52 9.52A4.8 4.8 0 013.27 8c0-.53.09-1.04.25-1.52V4.4H.86A8 8 0 000 8c0 1.29.31 2.51.86 3.6l2.66-2.08z" fill="#FBBC05"/>
      <path d="M8 3.18c1.17 0 2.22.4 3.05 1.2l2.28-2.28A8 8 0 00.86 4.4l2.66 2.08C4.15 4.58 5.92 3.18 8 3.18z" fill="#EA4335"/>
    </svg>
  )
}
