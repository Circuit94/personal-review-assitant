-- 确保 resumes bucket 存在
INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

-- 允许认证用户上传到 resumes bucket (通过路径中的 userId 校验)
CREATE POLICY "Allow authenticated users to upload to resumes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'resumes' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);

-- 允许认证用户更新自己的简历
CREATE POLICY "Allow authenticated users to update their own resumes"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'resumes' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'resumes' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);

-- 允许所有人查看简历
CREATE POLICY "Allow public access to resumes"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'resumes');

-- 允许认证用户删除自己的简历
CREATE POLICY "Allow authenticated users to delete their own resumes"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'resumes' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);

-- 允许认证用户上传到 audio 录音 (如果使用了 supabase storage)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('audio_records', 'audio_records', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated users to upload to audio_records"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'audio_records' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);

CREATE POLICY "Allow authenticated users to view own audio_records"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'audio_records' AND 
  (auth.uid()::text = (storage.foldername(name))[1])
);
