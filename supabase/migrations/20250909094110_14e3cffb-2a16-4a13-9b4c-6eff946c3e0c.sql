-- Fix RLS policy for employee_ratings to allow tech leads to see all submitted ratings
DROP POLICY IF EXISTS "Tech leads and management can view team ratings" ON employee_ratings;

-- Create new policy that allows tech leads to see all submitted ratings for approval
CREATE POLICY "Tech leads can view all submitted ratings for approval" 
ON employee_ratings FOR SELECT
USING (
  -- Users can always see their own ratings
  (auth.uid() = user_id) 
  OR 
  -- Tech leads, management, and admins can see all submitted ratings that need approval
  (status = 'submitted' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  ))
  OR
  -- Tech leads, management, and admins can see all ratings (approved/rejected) for reporting
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  ))
);

-- Create audit log table for approval actions
CREATE TABLE IF NOT EXISTS approval_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES employee_ratings(id) ON DELETE CASCADE,
  approver_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('approved', 'rejected')),
  previous_status text,
  new_status text,
  approver_comment text,
  employee_comment text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE approval_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow tech leads to insert and view audit logs
CREATE POLICY "Tech leads can manage audit logs" 
ON approval_audit_logs FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('tech_lead', 'management', 'admin')
));

-- Create trigger to automatically log approval actions
CREATE OR REPLACE FUNCTION log_approval_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log when status changes to approved or rejected
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO approval_audit_logs (
      rating_id,
      approver_id,
      action,
      previous_status,
      new_status,
      approver_comment,
      employee_comment,
      metadata
    ) VALUES (
      NEW.id,
      NEW.approved_by,
      NEW.status,
      OLD.status,
      NEW.status,
      NEW.approver_comment,
      NEW.self_comment,
      jsonb_build_object(
        'approved_at', NEW.approved_at,
        'skill_id', NEW.skill_id,
        'subskill_id', NEW.subskill_id,
        'rating', NEW.rating,
        'user_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_log_approval_action ON employee_ratings;
CREATE TRIGGER trigger_log_approval_action
  AFTER UPDATE ON employee_ratings
  FOR EACH ROW
  EXECUTE FUNCTION log_approval_action();