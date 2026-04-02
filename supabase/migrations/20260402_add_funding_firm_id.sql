-- Add funding_firm_id to accounts for dynamic consistency rule thresholds
ALTER TABLE accounts
ADD COLUMN IF NOT EXISTS funding_firm_id text DEFAULT NULL;

-- Optional: add a comment for documentation
COMMENT ON COLUMN accounts.funding_firm_id IS 'Identifies the funding firm for dynamic profit thresholds. Values: topstep, apex, alpha_futures, or NULL for personal/other.';
