'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import type { ExcelTemplate, ExcelFieldMapping } from '@/lib/types'

type Props = {
  templates: ExcelTemplate[]
}

const MAPPING_LABELS: Record<string, string> = {
  invoice_number: '請求書番号',
  issue_date: '発行日',
  due_date: '支払期限',
  client_name: '取引先名',
  client_address: '取引先住所',
  issuer_name: '発行者名',
  issuer_address: '発行者住所',
  subtotal: '小計',
  tax_amount: '消費税',
  total: '合計',
  notes: '備考',
}

type UploadStep = 'idle' | 'uploading' | 'analyzing' | 'review' | 'saving'

export default function ExcelTemplateSection({ templates: initial }: Props) {
  const [templates, setTemplates] = useState(initial)
  const [step, setStep] = useState<UploadStep>('idle')
  const [error, setError] = useState('')
  const [uploadedPath, setUploadedPath] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [mapping, setMapping] = useState<ExcelFieldMapping>({})
  const [templateName, setTemplateName] = useState('')
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setError('.xlsx または .xls ファイルを選択してください')
      return
    }
    setError('')
    setStep('uploading')

    const formData = new FormData()
    formData.append('file', file)

    const uploadRes = await fetch('/api/excel-templates/upload', {
      method: 'POST',
      body: formData,
    })
    const uploadData = await uploadRes.json()
    if (!uploadRes.ok) {
      setError(uploadData.error || 'アップロードに失敗しました')
      setStep('idle')
      return
    }

    setUploadedPath(uploadData.file_path)
    setOriginalName(uploadData.original_name)
    setTemplateName(uploadData.original_name.replace(/\.(xlsx|xls)$/i, ''))
    setStep('analyzing')

    const analyzeRes = await fetch('/api/excel-templates/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: uploadData.file_path }),
    })
    const analyzeData = await analyzeRes.json()
    if (!analyzeRes.ok) {
      setError(analyzeData.error || 'AI解析に失敗しました')
      setStep('idle')
      return
    }

    setMapping(analyzeData.field_mapping ?? {})
    setStep('review')
  }

  async function saveTemplate() {
    if (!templateName.trim()) {
      setError('テンプレート名を入力してください')
      return
    }
    setStep('saving')
    setError('')

    const res = await fetch('/api/excel-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateName.trim(),
        file_path: uploadedPath,
        field_mapping: mapping,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || '保存に失敗しました')
      setStep('review')
      return
    }

    setTemplates((prev) => [data, ...prev])
    setStep('idle')
    setMapping({})
    setUploadedPath('')
    setTemplateName('')
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/excel-templates/${id}`, { method: 'DELETE' })
    if (res.ok) setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  function updateMappingCell(key: string, field: 'sheet' | 'cell', value: string) {
    setMapping((prev) => ({
      ...prev,
      [key]: { ...(prev[key as keyof ExcelFieldMapping] as Record<string, string> ?? {}), [field]: value },
    }))
  }

  const getMappingValue = (key: string) =>
    mapping[key as keyof ExcelFieldMapping] as { sheet: string; cell: string } | undefined

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Excelテンプレート</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          既存のExcel請求書フォーマットをアップロードしてAIが自動解析します
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {step === 'idle' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files[0]
            if (file) handleFile(file)
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50'
          }`}
        >
          <div className="text-4xl mb-3">📊</div>
          <p className="text-sm font-medium text-gray-700">
            Excelファイルをドロップ またはクリックして選択
          </p>
          <p className="text-xs text-gray-400 mt-1">.xlsx / .xls 対応</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      )}

      {(step === 'uploading' || step === 'analyzing') && (
        <div className="border-2 border-dashed border-blue-200 rounded-xl p-10 text-center bg-blue-50">
          <div className="text-4xl mb-3 animate-pulse">
            {step === 'uploading' ? '⬆️' : '🤖'}
          </div>
          <p className="text-sm font-medium text-gray-700">
            {step === 'uploading' ? 'アップロード中...' : 'AIがセル位置を解析中...'}
          </p>
          {step === 'analyzing' && (
            <p className="text-xs text-gray-400 mt-1">しばらくお待ちください</p>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">AI解析結果の確認</h3>
            <span className="text-xs text-gray-400">{originalName}</span>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">テンプレート名 *</label>
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 標準請求書フォーマット"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500">フィールドマッピング（修正可能）</p>
            <div className="grid gap-2">
              {Object.entries(MAPPING_LABELS).map(([key, label]) => {
                const val = getMappingValue(key)
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-28 shrink-0">{label}</span>
                    <input
                      value={val?.sheet ?? ''}
                      onChange={(e) => updateMappingCell(key, 'sheet', e.target.value)}
                      placeholder="シート名"
                      className="px-2 py-1 border border-gray-200 rounded text-xs w-28 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={val?.cell ?? ''}
                      onChange={(e) => updateMappingCell(key, 'cell', e.target.value)}
                      placeholder="例: B3"
                      className="px-2 py-1 border border-gray-200 rounded text-xs w-20 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                )
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { setStep('idle'); setMapping({}); setUploadedPath('') }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={saveTemplate}
              className="px-5 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              テンプレートを保存
            </button>
          </div>
        </div>
      )}

      {step === 'saving' && (
        <div className="text-center py-4 text-sm text-gray-500">保存中...</div>
      )}

      {templates.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-700">保存済みExcelテンプレート</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-500">
                <th className="text-left px-6 py-3 font-medium">テンプレート名</th>
                <th className="text-left px-6 py-3 font-medium">登録日</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span className="font-medium text-gray-900">{t.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400 text-xs">
                    {new Date(t.created_at).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/invoices?excelTemplate=${t.id}`}
                        className="text-xs text-green-600 border border-green-200 rounded px-2 py-1 hover:bg-green-50 transition-colors"
                      >
                        このテンプレートを使う
                      </Link>
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        削除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
