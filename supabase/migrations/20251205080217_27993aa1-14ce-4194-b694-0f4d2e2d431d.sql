-- Function to get project member monthly allocations
CREATE OR REPLACE FUNCTION public.get_project_member_allocations(p_project_id uuid)
RETURNS TABLE(
  user_id uuid,
  month varchar,
  allocation_percentage integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT pmma.user_id, pmma.month, pmma.allocation_percentage
  FROM project_member_monthly_allocations pmma
  WHERE pmma.project_id = p_project_id;
END;
$$;

-- Function to upsert member monthly allocation
CREATE OR REPLACE FUNCTION public.upsert_member_monthly_allocation(
  p_project_id uuid,
  p_user_id uuid,
  p_month varchar,
  p_allocation_percentage integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO project_member_monthly_allocations (project_id, user_id, month, allocation_percentage)
  VALUES (p_project_id, p_user_id, p_month, p_allocation_percentage)
  ON CONFLICT (project_id, user_id, month) 
  DO UPDATE SET allocation_percentage = p_allocation_percentage, updated_at = now();
END;
$$;

-- Function to delete member allocation for a month
CREATE OR REPLACE FUNCTION public.delete_member_monthly_allocation(
  p_project_id uuid,
  p_user_id uuid,
  p_month varchar
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM project_member_monthly_allocations
  WHERE project_id = p_project_id 
    AND user_id = p_user_id 
    AND month = p_month;
END;
$$;

-- Function to delete all member allocations for a project
CREATE OR REPLACE FUNCTION public.delete_project_member_allocations(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM project_member_monthly_allocations
  WHERE project_id = p_project_id;
END;
$$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_member_monthly_allocations_unique'
  ) THEN
    ALTER TABLE project_member_monthly_allocations 
    ADD CONSTRAINT project_member_monthly_allocations_unique 
    UNIQUE (project_id, user_id, month);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;