-- Drop the existing role constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that includes admin role
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employee', 'tech_lead', 'management', 'admin'));

-- Update the user with email admin@realthingks.com to have admin role
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'admin@realthingks.com';

-- Create RLS policies for admin users (they should have full access)
-- Admin can manage all skill categories
CREATE POLICY "Admins can manage all skill categories" 
ON public.skill_categories 
FOR ALL 
TO authenticated 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Admin can manage all skills  
CREATE POLICY "Admins can manage all skills" 
ON public.skills 
FOR ALL 
TO authenticated 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  Where profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Admin can manage all projects
CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
TO authenticated 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Admin can manage all project assignments
CREATE POLICY "Admins can manage all project assignments" 
ON public.project_assignments 
FOR ALL 
TO authenticated 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Admin can view and approve all user skills
CREATE POLICY "Admins can manage all user skills" 
ON public.user_skills 
FOR ALL 
TO authenticated 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));