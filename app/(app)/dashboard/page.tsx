import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceStatus } from '@/lib/types'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: '下書き',
  sent: '送付済',
  paid: '支払済',
  overdue: '期限超過',
  cancelled: 'キャンセル',
}

const STATUS_CLASS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-50 text-gray-400',
}

function formatCurrency(amount: number) {
  return `¥${amount.toLocaleString('ja-JP')}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })

  const allInvoices: Invoice[] = invoices ?? []
  const total_invoices = allInvoices.length
  const paid_total = allInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const unpaid_total = allInvoices
    .filter((inv) => inv.status === 'sent')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const overdue_count = allInvoices.filter((inv) => inv.status === 'overdue').length
  const recent_invoices = allInvoices.slice(0, 8)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            ようこそ、{profile?.name}さん
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ＋ 新規作成
        </Link>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">総請求書数</p>
          <p className="text-3xl font-bold text-gray-900">{total_invoices}件</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">売上合計（支払済）</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(paid_total)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">未払い合計</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(unpaid_total)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">期限超過</p>
          <p className="text-3xl font-bold text-red-600">{overdue_count}件</p>
        </div>
      </div>

      {/* 最近の請求書 */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">最近の請求書</h2>
          <Link
            href="/invoices"
            className="text-sm text-blue-600 hover:underline"
          >
            すべて見る →
          </Link>
        </div>

        {recent_invoices.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">
            請求書がまだありません
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left px-6 py-3 font-medium">請求書番号</th>
                  <th className="text-left px-6 py-3 font-medium">取引先</th>
                  <th className="text-left px-6 py-3 font-medium">発行日</th>
                  <th className="text-left px-6 py-3 font-medium">ステータス</th>
                  <th className="text-right px-6 py-3 font-medium">合計金額</th>
                </tr>
              </thead>
              <tbody>
                {recent_invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/invoices/${inv.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{inv.client_name}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {formatDate(inv.issue_date)}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[inv.status as InvoiceStatus]}`}
                      >
                        {STATUS_LABEL[inv.status as InvoiceStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(Number(inv.total))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
