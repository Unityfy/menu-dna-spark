-- Aggregation tables for normalized sales rollups
CREATE TABLE IF NOT EXISTS public.sales_aggregates_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  dish_name_normalized TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  bucket_date DATE NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  dine_in_qty INTEGER NOT NULL DEFAULT 0,
  takeaway_qty INTEGER NOT NULL DEFAULT 0,
  delivery_qty INTEGER NOT NULL DEFAULT 0,
  running_total_quantity INTEGER NOT NULL DEFAULT 0,
  running_total_revenue NUMERIC NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, dish_name_normalized, bucket_date)
);

CREATE TABLE IF NOT EXISTS public.sales_aggregates_weekly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  dish_name_normalized TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  dine_in_qty INTEGER NOT NULL DEFAULT 0,
  takeaway_qty INTEGER NOT NULL DEFAULT 0,
  delivery_qty INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, dish_name_normalized, week_start)
);

CREATE TABLE IF NOT EXISTS public.sales_aggregates_monthly (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  dish_name_normalized TEXT NOT NULL,
  dish_name TEXT NOT NULL,
  month_start DATE NOT NULL,
  total_quantity INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  avg_price NUMERIC NOT NULL DEFAULT 0,
  order_count INTEGER NOT NULL DEFAULT 0,
  dine_in_qty INTEGER NOT NULL DEFAULT 0,
  takeaway_qty INTEGER NOT NULL DEFAULT 0,
  delivery_qty INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, dish_name_normalized, month_start)
);

CREATE INDEX IF NOT EXISTS idx_agg_daily_rest_date ON public.sales_aggregates_daily(restaurant_id, bucket_date DESC);
CREATE INDEX IF NOT EXISTS idx_agg_weekly_rest_week ON public.sales_aggregates_weekly(restaurant_id, week_start DESC);
CREATE INDEX IF NOT EXISTS idx_agg_monthly_rest_month ON public.sales_aggregates_monthly(restaurant_id, month_start DESC);

ALTER TABLE public.sales_aggregates_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_aggregates_weekly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_aggregates_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own daily aggregates" ON public.sales_aggregates_daily
  FOR SELECT USING (restaurant_id = get_user_restaurant_id(auth.uid()));
CREATE POLICY "Service manages daily aggregates" ON public.sales_aggregates_daily
  FOR ALL USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users view own weekly aggregates" ON public.sales_aggregates_weekly
  FOR SELECT USING (restaurant_id = get_user_restaurant_id(auth.uid()));
CREATE POLICY "Service manages weekly aggregates" ON public.sales_aggregates_weekly
  FOR ALL USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users view own monthly aggregates" ON public.sales_aggregates_monthly
  FOR SELECT USING (restaurant_id = get_user_restaurant_id(auth.uid()));
CREATE POLICY "Service manages monthly aggregates" ON public.sales_aggregates_monthly
  FOR ALL USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Enable extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;