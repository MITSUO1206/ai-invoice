-- Excel テンプレートテーブル
-- Supabase SQL Editor で実行してください
CREATE TABLE IF NOT EXISTS excel_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  field_mapping JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE excel_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "excel_templates_company_access" ON excel_templates
  FOR ALL
  USING (
    company_id = (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Storage バケット用ポリシー (Storage > Policies で実行)
-- バケット名: excel-templates (非公開)
--
-- INSERT policy:
-- CREATE POLICY "authenticated upload" ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'excel-templates');
--
-- SELECT policy:
-- CREATE POLICY "authenticated read" ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'excel-templates');
--
-- DELETE policy:
-- CREATE POLICY "authenticated delete" ON storage.objects FOR DELETE TO authenticated
-- USING (bucket_id = 'excel-templates');
