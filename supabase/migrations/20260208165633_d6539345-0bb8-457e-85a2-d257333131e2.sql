
-- Table for weekly action plan recommendations
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  snapshot_id UUID REFERENCES public.menu_intelligence_snapshots(id),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  dish_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'price',
  title TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  expected_revenue_impact NUMERIC NOT NULL DEFAULT 0,
  expected_profit_impact NUMERIC NOT NULL DEFAULT 0,
  expected_stress_impact NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  week_start DATE NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_recommendations_restaurant_week ON public.recommendations(restaurant_id, week_start DESC);
CREATE INDEX idx_recommendations_status ON public.recommendations(restaurant_id, status);

-- Enable RLS
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

-- Users can view their own recommendations
CREATE POLICY "Users can view own recommendations"
  ON public.recommendations FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Users can update status of their own recommendations
CREATE POLICY "Users can update own recommendations"
  ON public.recommendations FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Service can manage recommendations (for edge function with service role key)
CREATE POLICY "Service can manage recommendations"
  ON public.recommendations FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));
