
-- Menu items: base dish data entered during onboarding or POS sync
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Uncategorized',
  selling_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  food_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  prep_time_minutes INTEGER NOT NULL DEFAULT 10,
  station TEXT NOT NULL DEFAULT 'Stovetop',
  complexity TEXT NOT NULL DEFAULT 'medium' CHECK (complexity IN ('low', 'medium', 'high')),
  is_combo BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  external_pos_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_menu_items_restaurant ON public.menu_items(restaurant_id);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own menu items"
  ON public.menu_items FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert own menu items"
  ON public.menu_items FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update own menu items"
  ON public.menu_items FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can delete own menu items"
  ON public.menu_items FOR DELETE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Dish profiles: computed analytics from the Dish DNA Engine
CREATE TABLE public.dish_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE UNIQUE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),

  -- Profit DNA
  true_margin NUMERIC(5,2) DEFAULT 0,            -- percentage
  profit_contribution NUMERIC(10,2) DEFAULT 0,    -- weekly absolute
  weekly_revenue NUMERIC(10,2) DEFAULT 0,
  weekly_profit NUMERIC(10,2) DEFAULT 0,
  weekly_orders INTEGER DEFAULT 0,

  -- Kitchen Stress
  stress_score NUMERIC(5,2) DEFAULT 0,            -- 0-100
  peak_hour_concentration NUMERIC(5,2) DEFAULT 0, -- % of orders in peak hours
  volume_pressure NUMERIC(5,2) DEFAULT 0,         -- normalized

  -- Prep Time Volatility
  prep_time_volatility NUMERIC(5,2) DEFAULT 0,    -- coefficient of variation
  demand_spike_frequency INTEGER DEFAULT 0,       -- spikes per analysis window

  -- Demand Patterns
  demand_pattern JSONB DEFAULT '{}',              -- {byHour, byDay, bySeason, byOrderType}
  demand_trend TEXT DEFAULT 'stable' CHECK (demand_trend IN ('rising', 'stable', 'declining')),

  -- Cannibalization
  cannibalization_score NUMERIC(5,2) DEFAULT 0,   -- 0-100
  competing_dishes JSONB DEFAULT '[]',            -- [{dishId, dishName, overlapScore}]

  -- Classification
  classification TEXT NOT NULL DEFAULT 'filler' 
    CHECK (classification IN ('high-profit', 'hidden-loss', 'kitchen-disruptor', 'low-impact-filler')),

  -- Risk Flags
  risk_flags JSONB DEFAULT '[]',                  -- ["profit_risk", "stress_risk", "demand_risk", "cannibalization_risk"]

  -- Meta
  analysis_period_start TIMESTAMP WITH TIME ZONE,
  analysis_period_end TIMESTAMP WITH TIME ZONE,
  computed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_dish_profiles_restaurant ON public.dish_profiles(restaurant_id);
CREATE INDEX idx_dish_profiles_classification ON public.dish_profiles(classification);

ALTER TABLE public.dish_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dish profiles"
  ON public.dish_profiles FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Service can manage dish profiles"
  ON public.dish_profiles FOR ALL
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));
