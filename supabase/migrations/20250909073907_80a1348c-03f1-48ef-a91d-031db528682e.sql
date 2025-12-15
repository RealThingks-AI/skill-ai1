-- Fix function search path security issues
DROP FUNCTION IF EXISTS notify_tech_leads_for_self_rating();

-- Recreate function with proper search_path
CREATE OR REPLACE FUNCTION notify_tech_leads_for_self_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- If a tech lead is rating themselves, notify other tech leads
  IF NEW.status = 'submitted' AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = NEW.user_id 
    AND role = 'tech_lead'
  ) THEN
    -- Insert notifications for all other tech leads
    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
      p.user_id,
      'Tech Lead Self-Rating Submitted',
      'A tech lead has submitted self-ratings for review.',
      'info'
    FROM profiles p
    WHERE p.role = 'tech_lead' 
    AND p.user_id != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for tech lead self-rating notifications
DROP TRIGGER IF EXISTS notify_tech_leads_on_self_rating ON employee_ratings;
CREATE TRIGGER notify_tech_leads_on_self_rating
  AFTER UPDATE OF status ON employee_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_tech_leads_for_self_rating();