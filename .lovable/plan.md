

# Email Authentication with User Profiles

## Overview
Implement email/password authentication using Supabase Auth with a profiles table, protected routes, and automatic redirects.

## What You Will Get
- A login page and a signup page styled to match Menu DNA's aesthetic
- A placeholder dashboard page that only logged-in users can access
- Automatic redirect to login when not authenticated
- Automatic redirect to dashboard after successful login
- A profiles table that stores each user's display name and restaurant name
- Session persistence across page refreshes

## How It Works

1. **New users** visit the signup page, enter their email, password, and restaurant name. After signing up, they are redirected to the dashboard.
2. **Returning users** visit the login page, enter credentials, and are redirected to the dashboard.
3. **Unauthenticated visitors** trying to access the dashboard (or any protected page) are automatically sent to the login page.
4. **Logged-in users** visiting the login page are automatically sent to the dashboard.

---

## Technical Details

### Step 1 -- Database Migration

Create a `profiles` table and a trigger to auto-create a profile row on signup:

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  restaurant_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Step 2 -- Auth Context Provider

Create `src/contexts/AuthContext.tsx`:
- Uses `supabase.auth.onAuthStateChange` listener (set up before `getSession`)
- Provides `session`, `user`, `loading`, `signIn`, `signUp`, `signOut` to the app
- Wraps the entire app in `App.tsx`

### Step 3 -- Protected Route Component

Create `src/components/ProtectedRoute.tsx`:
- Checks auth loading state (shows spinner)
- Redirects to `/auth` if no session
- Renders children if authenticated

### Step 4 -- Auth Page

Create `src/pages/Auth.tsx`:
- Toggle between Login and Sign Up forms
- Fields: email, password (and display_name + restaurant_name for signup)
- On success, redirect to `/dashboard`
- If already authenticated, redirect to `/dashboard`
- Styled with the monochrome dark-mode aesthetic and Menu DNA branding

### Step 5 -- Dashboard Page (placeholder)

Create `src/pages/Dashboard.tsx`:
- Simple placeholder showing "Welcome to Menu DNA" with user info
- Sign out button
- Wrapped in ProtectedRoute

### Step 6 -- Update Routing

Update `src/App.tsx`:
- Wrap routes with `AuthProvider`
- Add `/auth` route pointing to Auth page
- Add `/dashboard` route wrapped in `ProtectedRoute`
- Change `/` to redirect to `/dashboard` (which will redirect to `/auth` if not logged in)

### Files to Create
- `src/contexts/AuthContext.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/pages/Auth.tsx`
- `src/pages/Dashboard.tsx`

### Files to Modify
- `src/App.tsx` (add routes and AuthProvider)
- `src/pages/Index.tsx` (redirect to dashboard)

