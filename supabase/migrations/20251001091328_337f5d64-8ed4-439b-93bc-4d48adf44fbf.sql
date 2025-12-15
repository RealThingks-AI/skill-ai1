-- Remove 30-day cooldown logic from can_upgrade_rating function
CREATE OR REPLACE FUNCTION public.can_upgrade_rating(
  current_rating_param text, 
  target_rating_param text, 
  approved_at_param timestamp with time zone, 
  current_status_param text
)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
  rating_values CONSTANT jsonb := '{"low": 1, "medium": 2, "high": 3}';
  current_value integer;
  target_value integer;
BEGIN
  -- If current rating is already high and approved, no upgrades allowed
  IF current_rating_param = 'high' AND current_status_param = 'approved' THEN
    RETURN false;
  END IF;
  
  -- Convert ratings to numeric values
  current_value := (rating_values ->> current_rating_param)::integer;
  target_value := (rating_values ->> target_rating_param)::integer;
  
  -- Only allow upward progression
  IF target_value <= current_value THEN
    RETURN false;
  END IF;
  
  -- 30-day cooldown check removed - users can upgrade immediately after approval
  
  RETURN true;
END;
$function$;