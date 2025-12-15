-- Fix security warning by setting proper search_path for sync function
CREATE OR REPLACE FUNCTION sync_user_role_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user gets admin role, update their profile
  IF NEW.role = 'admin' THEN
    UPDATE profiles
    SET role = 'admin'
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;