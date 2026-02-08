
-- Sales transactions table for normalized POS/CSV data
CREATE TABLE public.sales_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  dish_name TEXT NOT NULL,
  dish_id TEXT, -- external POS dish ID, nullable for CSV imports
  quantity_sold INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC(10,2) NOT NULL,
  order_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  order_type TEXT NOT NULL DEFAULT 'dine-in' CHECK (order_type IN ('dine-in', 'takeaway', 'delivery')),
  source TEXT NOT NULL DEFAULT 'csv' CHECK (source IN ('pos', 'csv')),
  raw_payload JSONB, -- original unprocessed record for audit
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_sales_restaurant ON public.sales_transactions(restaurant_id);
CREATE INDEX idx_sales_timestamp ON public.sales_transactions(order_timestamp);
CREATE INDEX idx_sales_dish ON public.sales_transactions(restaurant_id, dish_name);

-- Enable RLS
ALTER TABLE public.sales_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view sales for their own restaurant
CREATE POLICY "Users can view own restaurant sales"
  ON public.sales_transactions FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Users can insert sales for their own restaurant
CREATE POLICY "Users can insert own restaurant sales"
  ON public.sales_transactions FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

-- Owners can delete sales for their own restaurant
CREATE POLICY "Owners can delete own restaurant sales"
  ON public.sales_transactions FOR DELETE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()) AND has_role(auth.uid(), 'owner'::app_role));

-- Ingestion log to track imports
CREATE TABLE public.ingestion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  source TEXT NOT NULL CHECK (source IN ('pos', 'csv')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  records_total INTEGER DEFAULT 0,
  records_imported INTEGER DEFAULT 0,
  records_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.ingestion_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ingestion logs"
  ON public.ingestion_logs FOR SELECT
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert own ingestion logs"
  ON public.ingestion_logs FOR INSERT
  WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can update own ingestion logs"
  ON public.ingestion_logs FOR UPDATE
  USING (restaurant_id = get_user_restaurant_id(auth.uid()));
