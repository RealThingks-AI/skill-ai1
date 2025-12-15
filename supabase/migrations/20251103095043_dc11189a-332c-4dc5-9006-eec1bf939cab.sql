-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view project team member profiles" ON public.profiles;