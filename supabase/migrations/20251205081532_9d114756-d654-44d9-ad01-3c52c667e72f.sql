-- Drop duplicate functions with character varying parameter type
DROP FUNCTION IF EXISTS public.upsert_member_monthly_allocation(uuid, uuid, character varying, integer);
DROP FUNCTION IF EXISTS public.delete_member_monthly_allocation(uuid, uuid, character varying);

-- Recreate the functions with consistent TEXT type
CREATE OR REPLACE FUNCTION public.upsert_member_monthly_allocation(
  p_project_id UUID,
  p_user_id UUID,
  p_month TEXT,
  p_allocation_percentage INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.project_member_monthly_allocations (project_id, user_id, month, allocation_percentage)
  VALUES (p_project_id, p_user_id, p_month, p_allocation_percentage)
  ON CONFLICT (project_id, user_id, month) 
  DO UPDATE SET 
    allocation_percentage = EXCLUDED.allocation_percentage,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate delete function
CREATE OR REPLACE FUNCTION public.delete_member_monthly_allocation(
  p_project_id UUID,
  p_user_id UUID,
  p_month TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.project_member_monthly_allocations 
  WHERE project_id = p_project_id AND user_id = p_user_id AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;