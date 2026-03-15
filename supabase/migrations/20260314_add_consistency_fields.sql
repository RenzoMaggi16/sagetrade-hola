-- Add consistency rule fields and evaluation_passed flag to accounts
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS consistency_min_profit_days integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS consistency_withdrawal_pct numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS evaluation_passed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS evaluation_passed_at timestamptz DEFAULT NULL;
