-- Remove draft status option and make submitted the default
-- Update user_skills table default status
ALTER TABLE public.user_skills ALTER COLUMN status SET DEFAULT 'submitted';

-- Update employee_ratings table default status  
ALTER TABLE public.employee_ratings ALTER COLUMN status SET DEFAULT 'submitted';

-- Update any existing draft records to submitted status
UPDATE public.user_skills SET status = 'submitted', submitted_at = COALESCE(submitted_at, now()) WHERE status = 'draft';
UPDATE public.employee_ratings SET status = 'submitted', submitted_at = COALESCE(submitted_at, now()) WHERE status = 'draft';