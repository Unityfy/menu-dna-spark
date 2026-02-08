
-- Table to track post-action outcomes for approved/ignored recommendations
CREATE TABLE public.recommendation_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('approved', 'ignored')),
  recommendation_type TEXT NOT NULL,

  -- Baseline metrics (captured at time of action)
  baseline_revenue NUMERIC NOT NULL DEFAULT 0,
  baseline_profit NUMERIC NOT NULL DEFAULT 0,
  baseline_stress NUMERIC NOT NULL DEFAULT 0,

  -- Measured metrics (captured after observation window)
  measured_revenue NUMERIC,
  measured_profit NUMERIC,
  measured_stress NUMERIC,

  -- Computed effectiveness
  revenue_delta NUMERIC,
  profit_delta NUMERIC,
  stress_delta NUMERIC,
  effectiveness_score NUMERIC,  -- ratio of actual vs expected impact

  -- Timing
  action_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  measured_at TIMESTAMP WITH TIME ZONE,
  observation_weeks INTEGER NOT NULL DEFAULT 2,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own outcomes"
ON public.recommendation_outcomes
FOR SELECT
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Service can manage outcomes"
ON public.recommendation_outcomes
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Index for lookups
CREATE INDEX idx_outcomes_restaurant ON public.recommendation_outcomes(restaurant_id);
CREATE INDEX idx_outcomes_recommendation ON public.recommendation_outcomes(recommendation_id);
CREATE INDEX idx_outcomes_type_restaurant ON public.recommendation_outcomes(restaurant_id, recommendation_type);
