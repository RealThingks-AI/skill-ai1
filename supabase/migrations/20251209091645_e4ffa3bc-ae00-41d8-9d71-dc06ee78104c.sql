-- Fix the get_project_member_allocations function to return correct types
DROP FUNCTION IF EXISTS public.get_project_member_allocations(uuid);

CREATE OR REPLACE FUNCTION public.get_project_member_allocations(p_project_id uuid)
 RETURNS TABLE(user_id uuid, month text, allocation_percentage integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    pma.user_id,
    pma.month::text,  -- Cast varchar to text to match return type
    pma.allocation_percentage::INTEGER
  FROM public.project_member_monthly_allocations pma
  WHERE pma.project_id = p_project_id;
END;
$function$;