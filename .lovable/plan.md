

# Role-Based Access Control (RBAC) for Menu DNA

## Overview
Add an owner/manager role system so restaurant owners can control who has access to billing, settings, and user management, while managers get read-only access to insights and recommendations.

## What You Will Get
- Two roles: **owner** (full control) and **manager** (limited access)
- A `restaurants` table to represent each restaurant entity
- A `user_roles` table linking users to roles and restaurants (separate from profiles, per security best practices)
- A server-side `has_role()` helper function for secure role checks in RLS policies
- A React hook (`useUserRole`) for client-side role awareness
- A `RoleProtectedRoute` component to gate UI sections by role

## How It Works

1. Each user is associated with a restaurant and assigned a role (owner or manager) in a dedicated `user_roles` table.
2. The first user who signs up creates a restaurant and is automatically assigned the **owner** role.
3. Owners can later invite managers (future feature -- the schema supports it now).
4. RLS policies on all tables use a `has_role()` security-definer function to check permissions without recursion.
5. Client-side, a `useUserRole` hook fetches the current user's role and restaurant, enabling conditional UI rendering.

## Important Security Note
Per Supabase security best practices, roles are stored in a **separate `user_roles` table** -- never on the profiles table. The schema you proposed with `role` on a users table would create privilege escalation risks. This plan follows the secure pattern instead.

---

## Technical Details

### Step 1 -- Database Migration

Create the `restaurants` table, `app_role` enum, `user_roles` table, and `has_role()` function:

```sql
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

-- User roles table (links users to restaurants with a role)
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

-- Security definer function for role checks (avoids RLS recursion)
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
```

### Step 2 -- Update Signup Trigger

Modify `handle_new_user()` to auto-create a restaurant and assign the owner role on signup:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_restaurant_id UUID;
BEGIN
  -- Create restaurant from metadata
  INSERT INTO public.restaurants (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'restaurant_name', 'My Restaurant'))
  RETURNING id INTO new_restaurant_id;

  -- Create profile linked to restaurant
  INSERT INTO public.profiles (id, display_name, restaurant_id)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name', new_restaurant_id);

  -- Assign owner role
  INSERT INTO public.user_roles (user_id, restaurant_id, role)
  VALUES (NEW.id, new_restaurant_id, 'owner');

  RETURN NEW;
END;
$$;
```

### Step 3 -- React Hook: `useUserRole`

Create `src/hooks/useUserRole.ts`:
- Queries `user_roles` table for the current user
- Returns `{ role, restaurantId, isOwner, isManager, loading }`
- Uses TanStack Query for caching

### Step 4 -- Role-Protected Route Component

Create `src/components/RoleProtectedRoute.tsx`:
- Accepts `allowedRoles` prop (e.g., `['owner']`)
- Uses `useUserRole` to check access
- Shows "Access Denied" or redirects if role is insufficient

### Step 5 -- Update App Routing

Prepare route structure for role-gated pages (no new pages yet, but the infrastructure is ready):

```
/dashboard          -- both roles
/settings           -- owner only (future)
/billing            -- owner only (future)
/team               -- owner only (future)
```

### Step 6 -- Update Auth Context

Remove `restaurant_name` update from `signUp` in AuthContext since the trigger now handles restaurant creation automatically.

### Files to Create
- `src/hooks/useUserRole.ts`
- `src/components/RoleProtectedRoute.tsx`

### Files to Modify
- `src/contexts/AuthContext.tsx` (remove manual profile update in signUp)
- `src/App.tsx` (no immediate route changes, but prepared for role-gated routes)

### Database Changes
- New enum: `app_role`
- New table: `restaurants`
- New table: `user_roles`
- New column: `profiles.restaurant_id`
- New functions: `has_role()`, `get_user_restaurant_id()`
- Updated function: `handle_new_user()`
- RLS policies on `restaurants` and `user_roles`

