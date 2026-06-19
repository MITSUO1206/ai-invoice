'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'draft', label: '下書き' },
  { value: 'sent', label: '送付済' },
  { value: 'paid', label: '支払済' },
  { value: 'overdue', label: '期限超過' },
  { value: 'cancelled', label: 'キャンセル' },
]

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

type Props = {
  invoices: Invoice[]
  status: string
  excelTemplateId?: string
  excelTemplateName?: string
}

export default function InvoicesClient({ invoices, status, excelTemplateId, excelTemplateName }: Props) {
  const router = useRouter()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [error, setError] = useState('')

  async function downloadExcel(invoice: Invoice) {
    if (!excelTemplateId) return
    setDownloading(invoice.id)
    setError('')
    try {
      const res = await fetch(`/api/excel-templates/${excelTemplateId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Excel出力に失敗しました')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice_${invoice.invoice_number}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloading(null)
    }
  }

  function tabHref(tabValue: string) {
    const params = new URLSearchParams()
    if (tabValue !== 'all') params.set('status', tabValue)
    if (excelTemplateId) params.set('excelTemplate', excelTemplateId)
    const qs = params.toString()
    return `/invoices${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">請求書一覧</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length}件の請求書</p>
        </div>
        <Link
          href="/invoices/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          ＋ 新規作成
        </Link>
      </div>

      {/* Excelテンプレート選択中バナー */}
      {excelTemplateId && excelTemplateName && (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-5 py-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <span className="text-lg">📊</span>
            <span>出力テンプレート：<span className="font-semibold">{excelTemplateName}</span></span>
            <span className="text-green-600">— 各行の「出力」ボタンでExcelをダウンロード</span>
          </div>
          <Link
            href="/invoices"
            className="text-xs text-green-600 hover:underline"
          >
            解除
          </Link>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ステータスタブ */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              status === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        {invoices.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm mb-4">請求書がありません</p>
            <Link href="/invoices/new" className="text-blue-600 hover:underline text-sm">
              最初の請求書を作成する →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500">
                  <th className="text-left px-6 py-3 font-medium">請求書番号</th>
                  <th className="text-left px-6 py-3 font-medium">取引先</th>
                  <th className="text-left px-6 py-3 font-medium">発行日</th>
                  <th className="text-left px-6 py-3 font-medium">支払期限</th>
                  <th className="text-left px-6 py-3 font-medium">ステータス</th>
                  <th className="text-right px-6 py-3 font-medium">合計金額</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{inv.client_name}</td>
                    <td className="px-6 py-3 text-gray-500">{formatDate(inv.issue_date)}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[inv.status as InvoiceStatus]}`}>
                        {STATUS_LABEL[inv.status as InvoiceStatus]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(Number(inv.total))}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {excelTemplateId && (
                          <button
                            onClick={() => downloadExcel(inv)}
                            disabled={downloading === inv.id}
                            className="text-xs text-green-600 border border-green-200 rounded px-2 py-1 hover:bg-green-50 transition-colors disabled:opacity-50"
                          >
                            {downloading === inv.id ? '生成中...' : '📊 出力'}
                          </button>
                        )}
                        <Link href={`/invoices/${inv.id}/edit`} className="text-gray-400 hover:text-gray-600 text-xs">
                          編集
                        </Link>
                      </div>
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
