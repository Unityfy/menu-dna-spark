ALTER TABLE public.menu_intelligence_snapshots
  ADD COLUMN IF NOT EXISTS category_performance JSONB NOT NULL DEFAULT '[]'::jsonb;