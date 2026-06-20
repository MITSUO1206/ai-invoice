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

function argbToHex(argb?: string): string | undefined {
  if (!argb || argb.length < 6) return undefined
  // ARGB format: "FF0070C0" → "#0070C0"
  const hex = argb.length === 8 ? argb.slice(2) : argb
  return `#${hex}`
}

function borderStyle(border?: ExcelJS.BorderStyle): string {
  if (!border) return 'none'
  switch (border) {
    case 'thin': return '1px solid'
    case 'medium': return '2px solid'
    case 'thick': return '3px solid'
    case 'dotted': return '1px dotted'
    case 'dashed': return '1px dashed'
    case 'double': return '3px double'
    default: return '1px solid'
  }
}

function worksheetToHtml(worksheet: ExcelJS.Worksheet): string {
  // マージセル情報を収集: "A1" → { rowspan, colspan }
  const mergeMap = new Map<string, { rowspan: number; colspan: number }>()
  const skipSet = new Set<string>()

  // worksheet.model.merges はマージ範囲の配列 e.g. "A1:C3"
  const model = worksheet.model as { merges?: string[] }
  if (model.merges) {
    for (const range of model.merges) {
      const [start, end] = range.split(':')
      if (!start || !end) continue
      const startCell = worksheet.getCell(start)
      const endCell = worksheet.getCell(end)
      const rowspan = endCell.row - startCell.row + 1
      const colspan = endCell.col - startCell.col + 1
      mergeMap.set(start, { rowspan, colspan })
      // スキップするセルを登録
      for (let r = startCell.row; r <= endCell.row; r++) {
        for (let c = startCell.col; c <= endCell.col; c++) {
          if (r === startCell.row && c === startCell.col) continue
          skipSet.add(worksheet.getCell(r, c).address)
        }
      }
    }
  }

  // 列幅を収集
  const colWidths: number[] = []
  worksheet.columns.forEach((col) => {
    colWidths.push(Math.round((col.width ?? 8) * 7))
  })

  let html = `<table style="border-collapse:collapse;font-family:Meiryo,'MS Gothic',sans-serif;font-size:11px;table-layout:fixed;">`

  // colgroup
  html += '<colgroup>'
  colWidths.forEach((w) => {
    html += `<col style="width:${w}px">`
  })
  html += '</colgroup><tbody>'

  worksheet.eachRow({ includeEmpty: true }, (row, _rowNum) => {
    const heightPx = row.height ? Math.round(row.height * 1.33) : 20
    html += `<tr style="height:${heightPx}px">`

    for (let colNum = 1; colNum <= worksheet.columnCount; colNum++) {
      const cell = row.getCell(colNum)
      const addr = cell.address

      if (skipSet.has(addr)) continue

      const merge = mergeMap.get(addr)
      const rowspan = merge?.rowspan ?? 1
      const colspan = merge?.colspan ?? 1

      const style = cell.style ?? {}
      const fill = style.fill as ExcelJS.FillPattern | undefined
      const font = style.font ?? {}
      const alignment = style.alignment ?? {}
      const border = style.border ?? {}

      // 背景色
      const bgColor = fill?.type === 'pattern' && fill.fgColor?.argb
        ? argbToHex(fill.fgColor.argb)
        : undefined
      // フォント色
      const fontColor = font.color?.argb ? argbToHex(font.color.argb) : undefined

      // 罫線
      const bTop = border.top ? `border-top:${borderStyle(border.top.style)} ${argbToHex(border.top.color?.argb) ?? '#000'};` : ''
      const bRight = border.right ? `border-right:${borderStyle(border.right.style)} ${argbToHex(border.right.color?.argb) ?? '#000'};` : ''
      const bBottom = border.bottom ? `border-bottom:${borderStyle(border.bottom.style)} ${argbToHex(border.bottom.color?.argb) ?? '#000'};` : ''
      const bLeft = border.left ? `border-left:${borderStyle(border.left.style)} ${argbToHex(border.left.color?.argb) ?? '#000'};` : ''

      // テキスト配置
      const textAlign = alignment.horizontal === 'center' ? 'center'
        : alignment.horizontal === 'right' ? 'right'
        : 'left'
      const vertAlign = alignment.vertical === 'middle' ? 'middle'
        : alignment.vertical === 'bottom' ? 'bottom'
        : 'top'

      const cellStyle = [
        bgColor ? `background:${bgColor};` : '',
        fontColor ? `color:${fontColor};` : '',
        font.bold ? 'font-weight:bold;' : '',
        font.size ? `font-size:${font.size}px;` : '',
        font.name ? `font-family:"${font.name}",sans-serif;` : '',
        bTop, bRight, bBottom, bLeft,
        `text-align:${textAlign};`,
        `vertical-align:${vertAlign};`,
        'padding:2px 4px;',
        'overflow:hidden;white-space:nowrap;',
      ].filter(Boolean).join('')

      // セルの値
      let value = ''
      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && 'richText' in cell.value) {
          value = (cell.value as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
        } else if (typeof cell.value === 'object' && 'formula' in cell.value) {
          const result = (cell.value as ExcelJS.CellFormulaValue).result
          value = result !== undefined && result !== null ? String(result) : ''
        } else if (cell.value instanceof Date) {
          value = cell.value.toLocaleDateString('ja-JP')
        } else {
          value = String(cell.value)
        }
      }

      const attrs = [
        rowspan > 1 ? `rowspan="${rowspan}"` : '',
        colspan > 1 ? `colspan="${colspan}"` : '',
        `style="${cellStyle}"`,
      ].filter(Boolean).join(' ')

      html += `<td ${attrs}>${value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`
    }

    html += '</tr>'
  })

  html += '</tbody></table>'
  return html
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('company_id').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: template, error: tplError } = await supabase
    .from('excel_templates').select('*').eq('id', id).eq('company_id', profile.company_id).single()
  if (tplError || !template) {
    return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
  }

  const invoice: Invoice = await request.json()

  const { data: fileData, error: dlError } = await supabase.storage
    .from('excel-templates').download(template.file_path)
  if (dlError || !fileData) {
    return NextResponse.json({ error: 'ファイルの取得に失敗しました' }, { status: 500 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = Buffer.from(await fileData.arrayBuffer()) as any

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const mapping: ExcelFieldMapping = template.field_mapping

  setCellValue(workbook, mapping.invoice_number, invoice.invoice_number)
  setCellValue(workbook, mapping.issue_date, invoice.issue_date)
  setCellValue(workbook, mapping.due_date, invoice.due_date)
  setCellValue(workbook, mapping.client_name, invoice.client_name)
  setCellValue(workbook, mapping.client_address, invoice.client_address)
  setCellValue(workbook, mapping.subtotal, Number(invoice.subtotal).toLocaleString('ja-JP'))
  setCellValue(workbook, mapping.tax_amount, Number(invoice.tax_amount).toLocaleString('ja-JP'))
  setCellValue(workbook, mapping.total, Number(invoice.total).toLocaleString('ja-JP'))
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

  // 最初のシートをHTML変換
  const firstSheet = workbook.worksheets[0]
  if (!firstSheet) {
    return NextResponse.json({ error: 'シートが見つかりません' }, { status: 500 })
  }

  const html = worksheetToHtml(firstSheet)
  return NextResponse.json({ html })
}
