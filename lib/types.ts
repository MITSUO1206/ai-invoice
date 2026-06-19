export type Role = 'admin' | 'manager' | 'employee'

export type Company = {
  id: string
  name: string
  rep_name: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  tax_id: string | null
  bank_name: string | null
  bank_branch: string | null
  bank_type: string | null
  bank_number: string | null
  bank_holder: string | null
  default_tax_rate: number
  default_due_days: number
  default_notes: string | null
  created_at: string
}

export type Profile = {
  id: string
  company_id: string
  name: string
  role: Role
  is_active: boolean
  created_at: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type InvoiceItem = {
  name: string
  quantity: number
  unit_price: number
  amount: number
}

export type Invoice = {
  id: string
  company_id: string
  invoice_number: string
  client_name: string
  client_email: string | null
  client_address: string | null
  issue_date: string
  due_date: string | null
  tax_rate: number
  status: InvoiceStatus
  items: InvoiceItem[]
  notes: string | null
  subtotal: number
  tax_amount: number
  total: number
  created_by: string
  created_at: string
}

export type InvoiceTemplate = {
  id: string
  company_id: string
  name: string
  items: InvoiceItem[]
  tax_rate: number
  notes: string | null
  created_at: string
}

export type DashboardStats = {
  total_invoices: number
  paid_total: number
  unpaid_total: number
  overdue_count: number
  recent_invoices: Invoice[]
}

export type ExcelFieldMapping = {
  invoice_number?: { sheet: string; cell: string }
  issue_date?: { sheet: string; cell: string }
  due_date?: { sheet: string; cell: string }
  client_name?: { sheet: string; cell: string }
  client_address?: { sheet: string; cell: string }
  issuer_name?: { sheet: string; cell: string }
  issuer_address?: { sheet: string; cell: string }
  items_start_row?: number
  items_sheet?: string
  item_columns?: {
    name?: string
    quantity?: string
    unit_price?: string
    amount?: string
  }
  subtotal?: { sheet: string; cell: string }
  tax_amount?: { sheet: string; cell: string }
  total?: { sheet: string; cell: string }
  notes?: { sheet: string; cell: string }
}

export type ExcelTemplate = {
  id: string
  company_id: string
  name: string
  file_path: string
  field_mapping: ExcelFieldMapping
  created_by: string | null
  created_at: string
}
