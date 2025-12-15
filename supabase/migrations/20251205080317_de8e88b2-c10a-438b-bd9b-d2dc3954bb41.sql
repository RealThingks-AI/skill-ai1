-- Function to delete all monthly allocations for a specific user in a project
CREATE OR REPLACE FUNCTION public.delete_user_project_allocations(
  p_project_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM project_member_monthly_allocations
  WHERE project_id = p_project_id 
    AND user_id = p_user_id;
END;
$$;