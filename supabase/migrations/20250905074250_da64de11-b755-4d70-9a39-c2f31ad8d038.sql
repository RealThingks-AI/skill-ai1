-- Update admin@realthingks.com user to have admin role
UPDATE profiles 
SET role = 'admin'
WHERE email = 'admin@realthingks.com';

-- Also update role constants to match database values if needed
-- Update any existing 'management' role to 'manager' for consistency
UPDATE profiles 
SET role = 'manager'
WHERE role = 'management' AND email != 'admin@realthingks.com';