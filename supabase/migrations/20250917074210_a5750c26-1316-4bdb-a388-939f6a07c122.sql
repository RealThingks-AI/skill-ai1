-- Add next_upgrade_date field to employee_ratings table for 30-day cool-down rule
ALTER TABLE public.employee_ratings 
ADD COLUMN next_upgrade_date date;

-- Create function to calculate next upgrade date (30 days after approval)
CREATE OR REPLACE FUNCTION public.calculate_next_upgrade_date(approved_at_param timestamp with time zone)
RETURNS date
LANGUAGE plpgsql
AS $$
BEGIN
  IF approved_at_param IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN (approved_at_param + INTERVAL '30 days')::date;
END;
$$;

-- Create function to check if upgrade is allowed (progression rules + cool-down)
CREATE OR REPLACE FUNCTION public.can_upgrade_rating(
  current_rating_param text,
  target_rating_param text,
  approved_at_param timestamp with time zone,
  current_status_param text
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  rating_values CONSTANT jsonb := '{"low": 1, "medium": 2, "high": 3}';
  current_value integer;
  target_value integer;
  next_upgrade_date date;
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
  
  -- Check 30-day cool-down period for approved ratings
  IF current_status_param = 'approved' AND approved_at_param IS NOT NULL THEN
    next_upgrade_date := calculate_next_upgrade_date(approved_at_param);
    IF CURRENT_DATE < next_upgrade_date THEN
      RETURN false;
    END IF;
  END IF;
  
  RETURN true;
END;
$$;

-- Update existing records to set next_upgrade_date for approved ratings
UPDATE public.employee_ratings 
SET next_upgrade_date = calculate_next_upgrade_date(approved_at)
WHERE status = 'approved' AND approved_at IS NOT NULL;

-- Create trigger to automatically set next_upgrade_date when rating is approved
CREATE OR REPLACE FUNCTION public.set_next_upgrade_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Set next_upgrade_date when status changes to approved
  IF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    NEW.next_upgrade_date = calculate_next_upgrade_date(NEW.approved_at);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_next_upgrade_date_trigger
  BEFORE UPDATE ON public.employee_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_next_upgrade_date();