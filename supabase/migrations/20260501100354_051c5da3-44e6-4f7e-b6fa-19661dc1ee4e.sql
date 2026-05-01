-- Add restaurant-scoped has_role overload
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND restaurant_id = _restaurant_id
  )
$$;

-- menu_items: owners can delete only within the same restaurant
DROP POLICY IF EXISTS "Owners can delete own menu items" ON public.menu_items;
CREATE POLICY "Owners can delete own menu items"
ON public.menu_items
FOR DELETE
TO authenticated
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role, restaurant_id)
);

-- sales_transactions: owners can delete only within the same restaurant
DROP POLICY IF EXISTS "Owners can delete own restaurant sales" ON public.sales_transactions;
CREATE POLICY "Owners can delete own restaurant sales"
ON public.sales_transactions
FOR DELETE
TO authenticated
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role, restaurant_id)
);

-- restaurants: owners can update only the restaurant they own
DROP POLICY IF EXISTS "Owners can update own restaurant" ON public.restaurants;
CREATE POLICY "Owners can update own restaurant"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (
  id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role, id)
);

-- user_roles: owners can manage roles only within the same restaurant
DROP POLICY IF EXISTS "Owners can manage roles" ON public.user_roles;
CREATE POLICY "Owners can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role, restaurant_id)
)
WITH CHECK (
  restaurant_id = get_user_restaurant_id(auth.uid())
  AND has_role(auth.uid(), 'owner'::app_role, restaurant_id)
);