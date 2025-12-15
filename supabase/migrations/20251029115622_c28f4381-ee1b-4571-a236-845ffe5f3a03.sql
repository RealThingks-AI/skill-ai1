-- Drop the previous policy that might be conflicting
DROP POLICY IF EXISTS "Admins and management can view all user profiles" ON profiles;

-- Create a more comprehensive policy using the has_role function that's already working
CREATE POLICY "Admins can view all profiles for reporting"
ON profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'management'::app_role)
);