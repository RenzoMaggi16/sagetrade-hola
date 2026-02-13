-- Add setup_compliance column to trades table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'setup_compliance') THEN
        ALTER TABLE public.trades ADD COLUMN setup_compliance text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trades' AND column_name = 'is_outside_plan') THEN
        ALTER TABLE public.trades ADD COLUMN is_outside_plan boolean DEFAULT false;
    END IF;
END $$;
