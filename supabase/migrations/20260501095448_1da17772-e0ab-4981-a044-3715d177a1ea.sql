CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT restaurant_id FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY created_at ASC, id ASC
  LIMIT 1
$function$;