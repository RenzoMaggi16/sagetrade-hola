-- Add entry_types column to trades table
ALTER TABLE trades
ADD COLUMN IF NOT EXISTS entry_types text[] DEFAULT NULL;
