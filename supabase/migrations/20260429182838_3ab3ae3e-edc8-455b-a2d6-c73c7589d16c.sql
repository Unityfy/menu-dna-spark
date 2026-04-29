ALTER TABLE public.recommendation_outcomes
  ADD COLUMN IF NOT EXISTS actual_revenue_impact NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_profit_impact NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_stress_impact INTEGER,
  ADD COLUMN IF NOT EXISTS prediction_accuracy_revenue NUMERIC,
  ADD COLUMN IF NOT EXISTS prediction_accuracy_profit NUMERIC,
  ADD COLUMN IF NOT EXISTS prediction_accuracy_stress NUMERIC;