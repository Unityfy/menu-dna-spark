-- Drop old check constraint blocking new order_type values
ALTER TABLE public.sales_transactions DROP CONSTRAINT IF EXISTS sales_transactions_order_type_check;

-- Add dedup + sync tracking columns
ALTER TABLE public.sales_transactions
  ADD COLUMN IF NOT EXISTS external_order_id text,
  ADD COLUMN IF NOT EXISTS synced_at timestamp with time zone DEFAULT now();

-- Normalize existing values
UPDATE public.sales_transactions SET order_type = 'dine_in' WHERE order_type IN ('dine-in', 'dinein', 'dine in');
UPDATE public.sales_transactions SET order_type = 'takeaway' WHERE order_type IN ('take-away', 'take_away', 'pickup');
UPDATE public.sales_transactions SET order_type = 'delivery' WHERE order_type = 'deliver';
UPDATE public.sales_transactions SET order_type = 'dine_in' WHERE order_type NOT IN ('dine_in', 'takeaway', 'delivery');

ALTER TABLE public.sales_transactions ALTER COLUMN order_type SET DEFAULT 'dine_in';

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_sales_order_type()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_type NOT IN ('dine_in', 'takeaway', 'delivery') THEN
    RAISE EXCEPTION 'Invalid order_type: %. Must be dine_in, takeaway, or delivery.', NEW.order_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_transactions_validate_order_type ON public.sales_transactions;
CREATE TRIGGER sales_transactions_validate_order_type
  BEFORE INSERT OR UPDATE ON public.sales_transactions
  FOR EACH ROW EXECUTE FUNCTION public.validate_sales_order_type();

-- Dedup index
CREATE UNIQUE INDEX IF NOT EXISTS sales_transactions_dedup_idx
  ON public.sales_transactions (restaurant_id, external_order_id, dish_name)
  WHERE external_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS sales_transactions_synced_at_idx
  ON public.sales_transactions (restaurant_id, synced_at DESC);

-- Restaurant sync tracking
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS pos_provider text,
  ADD COLUMN IF NOT EXISTS last_sync_status text,
  ADD COLUMN IF NOT EXISTS last_sync_error text;
