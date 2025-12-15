-- Add policy to allow tech leads and above to view all approved ratings
-- This is needed for the Skill Explorer feature to show all approved skills

CREATE POLICY "Tech leads can view all approved ratings" 
ON public.employee_ratings 
FOR SELECT 
USING (
  status = 'approved' 
  AND (
    has_role(auth.uid(), 'tech_lead'::app_role) 
    OR has_role(auth.uid(), 'management'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Also ensure tech leads can view all profiles (not just team members)
-- This allows Skill Explorer to show all users with approved skills

DROP POLICY IF EXISTS "Tech leads can view all profiles for skill explorer" ON public.profiles;

CREATE POLICY "Tech leads can view all profiles for skill explorer" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'tech_lead'::app_role) 
  OR has_role(auth.uid(), 'management'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
);