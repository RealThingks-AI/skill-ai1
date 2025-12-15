-- Update the user with email admin@realthingks.com to have management role
UPDATE public.profiles 
SET role = 'management', updated_at = now()
WHERE email = 'admin@realthingks.com';