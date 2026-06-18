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

type Props = {
  profiles: Profile[]
  currentUserId: string
}

export default function EmployeesClient({ profiles: initial, currentUserId }: Props) {
  const router = useRouter()
  const [profiles, setProfiles] = useState(initial)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState('')

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
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, role: data.role } : p))
      )
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
      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? { ...p, is_active: data.is_active } : p))
      )
      router.refresh()
    }
    setUpdating(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">メンバー管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          同じ会社のメンバー一覧です（招待はSupabase Authから行います）
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                        {isSelf && (
                          <span className="ml-1.5 text-xs text-gray-400">（自分）</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {isSelf ? (
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_CLASS[profile.role as Role]}`}
                      >
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
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        profile.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
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
      </div>
    </div>
  )
}
