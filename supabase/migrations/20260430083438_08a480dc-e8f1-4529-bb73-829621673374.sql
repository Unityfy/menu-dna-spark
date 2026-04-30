-- Restrict INSERT: only the authenticated user can create their own row
CREATE POLICY "Users can insert own user row"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Explicitly deny DELETE for all authenticated users (service role bypasses RLS)
CREATE POLICY "Deny delete on users"
ON public.users
FOR DELETE
TO authenticated
USING (false);