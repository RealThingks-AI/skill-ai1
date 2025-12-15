-- Add comment fields and enhance approval tracking
ALTER TABLE employee_ratings 
ADD COLUMN IF NOT EXISTS self_comment TEXT,
ADD COLUMN IF NOT EXISTS approver_comment TEXT;

-- Create a more comprehensive approval log table for traceability
CREATE TABLE IF NOT EXISTS approval_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id UUID NOT NULL REFERENCES employee_ratings(id) ON DELETE CASCADE,
  approver_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  previous_rating TEXT,
  new_rating TEXT,
  approver_comment TEXT,
  employee_comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for approval logs
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Tech leads can view approval logs for their team
CREATE POLICY "Tech leads can view approval logs for their team" ON approval_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles p1
    JOIN employee_ratings er ON approval_logs.rating_id = er.id
    JOIN profiles p2 ON er.user_id = p2.user_id
    WHERE p1.user_id = auth.uid() 
    AND p1.role IN ('tech_lead', 'management', 'admin')
    AND p2.tech_lead_id = p1.user_id
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND role IN ('management', 'admin')
  )
);

-- Policy: Tech leads can insert approval logs
CREATE POLICY "Tech leads can insert approval logs" ON approval_logs
FOR INSERT WITH CHECK (
  auth.uid() = approver_id AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND role IN ('tech_lead', 'management', 'admin')
  )
);

-- Create function to handle tech lead notifications for self-ratings
CREATE OR REPLACE FUNCTION notify_tech_leads_for_self_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- If a tech lead is rating themselves, notify other tech leads
  IF NEW.status = 'submitted' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = NEW.user_id 
    AND role = 'tech_lead'
  ) THEN
    -- Insert notifications for all other tech leads
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
      p.user_id,
      'Tech Lead Self-Rating Submitted',
      'A tech lead has submitted self-ratings for review.',
      'info'
    FROM profiles p
    WHERE p.role = 'tech_lead' 
    AND p.user_id != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;