
-- Weekly menu intelligence snapshots
CREATE TABLE public.menu_intelligence_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  health_score NUMERIC NOT NULL DEFAULT 0,
  health_delta NUMERIC NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  total_profit NUMERIC NOT NULL DEFAULT 0,
  avg_margin NUMERIC NOT NULL DEFAULT 0,
  avg_stress NUMERIC NOT NULL DEFAULT 0,
  total_dishes INTEGER NOT NULL DEFAULT 0,
  top_profit_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  hidden_loss_makers JSONB NOT NULL DEFAULT '[]'::jsonb,
  highest_stress_contributors JSONB NOT NULL DEFAULT '[]'::jsonb,
  low_impact_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  classification_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, week_start)
);

ALTER TABLE public.menu_intelligence_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots"
  ON public.menu_intelligence_snapshots FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Service can manage snapshots"
  ON public.menu_intelligence_snapshots FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE INDEX idx_snapshots_restaurant_week
  ON public.menu_intelligence_snapshots(restaurant_id, week_start DESC);
