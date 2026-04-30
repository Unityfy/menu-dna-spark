CREATE TABLE public.learning_parameters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL,
  approval_rate NUMERIC NOT NULL DEFAULT 0,
  avg_prediction_error_revenue NUMERIC,
  avg_prediction_error_profit NUMERIC,
  avg_prediction_error_stress NUMERIC,
  generation_threshold_multiplier NUMERIC NOT NULL DEFAULT 1.0,
  impact_adjustment_revenue NUMERIC NOT NULL DEFAULT 1.0,
  impact_adjustment_profit NUMERIC NOT NULL DEFAULT 1.0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  weeks_analyzed INTEGER NOT NULL DEFAULT 0,
  suppressed BOOLEAN NOT NULL DEFAULT false,
  restaurant_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, recommendation_type)
);

CREATE INDEX idx_learning_parameters_restaurant ON public.learning_parameters(restaurant_id);

ALTER TABLE public.learning_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning parameters"
ON public.learning_parameters
FOR SELECT
TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Service can manage learning parameters"
ON public.learning_parameters
FOR ALL
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE TRIGGER update_learning_parameters_updated_at
BEFORE UPDATE ON public.learning_parameters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();