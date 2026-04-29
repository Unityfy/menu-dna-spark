CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.recommendation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID NOT NULL REFERENCES public.recommendations(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'ignored')),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  implemented_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendation_feedback_rec_id ON public.recommendation_feedback(recommendation_id);
CREATE INDEX idx_recommendation_feedback_restaurant ON public.recommendation_feedback(restaurant_id);
CREATE INDEX idx_recommendation_feedback_user ON public.recommendation_feedback(user_id);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view feedback in own restaurant"
  ON public.recommendation_feedback
  FOR SELECT
  TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Users can insert own feedback"
  ON public.recommendation_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND restaurant_id = public.get_user_restaurant_id(auth.uid())
  );

CREATE POLICY "Users can update own feedback implementation"
  ON public.recommendation_feedback
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND restaurant_id = public.get_user_restaurant_id(auth.uid())
  );

CREATE TRIGGER update_recommendation_feedback_updated_at
  BEFORE UPDATE ON public.recommendation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();