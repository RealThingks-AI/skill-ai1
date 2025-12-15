-- Create a SECURITY DEFINER helper to avoid recursion in RLS
CREATE OR REPLACE FUNCTION public.is_project_teammate(_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_assignments pa1
    JOIN public.project_assignments pa2 ON pa1.project_id = pa2.project_id
    WHERE pa1.user_id = auth.uid()
      AND pa2.user_id = _target_user_id
  );
$$;

-- Policy to let authenticated users view profiles of teammates in the same projects
CREATE POLICY "Users can view teammate profiles (via function)"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_project_teammate(profiles.user_id)
);