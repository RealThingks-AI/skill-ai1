-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.archive_superseded_ratings()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark existing ratings as superseded
  UPDATE public.skill_rating_history 
  SET status = 'superseded', superseded_at = now()
  WHERE user_id = NEW.user_id 
    AND skill_id = NEW.skill_id 
    AND (subskill_id = NEW.subskill_id OR (subskill_id IS NULL AND NEW.subskill_id IS NULL))
    AND rating_type = NEW.rating_type
    AND status = 'active'
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$;