
-- Create storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

-- Allow authenticated users to update their files
CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents');

-- Allow admins to delete files
CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
