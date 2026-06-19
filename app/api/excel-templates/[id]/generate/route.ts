import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import ExcelJS from 'exceljs'
import type { ExcelFieldMapping, Invoice } from '@/lib/types'

type Params = { params: Promise<{ id: string }> }

function setCellValue(
  workbook: ExcelJS.Workbook,
  location: { sheet: string; cell: string } | undefined,
  value: string | number | null | undefined
) {
  if (!location || value === null || value === undefined || value === '') return
  const sheet = workbook.getWorksheet(location.sheet)
  if (!sheet) return
  sheet.getCell(location.cell).value = value
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: template, error: tplError } = await supabase
    .from('excel_templates').select('*').eq('id', id).single()
  if (tplError || !template) {
    return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
  }

  const invoice: Invoice = await request.json()

  const { data: fileData, error: dlError } = await supabase.storage
    .from('excel-templates').download(template.file_path)
  if (dlError || !fileData) {
    return NextResponse.json({ error: 'テンプレートファイルの取得に失敗しました' }, { status: 500 })
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const mapping: ExcelFieldMapping = template.field_mapping

  setCellValue(workbook, mapping.invoice_number, invoice.invoice_number)
  setCellValue(workbook, mapping.issue_date, invoice.issue_date)
  setCellValue(workbook, mapping.due_date, invoice.due_date)
  setCellValue(workbook, mapping.client_name, invoice.client_name)
  setCellValue(workbook, mapping.client_address, invoice.client_address)
  setCellValue(workbook, mapping.subtotal, invoice.subtotal)
  setCellValue(workbook, mapping.tax_amount, invoice.tax_amount)
  setCellValue(workbook, mapping.total, invoice.total)
  setCellValue(workbook, mapping.notes, invoice.notes)

  if (mapping.items_start_row && mapping.items_sheet && mapping.item_columns) {
    const sheet = workbook.getWorksheet(mapping.items_sheet)
    if (sheet) {
      invoice.items.forEach((item, index) => {
        const row = mapping.items_start_row! + index
        const cols = mapping.item_columns!
        if (cols.name) sheet.getCell(`${cols.name}${row}`).value = item.name
        if (cols.quantity) sheet.getCell(`${cols.quantity}${row}`).value = item.quantity
        if (cols.unit_price) sheet.getCell(`${cols.unit_price}${row}`).value = item.unit_price
        if (cols.amount) sheet.getCell(`${cols.amount}${row}`).value = item.amount
      })
    }
  }

  const outputBuffer = await workbook.xlsx.writeBuffer()

  const fileName = `invoice_${invoice.invoice_number}.xlsx`.replace(/[^a-zA-Z0-9._-]/g, '_')

  return new NextResponse(outputBuffer as ArrayBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}
