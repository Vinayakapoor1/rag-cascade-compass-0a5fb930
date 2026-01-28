-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidence', 'evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for evidence bucket
-- Users can upload evidence for their department's indicators
CREATE POLICY "Users can upload evidence for their departments"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'evidence'
        AND auth.role() = 'authenticated'
    );

-- Users can view evidence for their department's indicators
CREATE POLICY "Users can view evidence for their departments"
    ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'evidence'
        AND auth.role() = 'authenticated'
    );

-- Users can delete their own uploaded evidence
CREATE POLICY "Users can delete their own evidence"
    ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'evidence'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );
