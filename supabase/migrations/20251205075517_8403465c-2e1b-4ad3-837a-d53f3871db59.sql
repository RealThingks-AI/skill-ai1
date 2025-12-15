-- Create function to get user's total allocation for a specific month
-- This queries the project_member_monthly_allocations table
CREATE OR REPLACE FUNCTION public.get_user_monthly_allocation(
  user_id_param uuid,
  month_param varchar
)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_allocation integer;
BEGIN
  SELECT COALESCE(SUM(pmma.allocation_percentage), 0)
  INTO total_allocation
  FROM project_member_monthly_allocations pmma
  JOIN projects p ON pmma.project_id = p.id
  WHERE pmma.user_id = user_id_param
  AND pmma.month = month_param
  AND p.status IN ('active', 'awaiting_approval');
  
  RETURN total_allocation;
END;
$$;

-- Create function to get user's available capacity for a specific month
CREATE OR REPLACE FUNCTION public.get_user_monthly_available_capacity(
  user_id_param uuid,
  month_param varchar
)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_allocation integer;
BEGIN
  SELECT COALESCE(SUM(pmma.allocation_percentage), 0)
  INTO total_allocation
  FROM project_member_monthly_allocations pmma
  JOIN projects p ON pmma.project_id = p.id
  WHERE pmma.user_id = user_id_param
  AND pmma.month = month_param
  AND p.status IN ('active', 'awaiting_approval');
  
  RETURN 100 - total_allocation;
END;
$$;