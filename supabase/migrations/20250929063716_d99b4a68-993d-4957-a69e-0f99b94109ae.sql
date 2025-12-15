-- Add NA status support to employee_ratings table
ALTER TABLE public.employee_ratings 
ADD COLUMN IF NOT EXISTS na_status boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_employee_ratings_na_status 
ON public.employee_ratings(user_id, skill_id, na_status) 
WHERE na_status = true;