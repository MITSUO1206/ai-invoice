'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Role } from '@/lib/types'

type NavItem = {
  label: string
  href: string
  icon: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'ダッシュボード', href: '/dashboard', icon: '📊' },
  { label: '請求書一覧', href: '/invoices', icon: '📄' },
  { label: '新規作成', href: '/invoices/new', icon: '➕' },
  { label: 'テンプレート', href: '/templates', icon: '📋' },
  { label: '従業員管理', href: '/employees', icon: '👥', adminOnly: true },
  { label: '自社情報設定', href: '/settings', icon: '⚙️', adminOnly: true },
]

type Props = {
  userName: string
  role: Role
}

export default function Sidebar({ userName, role }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === 'admin'
  )

  return (
    <aside className="w-56 min-h-screen bg-[#1E293B] flex flex-col text-white shrink-0">
      {/* ロゴ */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📄</span>
          <span className="font-bold text-lg text-white">AI請求書</span>
        </div>
        <p className="text-xs text-slate-400 mt-1 truncate">{userName}</p>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150 ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* ログアウト */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-colors duration-150"
        >
          <span>🚪</span>
          <span>ログアウト</span>
        </button>
      </div>
    </aside>
  )
}
