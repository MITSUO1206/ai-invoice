'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Company = {
  id: string
  name: string
  created_at: string
  created_by: string | null
}

type Props = {
  companies: Company[]
  currentUserId: string
}

export default function CompaniesClient({ companies: initial, currentUserId }: Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState(initial)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  async function createCompany() {
    if (!newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '会社の作成に失敗しました')
      } else {
        setCompanies((prev) => [{
          id: data.id,
          name: newName.trim(),
          created_at: new Date().toISOString(),
          created_by: currentUserId,
        }, ...prev])
        setNewName('')
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">会社管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理する会社アカウントを作成・管理します</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 新規会社作成 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">新規会社を追加</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createCompany()}
            placeholder="会社名を入力"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={createCompany}
            disabled={creating || !newName.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {creating ? '作成中...' : '🏢 会社を追加'}
          </button>
        </div>
      </section>

      {/* 会社一覧 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">会社一覧</h2>
          <span className="text-xs text-gray-400">{companies.length} 件</span>
        </div>
        {companies.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400">
            会社が登録されていません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-6 py-3 font-medium">会社名</th>
                <th className="text-left px-6 py-3 font-medium">作成日</th>
                <th className="text-left px-6 py-3 font-medium">作成者</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏢</span>
                      <span className="font-medium text-gray-900">{company.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {new Date(company.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {company.created_by === currentUserId ? (
                      <span className="text-blue-600 font-medium">自分</span>
                    ) : (
                      <span>他のユーザー</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
