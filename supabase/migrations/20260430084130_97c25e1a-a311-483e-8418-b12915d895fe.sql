-- learning_parameters
DROP POLICY IF EXISTS "Service can manage learning parameters" ON public.learning_parameters;
CREATE POLICY "Users can manage own learning parameters"
ON public.learning_parameters FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own learning parameters" ON public.learning_parameters;
CREATE POLICY "Users can view own learning parameters"
ON public.learning_parameters FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- dish_profiles
DROP POLICY IF EXISTS "Service can manage dish profiles" ON public.dish_profiles;
CREATE POLICY "Users can manage own dish profiles"
ON public.dish_profiles FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own dish profiles" ON public.dish_profiles;
CREATE POLICY "Users can view own dish profiles"
ON public.dish_profiles FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- menu_intelligence_snapshots
DROP POLICY IF EXISTS "Service can manage snapshots" ON public.menu_intelligence_snapshots;
CREATE POLICY "Users can manage own snapshots"
ON public.menu_intelligence_snapshots FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own snapshots" ON public.menu_intelligence_snapshots;
CREATE POLICY "Users can view own snapshots"
ON public.menu_intelligence_snapshots FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- recommendations
DROP POLICY IF EXISTS "Service can manage recommendations" ON public.recommendations;
CREATE POLICY "Users can manage own recommendations"
ON public.recommendations FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update own recommendations" ON public.recommendations;
CREATE POLICY "Users can update own recommendations"
ON public.recommendations FOR UPDATE TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own recommendations" ON public.recommendations;
CREATE POLICY "Users can view own recommendations"
ON public.recommendations FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- recommendation_outcomes
DROP POLICY IF EXISTS "Service can manage outcomes" ON public.recommendation_outcomes;
CREATE POLICY "Users can manage own outcomes"
ON public.recommendation_outcomes FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own outcomes" ON public.recommendation_outcomes;
CREATE POLICY "Users can view own outcomes"
ON public.recommendation_outcomes FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- sales_aggregates_daily
DROP POLICY IF EXISTS "Service manages daily aggregates" ON public.sales_aggregates_daily;
CREATE POLICY "Users manage own daily aggregates"
ON public.sales_aggregates_daily FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users view own daily aggregates" ON public.sales_aggregates_daily;
CREATE POLICY "Users view own daily aggregates"
ON public.sales_aggregates_daily FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- sales_aggregates_weekly
DROP POLICY IF EXISTS "Service manages weekly aggregates" ON public.sales_aggregates_weekly;
CREATE POLICY "Users manage own weekly aggregates"
ON public.sales_aggregates_weekly FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users view own weekly aggregates" ON public.sales_aggregates_weekly;
CREATE POLICY "Users view own weekly aggregates"
ON public.sales_aggregates_weekly FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- sales_aggregates_monthly
DROP POLICY IF EXISTS "Service manages monthly aggregates" ON public.sales_aggregates_monthly;
CREATE POLICY "Users manage own monthly aggregates"
ON public.sales_aggregates_monthly FOR ALL TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users view own monthly aggregates" ON public.sales_aggregates_monthly;
CREATE POLICY "Users view own monthly aggregates"
ON public.sales_aggregates_monthly FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- sales_transactions
DROP POLICY IF EXISTS "Owners can delete own restaurant sales" ON public.sales_transactions;
CREATE POLICY "Owners can delete own restaurant sales"
ON public.sales_transactions FOR DELETE TO authenticated
USING ((restaurant_id = get_user_restaurant_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can insert own restaurant sales" ON public.sales_transactions;
CREATE POLICY "Users can insert own restaurant sales"
ON public.sales_transactions FOR INSERT TO authenticated
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own restaurant sales" ON public.sales_transactions;
CREATE POLICY "Users can view own restaurant sales"
ON public.sales_transactions FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- menu_items
DROP POLICY IF EXISTS "Owners can delete own menu items" ON public.menu_items;
CREATE POLICY "Owners can delete own menu items"
ON public.menu_items FOR DELETE TO authenticated
USING ((restaurant_id = get_user_restaurant_id(auth.uid())) AND has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Users can insert own menu items" ON public.menu_items;
CREATE POLICY "Users can insert own menu items"
ON public.menu_items FOR INSERT TO authenticated
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update own menu items" ON public.menu_items;
CREATE POLICY "Users can update own menu items"
ON public.menu_items FOR UPDATE TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own menu items" ON public.menu_items;
CREATE POLICY "Users can view own menu items"
ON public.menu_items FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));

-- ingestion_logs
DROP POLICY IF EXISTS "Users can insert own ingestion logs" ON public.ingestion_logs;
CREATE POLICY "Users can insert own ingestion logs"
ON public.ingestion_logs FOR INSERT TO authenticated
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can update own ingestion logs" ON public.ingestion_logs;
CREATE POLICY "Users can update own ingestion logs"
ON public.ingestion_logs FOR UPDATE TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (restaurant_id = get_user_restaurant_id(auth.uid()));

DROP POLICY IF EXISTS "Users can view own ingestion logs" ON public.ingestion_logs;
CREATE POLICY "Users can view own ingestion logs"
ON public.ingestion_logs FOR SELECT TO authenticated
USING (restaurant_id = get_user_restaurant_id(auth.uid()));