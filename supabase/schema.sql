-- ========================================
-- AI請求書システム データベーススキーマ v1.1
-- ========================================

-- Companies テーブル（自社情報設定含む）
CREATE TABLE IF NOT EXISTS companies (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text        NOT NULL,
  rep_name          text,
  address           text,
  phone             text,
  email             text,
  website           text,
  tax_id            text,
  bank_name         text,
  bank_branch       text,
  bank_type         text        DEFAULT '普通',
  bank_number       text,
  bank_holder       text,
  default_tax_rate  numeric     NOT NULL DEFAULT 0.1,
  default_due_days  integer     NOT NULL DEFAULT 30,
  default_notes     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Profiles テーブル（Supabase auth.users と 1:1）
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text    NOT NULL,
  role       text    NOT NULL DEFAULT 'employee'
               CHECK (role IN ('admin', 'manager', 'employee')),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Invoices テーブル
CREATE TABLE IF NOT EXISTS invoices (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number text    NOT NULL,
  client_name    text    NOT NULL,
  client_email   text,
  client_address text,
  issue_date     date    NOT NULL DEFAULT CURRENT_DATE,
  due_date       date,
  tax_rate       numeric NOT NULL DEFAULT 0.1,
  status         text    NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  items          jsonb   NOT NULL DEFAULT '[]'::jsonb,
  notes          text,
  subtotal       numeric NOT NULL DEFAULT 0,
  tax_amount     numeric NOT NULL DEFAULT 0,
  total          numeric NOT NULL DEFAULT 0,
  created_by     uuid    REFERENCES profiles(id),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Invoice Templates テーブル
CREATE TABLE IF NOT EXISTS invoice_templates (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid    NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       text    NOT NULL,
  items      jsonb   NOT NULL DEFAULT '[]'::jsonb,
  tax_rate   numeric NOT NULL DEFAULT 0.1,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========================================
-- Row Level Security (RLS) 設定
-- ========================================

ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

-- 現在ユーザーの company_id を取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() AND is_active = true
$$;

-- 現在ユーザーの role を取得するヘルパー関数
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT role FROM profiles WHERE id = auth.uid() AND is_active = true
$$;

-- Companies RLS ポリシー
CREATE POLICY "自社情報を閲覧できる" ON companies
  FOR SELECT USING (id = get_my_company_id());

CREATE POLICY "管理者のみ自社情報を更新できる" ON companies
  FOR UPDATE USING (id = get_my_company_id() AND get_my_role() = 'admin');

-- Profiles RLS ポリシー
CREATE POLICY "同社のプロフィールを閲覧できる" ON profiles
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "管理者のみプロフィールを作成できる" ON profiles
  FOR INSERT WITH CHECK (
    company_id = get_my_company_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "管理者のみプロフィールを更新できる" ON profiles
  FOR UPDATE USING (
    company_id = get_my_company_id() AND get_my_role() = 'admin'
  );

CREATE POLICY "管理者のみプロフィールを削除できる" ON profiles
  FOR DELETE USING (
    company_id = get_my_company_id() AND get_my_role() = 'admin'
    AND id != auth.uid()
  );

-- Invoices RLS ポリシー
CREATE POLICY "同社の請求書を閲覧できる" ON invoices
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "同社の請求書を作成できる" ON invoices
  FOR INSERT WITH CHECK (company_id = get_my_company_id());

CREATE POLICY "同社の請求書を更新できる" ON invoices
  FOR UPDATE USING (company_id = get_my_company_id());

CREATE POLICY "同社の請求書を削除できる" ON invoices
  FOR DELETE USING (company_id = get_my_company_id());

-- Invoice Templates RLS ポリシー
CREATE POLICY "同社のテンプレートを閲覧できる" ON invoice_templates
  FOR SELECT USING (company_id = get_my_company_id());

CREATE POLICY "同社のテンプレートを管理できる" ON invoice_templates
  FOR ALL USING (company_id = get_my_company_id());

-- ========================================
-- 登録用 SECURITY DEFINER 関数
-- （RLS を経由せずに会社 + プロフィールを作成）
-- ========================================
CREATE OR REPLACE FUNCTION register_user(
  p_user_id      uuid,
  p_user_name    text,
  p_company_name text
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  INSERT INTO companies (name)
  VALUES (p_company_name)
  RETURNING id INTO v_company_id;

  INSERT INTO profiles (id, company_id, name, role)
  VALUES (p_user_id, v_company_id, p_user_name, 'admin');
END;
$$;
