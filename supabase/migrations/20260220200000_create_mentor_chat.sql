-- Create mentor_chat_messages table for Mentor IA chat history
CREATE TABLE IF NOT EXISTS public.mentor_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view own mentor messages"
    ON public.mentor_chat_messages
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own mentor messages"
    ON public.mentor_chat_messages
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own mentor messages"
    ON public.mentor_chat_messages
    FOR DELETE
    USING (auth.uid() = user_id);
