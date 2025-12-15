-- Update admin1@realthingks.com to admin role
UPDATE public.profiles 
SET role = 'admin', updated_at = now()
WHERE email = 'admin1@realthingks.com';

-- Ensure they have admin role in user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, 'admin'::app_role
FROM public.profiles
WHERE email = 'admin1@realthingks.com'
ON CONFLICT (user_id, role) DO NOTHING;