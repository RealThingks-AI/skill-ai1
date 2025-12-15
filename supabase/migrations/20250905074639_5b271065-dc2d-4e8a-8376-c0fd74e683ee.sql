-- Update the role check constraint to use the correct role values
ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['employee'::text, 'tech_lead'::text, 'manager'::text, 'admin'::text]));