-- Sync profiles.role with user_roles table for admin users
-- Update profiles where user has 'admin' role in user_roles
UPDATE profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT user_id 
  FROM user_roles 
  WHERE role = 'admin'
)
AND role != 'admin';

-- Create a function to sync roles from user_roles to profiles
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically sync admin role
DROP TRIGGER IF EXISTS sync_admin_role_trigger ON user_roles;
CREATE TRIGGER sync_admin_role_trigger
  AFTER INSERT OR UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_role_to_profile();