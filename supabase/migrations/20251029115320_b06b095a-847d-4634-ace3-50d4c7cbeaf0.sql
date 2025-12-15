-- Add a more permissive policy for admins/management to view ALL profiles
-- This ensures the tech lead stats feature works correctly

CREATE POLICY "Admins and management can view all user profiles"
ON profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'management')
  )
);