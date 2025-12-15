-- Fix the RLS policies for employee_ratings table to allow tech leads to approve ratings

-- Drop existing policies
DROP POLICY IF EXISTS "Tech leads and management can approve submitted ratings" ON employee_ratings;
DROP POLICY IF EXISTS "Users can manage their own ratings" ON employee_ratings;
DROP POLICY IF EXISTS "Tech leads and management can view team ratings" ON employee_ratings;

-- Recreate policies with correct logic
-- Policy 1: Users can manage their own ratings (insert, update their own)
CREATE POLICY "Users can manage their own ratings" 
ON employee_ratings 
FOR ALL 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Tech leads and management can view all ratings
CREATE POLICY "Tech leads and management can view team ratings" 
ON employee_ratings 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  )
);

-- Policy 3: Tech leads and management can approve/update any submitted rating
CREATE POLICY "Tech leads and management can approve submitted ratings" 
ON employee_ratings 
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = user_id OR 
  (
    status = 'submitted' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('tech_lead', 'management', 'admin')
    )
  ) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  )
);