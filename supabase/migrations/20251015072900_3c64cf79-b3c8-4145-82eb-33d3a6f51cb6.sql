-- Update RLS policy to allow users to update their own submitted ratings (for re-rating while pending)
DROP POLICY IF EXISTS "Users can update their own draft ratings" ON employee_ratings;

CREATE POLICY "Users can update their own ratings"
ON employee_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status IN ('draft', 'rejected', 'submitted'))
WITH CHECK (auth.uid() = user_id);