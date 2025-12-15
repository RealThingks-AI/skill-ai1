-- Update RLS policies to allow tech leads to view all employee details and history

-- Update approval_logs policy to allow tech leads to view all approval logs
DROP POLICY IF EXISTS "Tech leads can view approval logs for their team" ON approval_logs;

CREATE POLICY "Tech leads can view all approval logs" 
ON approval_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['tech_lead'::text, 'management'::text, 'admin'::text])
  )
);

-- Update employee_ratings policy to be more explicit about tech lead access
DROP POLICY IF EXISTS "Tech leads can view all submitted ratings for approval" ON employee_ratings;

CREATE POLICY "Tech leads can view all employee ratings" 
ON employee_ratings 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['tech_lead'::text, 'management'::text, 'admin'::text])
  ))
);

-- Update approval_history policy to ensure tech leads can see all approval history
DROP POLICY IF EXISTS "Anyone can view approval history" ON approval_history;

CREATE POLICY "Authenticated users can view approval history" 
ON approval_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['employee'::text, 'tech_lead'::text, 'management'::text, 'admin'::text])
  )
);

-- Ensure skill_rating_history is accessible to tech leads for all employees
DROP POLICY IF EXISTS "Users can view their own rating history" ON skill_rating_history;

CREATE POLICY "Users can view rating history" 
ON skill_rating_history 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY (ARRAY['tech_lead'::text, 'management'::text, 'admin'::text])
  ))
);