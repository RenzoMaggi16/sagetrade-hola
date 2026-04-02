-- Create tradovate_connections table for storing per-user Tradovate API state
CREATE TABLE public.tradovate_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  access_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  tradovate_user_id INTEGER,
  tradovate_environment TEXT DEFAULT 'demo' CHECK (tradovate_environment IN ('demo', 'live')),
  accounts_cache JSONB DEFAULT '[]'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_fill_id INTEGER DEFAULT 0,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tradovate_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own tradovate connection"
  ON public.tradovate_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tradovate connection"
  ON public.tradovate_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tradovate connection"
  ON public.tradovate_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tradovate connection"
  ON public.tradovate_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_tradovate_connections_user_id ON public.tradovate_connections(user_id);

-- Add tradovate_fill_id column to trades table for deduplication
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS tradovate_fill_id TEXT;
CREATE INDEX IF NOT EXISTS idx_trades_tradovate_fill_id ON public.trades(tradovate_fill_id);
