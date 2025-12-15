-- Add RLS policy to allow users to view profiles of their project team members
CREATE POLICY "Users can view project team member profiles"
ON public.profiles
FOR SELECT
TO public
USING (
  -- Allow users to see profiles of people in the same project
  EXISTS (
    SELECT 1
    FROM project_assignments pa1
    JOIN project_assignments pa2 ON pa1.project_id = pa2.project_id
    WHERE pa1.user_id = auth.uid()
      AND pa2.user_id = profiles.user_id
  )
);