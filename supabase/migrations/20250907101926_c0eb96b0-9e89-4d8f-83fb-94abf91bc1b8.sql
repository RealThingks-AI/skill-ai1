-- Fix infinite recursion in skill categories RLS policies by creating security definer function
-- and updating the policies to use it

-- First, drop existing problematic policies
DROP POLICY IF EXISTS "Admins can manage all skill categories" ON public.skill_categories;
DROP POLICY IF EXISTS "Managers can manage skill categories" ON public.skill_categories;

-- Create or replace the security definer function for getting current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Recreate the policies using the security definer function
CREATE POLICY "Admins can manage all skill categories" 
ON public.skill_categories 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can manage skill categories" 
ON public.skill_categories 
FOR ALL 
USING (public.get_current_user_role() = ANY(ARRAY['admin', 'management', 'manager']));

-- Update other tables that might have the same issue
-- Fix skills table policies
DROP POLICY IF EXISTS "Admins can manage all skills" ON public.skills;
DROP POLICY IF EXISTS "Managers can manage skills" ON public.skills;

CREATE POLICY "Admins can manage all skills" 
ON public.skills 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can manage skills" 
ON public.skills 
FOR ALL 
USING (public.get_current_user_role() = ANY(ARRAY['admin', 'management', 'manager']));

-- Fix subskills table policies
DROP POLICY IF EXISTS "Admins can manage all subskills" ON public.subskills;
DROP POLICY IF EXISTS "Managers can manage subskills" ON public.subskills;

CREATE POLICY "Admins can manage all subskills" 
ON public.subskills 
FOR ALL 
USING (public.get_current_user_role() = 'admin');

CREATE POLICY "Managers can manage subskills" 
ON public.subskills 
FOR ALL 
USING (public.get_current_user_role() = ANY(ARRAY['admin', 'management', 'manager']));