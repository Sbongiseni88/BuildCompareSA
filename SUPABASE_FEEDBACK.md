-- FEEDBACK TABLE
-- Run this in your Supabase SQL Editor to enable the new feedback system.

CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    rating INTEGER CHECK (rating >= 0 AND rating <= 5),
    type TEXT CHECK (type IN ('bug', 'suggestion', 'praise', 'other')) DEFAULT 'suggestion',
    message TEXT NOT NULL,
    metadata JSONB, -- Stores screen size, browser info, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ALLOW ANY LOGGED IN USER (OR ANONYMOUS) TO INSERT FEEDBACK
CREATE POLICY "Enable insert for all users" ON public.feedback
    FOR INSERT WITH CHECK (true);

-- ONLY ADMINS (OR YOU) SHOULD VIEW FEEDBACK (Optional: restrict to your UID)
-- For now, let's keep it restricted so users can't see each other's feedback.
CREATE POLICY "Only authorized users can view feedback" ON public.feedback
    FOR SELECT USING (auth.role() = 'service_role');
