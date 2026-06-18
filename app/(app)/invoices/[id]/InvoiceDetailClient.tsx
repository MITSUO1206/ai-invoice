'use client'

import { useState } from 'react'
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

const NEXT_STATUSES: Partial<Record<InvoiceStatus, { value: InvoiceStatus; label: string }[]>> = {
  draft: [{ value: 'sent', label: '送付済にする' }, { value: 'cancelled', label: 'キャンセル' }],
  sent: [
    { value: 'paid', label: '支払済にする' },
    { value: 'overdue', label: '期限超過にする' },
    { value: 'cancelled', label: 'キャンセル' },
  ],
  overdue: [{ value: 'paid', label: '支払済にする' }, { value: 'cancelled', label: 'キャンセル' }],
}

type Props = {
  invoice: Invoice
  companyName: string
  companyAddress?: string | null
  companyPhone?: string | null
  companyEmail?: string | null
  companyTaxId?: string | null
  bankInfo?: string | null
}

function fmt(n: number) {
  return `¥${n.toLocaleString('ja-JP')}`
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function InvoiceDetailClient({
  invoice: initial,
  companyName,
  companyAddress,
  companyPhone,
  companyEmail,
  companyTaxId,
  bankInfo,
}: Props) {
  const router = useRouter()
  const [invoice, setInvoice] = useState(initial)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const nextStatusOptions = NEXT_STATUSES[invoice.status] ?? []

  async function updateStatus(newStatus: InvoiceStatus) {
    setUpdating(true)
    setError('')
    const res = await fetch(`/api/invoices/${invoice.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...invoice, status: newStatus }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'ステータス更新に失敗しました')
    } else {
      setInvoice(data)
      router.refresh()
    }
    setUpdating(false)
  }

  async function handleDelete() {
    if (!confirm('この請求書を削除しますか？この操作は取り消せません。')) return
    setDeleting(true)
    const res = await fetch(`/api/invoices/${invoice.id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/invoices')
    } else {
      setError('削除に失敗しました')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* アクションバー */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 戻る
          </button>
          <span className="text-gray-300">|</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[invoice.status as InvoiceStatus]}`}
          >
            {STATUS_LABEL[invoice.status as InvoiceStatus]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-red-600 text-sm">{error}</span>}
          {nextStatusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateStatus(opt.value)}
              disabled={updating}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🖨 印刷/PDF
          </button>
          <a
            href={`/invoices/${invoice.id}/edit`}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            編集
          </a>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
          >
            削除
          </button>
        </div>
      </div>

      {/* 請求書プレビュー */}
      <div className="bg-white rounded-xl border border-gray-200 p-10 max-w-3xl print:border-0 print:shadow-none print:p-0">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">請求書</h1>
            <p className="text-sm text-gray-500">{invoice.invoice_number}</p>
          </div>
          <div className="text-right text-sm text-gray-700 space-y-0.5">
            <p className="font-bold text-gray-900 text-base">{companyName}</p>
            {companyAddress && <p>{companyAddress}</p>}
            {companyPhone && <p>TEL {companyPhone}</p>}
            {companyEmail && <p>{companyEmail}</p>}
            {companyTaxId && <p className="text-xs text-gray-500">登録番号 {companyTaxId}</p>}
          </div>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">請求先</p>
            <p className="text-xl font-bold text-gray-900">{invoice.client_name} 御中</p>
            {invoice.client_address && (
              <p className="text-sm text-gray-600 mt-1">{invoice.client_address}</p>
            )}
          </div>
          <div className="text-right text-sm text-gray-600 space-y-1">
            <div className="flex items-center justify-end gap-3">
              <span className="text-gray-500">発行日</span>
              <span className="font-medium">{fmtDate(invoice.issue_date)}</span>
            </div>
            {invoice.due_date && (
              <div className="flex items-center justify-end gap-3">
                <span className="text-gray-500">支払期限</span>
                <span className="font-medium">{fmtDate(invoice.due_date)}</span>
              </div>
            )}
          </div>
        </div>

        {/* 合計金額 */}
        <div className="bg-gray-50 rounded-lg p-5 mb-8 flex justify-between items-center">
          <span className="text-gray-600">ご請求金額（税込）</span>
          <span className="text-3xl font-bold text-gray-900">{fmt(Number(invoice.total))}</span>
        </div>

        {/* 明細テーブル */}
        <table className="w-full text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-gray-900 text-xs text-gray-500">
              <th className="text-left py-2 pr-4 font-medium">品目・説明</th>
              <th className="text-right py-2 pr-4 font-medium w-20">数量</th>
              <th className="text-right py-2 pr-4 font-medium w-28">単価</th>
              <th className="text-right py-2 font-medium w-28">金額</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 pr-4 text-gray-800">{item.name}</td>
                <td className="py-3 pr-4 text-right text-gray-600">{item.quantity}</td>
                <td className="py-3 pr-4 text-right text-gray-600">
                  {fmt(item.unit_price)}
                </td>
                <td className="py-3 text-right font-medium text-gray-900">
                  {fmt(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 小計・税・合計 */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>小計</span>
              <span>{fmt(Number(invoice.subtotal))}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>消費税（{Math.round(Number(invoice.tax_rate) * 100)}%）</span>
              <span>{fmt(Number(invoice.tax_amount))}</span>
            </div>
            <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2">
              <span>合計</span>
              <span>{fmt(Number(invoice.total))}</span>
            </div>
          </div>
        </div>

        {/* 備考 */}
        {(invoice.notes || bankInfo) && (
          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs font-medium text-gray-500 mb-2">備考</p>
            {bankInfo && <p className="text-sm text-gray-700 mb-1">{bankInfo}</p>}
            {invoice.notes && <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>}
          </div>
        )}
      </div>
    </>
  )
}
