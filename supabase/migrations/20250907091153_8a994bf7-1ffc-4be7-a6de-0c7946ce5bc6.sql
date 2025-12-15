-- Fix the employee_ratings table foreign key reference
-- The auth.users table is in the auth schema and cannot be directly referenced
-- Remove the foreign key constraint and update the table structure

-- Drop the existing foreign key constraint to auth.users
ALTER TABLE public.employee_ratings 
DROP CONSTRAINT IF EXISTS employee_ratings_user_id_fkey;

ALTER TABLE public.employee_ratings 
DROP CONSTRAINT IF EXISTS employee_ratings_approved_by_fkey;

-- Add index for better performance on user_id lookups
CREATE INDEX IF NOT EXISTS idx_employee_ratings_user_id ON public.employee_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_ratings_skill_subskill ON public.employee_ratings(user_id, skill_id, subskill_id);

-- Add some debug logging by creating a function to test inserts
CREATE OR REPLACE FUNCTION test_employee_rating_insert(
  p_user_id UUID,
  p_skill_id UUID, 
  p_subskill_id UUID,
  p_rating TEXT
) RETURNS VOID AS $$
BEGIN
  RAISE NOTICE 'Attempting insert with user_id: %, skill_id: %, subskill_id: %, rating: %', 
    p_user_id, p_skill_id, p_subskill_id, p_rating;
    
  INSERT INTO public.employee_ratings (user_id, skill_id, subskill_id, rating, status)
  VALUES (p_user_id, p_skill_id, p_subskill_id, p_rating, 'draft');
  
  RAISE NOTICE 'Insert successful';
END;
$$ LANGUAGE plpgsql;