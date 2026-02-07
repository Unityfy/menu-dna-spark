
-- Role enum
CREATE TYPE public.app_role AS ENUM ('owner', 'manager');

-- Restaurants table
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'manager',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add restaurant_id to profiles
ALTER TABLE public.profiles
  ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user's restaurant_id
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS: restaurants
CREATE POLICY "Users can view own restaurant"
  ON public.restaurants FOR SELECT TO authenticated
  USING (id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can update own restaurant"
  ON public.restaurants FOR UPDATE TO authenticated
  USING (id = public.get_user_restaurant_id(auth.uid())
    AND public.has_role(auth.uid(), 'owner'));

-- RLS: user_roles
CREATE POLICY "Users can view roles in own restaurant"
  ON public.user_roles FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "Owners can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid())
    AND public.has_role(auth.uid(), 'owner'));

-- Update handle_new_user to create restaurant and assign owner role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_restaurant_id UUID;
BEGIN
  INSERT INTO public.restaurants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My Restaurant'))
  RETURNING id INTO new_restaurant_id;

  INSERT INTO public.profiles (id, display_name, restaurant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', new_restaurant_id);

  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (NEW.id, new_restaurant_id, 'owner');

  RETURN NEW;
END;
$$;
