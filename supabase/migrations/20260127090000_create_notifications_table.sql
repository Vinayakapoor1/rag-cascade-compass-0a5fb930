-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Admins or system can insert notifications (for now, allow all authenticated users to insert to simulate system actions from client)
-- In a real prod env, this should be restricted to service_role or admin users only.
CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');
