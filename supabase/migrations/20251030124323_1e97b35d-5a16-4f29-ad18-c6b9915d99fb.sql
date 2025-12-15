-- Add allocation percentage to project assignments
ALTER TABLE project_assignments 
ADD COLUMN allocation_percentage integer NOT NULL DEFAULT 100 CHECK (allocation_percentage IN (25, 50, 75, 100));

-- Add required rating level to project required skills
ALTER TABLE project_required_skills 
ADD COLUMN required_rating text NOT NULL DEFAULT 'medium' CHECK (required_rating IN ('high', 'medium', 'low'));

-- Add rejection reason to projects
ALTER TABLE projects 
ADD COLUMN rejection_reason text,
ADD COLUMN rejected_by uuid REFERENCES profiles(user_id),
ADD COLUMN rejected_at timestamp with time zone;

-- Create project allocation history table
CREATE TABLE project_allocation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  previous_allocation integer,
  new_allocation integer NOT NULL,
  changed_by uuid NOT NULL,
  change_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on allocation history
ALTER TABLE project_allocation_history ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view allocation history
CREATE POLICY "Anyone can view allocation history"
ON project_allocation_history FOR SELECT
TO authenticated
USING (true);

-- Policy: Tech leads and management can insert allocation history
CREATE POLICY "Tech leads can insert allocation history"
ON project_allocation_history FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('tech_lead', 'management', 'admin')
  )
);

-- Create project reminders table
CREATE TABLE project_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'monthly_update',
  sent_to uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  due_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on reminders
ALTER TABLE project_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own reminders
CREATE POLICY "Users can view their own reminders"
ON project_reminders FOR SELECT
TO authenticated
USING (sent_to = auth.uid() OR EXISTS (
  SELECT 1 FROM profiles
  WHERE user_id = auth.uid()
  AND role IN ('management', 'admin')
));

-- Policy: System can insert reminders
CREATE POLICY "System can insert reminders"
ON project_reminders FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create function to calculate user allocation
CREATE OR REPLACE FUNCTION get_user_total_allocation(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_allocation integer;
BEGIN
  SELECT COALESCE(SUM(pa.allocation_percentage), 0)
  INTO total_allocation
  FROM project_assignments pa
  JOIN projects p ON pa.project_id = p.id
  WHERE pa.user_id = user_id_param
  AND p.status IN ('active', 'awaiting_approval');
  
  RETURN total_allocation;
END;
$$;

-- Create function to get available capacity
CREATE OR REPLACE FUNCTION get_user_available_capacity(user_id_param uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 100 - get_user_total_allocation(user_id_param);
END;
$$;