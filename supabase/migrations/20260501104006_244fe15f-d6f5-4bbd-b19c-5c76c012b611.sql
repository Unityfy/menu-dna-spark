
-- 1. Restrict UPDATE on users table to non-privileged fields only.
-- Drop existing broad UPDATE policy and replace with one that prevents
-- self-modification of plan / billing fields.
DROP POLICY IF EXISTS "Users can update own user row" ON public.users;

CREATE POLICY "Users can update own non-billing fields"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Prevent escalation: these fields must remain unchanged via direct update.
  AND plan IS NOT DISTINCT FROM (SELECT plan FROM public.users WHERE id = auth.uid())
  AND plan_status IS NOT DISTINCT FROM (SELECT plan_status FROM public.users WHERE id = auth.uid())
  AND plan_activated_at IS NOT DISTINCT FROM (SELECT plan_activated_at FROM public.users WHERE id = auth.uid())
  AND razorpay_subscription_id IS NOT DISTINCT FROM (SELECT razorpay_subscription_id FROM public.users WHERE id = auth.uid())
  AND role IS NOT DISTINCT FROM (SELECT role FROM public.users WHERE id = auth.uid())
  AND email IS NOT DISTINCT FROM (SELECT email FROM public.users WHERE id = auth.uid())
);

-- 2. Drop legacy unused tables that lacked RLS / restaurant scoping.
DROP TABLE IF EXISTS public.menu_data;
DROP TABLE IF EXISTS public.uploads;
