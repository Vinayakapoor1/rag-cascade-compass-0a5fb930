-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('evidence-files', 'evidence-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create policies for evidence file uploads
CREATE POLICY "Authenticated users can upload evidence files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'evidence-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view evidence files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'evidence-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update own evidence files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'evidence-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete own evidence files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'evidence-files' AND auth.uid() IS NOT NULL);