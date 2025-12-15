-- Fix the profiles_role_check constraint - correct order of operations

-- Step 1: Drop the old constraint FIRST
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Step 2: Update any existing 'manager' roles to 'management'
UPDATE public.profiles 
SET role = 'management' 
WHERE role = 'manager';

-- Step 3: Add the new constraint with correct roles
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('employee', 'tech_lead', 'management', 'admin'));