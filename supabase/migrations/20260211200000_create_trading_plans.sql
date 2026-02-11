-- Create trading_plans table
CREATE TABLE IF NOT EXISTS public.trading_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  market text,
  instrument text,
  trading_type text,
  session text,
  allowed_hours_start time,
  allowed_hours_end time,
  risk_per_trade numeric,
  max_daily_risk numeric,
  max_trades_per_day integer,
  min_rr numeric,
  stop_after_consecutive_losses integer,
  psychological_rules jsonb DEFAULT '[]'::jsonb,
  setup_rules jsonb DEFAULT '[]'::jsonb,
  monthly_goals jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.trading_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan"
  ON public.trading_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plan"
  ON public.trading_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plan"
  ON public.trading_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Add is_outside_plan and setup_compliance to trades
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS is_outside_plan boolean DEFAULT false;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS setup_compliance text;
