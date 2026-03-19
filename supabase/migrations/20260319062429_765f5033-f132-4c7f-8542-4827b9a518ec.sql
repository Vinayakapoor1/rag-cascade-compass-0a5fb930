
-- Add screenshot_path column to feedbacks
ALTER TABLE public.feedbacks ADD COLUMN screenshot_path text;

-- Create storage bucket for feedback screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own screenshots
CREATE POLICY "Users can upload feedback screenshots"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow admins to read feedback screenshots
CREATE POLICY "Admins can read feedback screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'feedback-screenshots' AND public.is_admin(auth.uid()));

-- Allow users to read their own screenshots
CREATE POLICY "Users can read own feedback screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'feedback-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);
