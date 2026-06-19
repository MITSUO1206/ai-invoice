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

-- 同じ会社のユーザーのみ参照・更新可能、作成は自分のcompany_idのみ
CREATE POLICY "excel_templates_company_access" ON excel_templates
  FOR ALL
  USING (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id = (SELECT company_id FROM profiles WHERE id = auth.uid())
    AND file_path LIKE ((SELECT company_id::text FROM profiles WHERE id = auth.uid()) || '/%')
  );

-- Storage バケット用ポリシー (Storage > Policies で実行)
-- バケット名: excel-templates (非公開)
-- ※ファイルパスは "{company_id}/{timestamp}-{filename}" の形式で保存されます
--
-- INSERT policy (自社フォルダへのみアップロード可):
-- CREATE POLICY "company upload" ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (
--   bucket_id = 'excel-templates'
--   AND (storage.foldername(name))[1] = (
--     SELECT company_id::text FROM profiles WHERE id = auth.uid()
--   )
-- );
--
-- SELECT policy (自社フォルダのみ読み取り可):
-- CREATE POLICY "company read" ON storage.objects FOR SELECT TO authenticated
-- USING (
--   bucket_id = 'excel-templates'
--   AND (storage.foldername(name))[1] = (
--     SELECT company_id::text FROM profiles WHERE id = auth.uid()
--   )
-- );
--
-- DELETE policy (自社フォルダのみ削除可):
-- CREATE POLICY "company delete" ON storage.objects FOR DELETE TO authenticated
-- USING (
--   bucket_id = 'excel-templates'
--   AND (storage.foldername(name))[1] = (
--     SELECT company_id::text FROM profiles WHERE id = auth.uid()
--   )
-- );
