-- Create entry_types table for dynamic, user-managed entry type tags
CREATE TABLE public.entry_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#06b6d4',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique name per user (case-insensitive)
CREATE UNIQUE INDEX entry_types_user_name_unique
  ON public.entry_types (user_id, LOWER(name));

-- RLS
ALTER TABLE public.entry_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own entry types"
  ON public.entry_types FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own entry types"
  ON public.entry_types FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own entry types"
  ON public.entry_types FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own entry types"
  ON public.entry_types FOR DELETE USING (auth.uid() = user_id);
