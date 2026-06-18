'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function RegisterForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [form, setForm] = useState({ name: '', company_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteInfo, setInviteInfo] = useState<{ company_name: string; role: string } | null>(null)
  const [inviteError, setInviteError] = useState('')

  useEffect(() => {
    if (!inviteToken) return
    fetch(`/api/invitations/verify?token=${inviteToken}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setInviteInfo({ company_name: data.company_name, role: data.role })
        } else {
          setInviteError(data.error || '無効な招待リンクです')
        }
      })
      .catch(() => setInviteError('招待リンクの確認に失敗しました'))
  }, [inviteToken])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const body = inviteToken
        ? { email: form.email, password: form.password, name: form.name, invite_token: inviteToken }
        : { ...form }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '登録に失敗しました')
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password,
      })

      if (loginError) {
        if (loginError.message.includes('Email not confirmed')) {
          setError('確認メールを送信しました。メールのリンクをクリックしてからログインしてください。')
        } else {
          setError('登録は完了しました。ログインページからサインインしてください。')
        }
        setLoading(false)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('接続エラーが発生しました。しばらく待ってから再度お試しください。')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-2xl">📄</span>
            <h1 className="text-2xl font-bold text-blue-600">AI請求書</h1>
          </div>
          {inviteToken ? (
            inviteError ? (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-600 text-sm">{inviteError}</p>
                <Link href="/register" className="text-blue-600 text-sm hover:underline mt-1 block">
                  通常登録はこちら
                </Link>
              </div>
            ) : inviteInfo ? (
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-left">
                <p className="text-blue-800 text-sm font-medium">招待で参加</p>
                <p className="text-blue-600 text-sm mt-0.5">
                  {inviteInfo.company_name} に参加します
                </p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mt-2">招待リンクを確認中...</p>
            )
          ) : (
            <p className="text-gray-500 text-sm">新規アカウント登録</p>
          )}
        </div>

        {(!inviteToken || inviteInfo) && !inviteError && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text" name="name" value={form.name} onChange={handleChange}
                placeholder="山田 太郎" required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {!inviteToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  会社名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" name="company_name" value={form.company_name} onChange={handleChange}
                  placeholder="株式会社サンプル" required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email" name="email" value={form.email} onChange={handleChange}
                placeholder="yamada@example.com" required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password" name="password" value={form.password} onChange={handleChange}
                placeholder="8文字以上" required minLength={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {loading ? '登録中...' : '新規登録'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-4">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-blue-600 hover:underline">ログイン</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><p className="text-gray-400">読み込み中...</p></div>}>
      <RegisterForm />
    </Suspense>
  )
}
