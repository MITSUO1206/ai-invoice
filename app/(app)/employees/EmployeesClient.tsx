'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile, Role } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = {
  admin: '管理者',
  manager: 'マネージャー',
  employee: '一般',
}

const ROLE_CLASS: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  manager: 'bg-blue-100 text-blue-700',
  employee: 'bg-gray-100 text-gray-600',
}

type Invitation = {
  id: string
  role: Role
  token: string
  company_id: string
  expires_at: string
  created_at: string
}

type Company = { id: string; name: string }

type Props = {
  profiles: Profile[]
  currentUserId: string
  invitations: Invitation[]
  baseUrl: string
  companies: Company[]
  myCompanyId: string
}

export default function EmployeesClient({
  profiles: initial,
  currentUserId,
  invitations: initialInvitations,
  baseUrl,
  companies,
  myCompanyId,
}: Props) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initial)
  const [invitations, setInvitations] = useState(initialInvitations)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [newInviteRole, setNewInviteRole] = useState<Role>('employee')
  const [newInviteCompany, setNewInviteCompany] = useState(myCompanyId)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const companyName = (id: string) =>
    companies.find((c) => c.id === id)?.name ?? id.slice(0, 8) + '...'

  async function updateRole(profileId: string, role: Role) {
    setUpdating(profileId)
    setError('')
    const res = await fetch(`/api/employees/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '更新に失敗しました')
    } else {
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, role: data.role } : p)))
      router.refresh()
    }
    setUpdating(null)
  }

  async function toggleActive(profileId: string, isActive: boolean) {
    setUpdating(profileId)
    setError('')
    const res = await fetch(`/api/employees/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !isActive }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '更新に失敗しました')
    } else {
      setProfiles((prev) => prev.map((p) => (p.id === profileId ? { ...p, is_active: data.is_active } : p)))
      router.refresh()
    }
    setUpdating(null)
  }

  async function createInvite() {
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newInviteRole, company_id: newInviteCompany }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || '招待リンクの作成に失敗しました')
      } else {
        setInvitations((prev) => [data, ...prev])
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setCreating(false)
    }
  }

  async function deleteInvite(id: string) {
    const res = await fetch(`/api/invitations/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setInvitations((prev) => prev.filter((inv) => inv.id !== id))
    }
  }

  function copyLink(token: string) {
    const url = `${baseUrl}/register?invite=${token}`
    navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">メンバー管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">招待リンクを発行して従業員を追加できます</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* 招待リンク作成 */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">招待リンクを発行</h2>
        <div className="flex flex-wrap items-center gap-3">
          {companies.length > 1 && (
            <select
              value={newInviteCompany}
              onChange={(e) => setNewInviteCompany(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.id === myCompanyId ? '（自社）' : ''}
                </option>
              ))}
            </select>
          )}
          <select
            value={newInviteRole}
            onChange={(e) => setNewInviteRole(e.target.value as Role)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="employee">一般</option>
            <option value="manager">マネージャー</option>
            <option value="admin">管理者</option>
          </select>
          <button
            onClick={createInvite}
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? '作成中...' : '🔗 招待リンクを作成'}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">リンクは7日間有効です。1回使い切りです。</p>

        {/* 発行済みリンク */}
        {invitations.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-500">発行済みリンク（未使用）</p>
            {invitations.map((inv) => {
              const url = `${baseUrl}/register?invite=${inv.token}`
              return (
                <div key={inv.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_CLASS[inv.role]}`}>
                    {ROLE_LABEL[inv.role]}
                  </span>
                  {companies.length > 1 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium">
                      {companyName(inv.company_id)}
                    </span>
                  )}
                  <span className="text-xs text-gray-500 flex-1 truncate">{url}</span>
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                  >
                    {copied === inv.token ? '✓ コピー済み' : 'コピー'}
                  </button>
                  <button
                    onClick={() => deleteInvite(inv.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    削除
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* メンバー一覧 */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">メンバー一覧</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-500">
              <th className="text-left px-6 py-3 font-medium">名前</th>
              <th className="text-left px-6 py-3 font-medium">ロール</th>
              <th className="text-left px-6 py-3 font-medium">ステータス</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const isSelf = profile.id === currentUserId
              return (
                <tr key={profile.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                        {profile.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">
                        {profile.name}
                        {isSelf && <span className="ml-1.5 text-xs text-gray-400">（自分）</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isSelf ? (
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_CLASS[profile.role as Role]}`}>
                        {ROLE_LABEL[profile.role as Role]}
                      </span>
                    ) : (
                      <select
                        value={profile.role}
                        onChange={(e) => updateRole(profile.id, e.target.value as Role)}
                        disabled={updating === profile.id}
                        className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        <option value="admin">管理者</option>
                        <option value="manager">マネージャー</option>
                        <option value="employee">一般</option>
                      </select>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profile.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {profile.is_active ? '有効' : '無効'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!isSelf && (
                      <button
                        onClick={() => toggleActive(profile.id, profile.is_active)}
                        disabled={updating === profile.id}
                        className="text-xs text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      >
                        {profile.is_active ? '無効化' : '有効化'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </div>
  )
}
