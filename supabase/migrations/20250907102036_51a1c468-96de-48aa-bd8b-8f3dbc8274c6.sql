-- Fix the test function that doesn't have search_path set
CREATE OR REPLACE FUNCTION public.test_employee_rating_insert(p_user_id uuid, p_skill_id uuid, p_subskill_id uuid, p_rating text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RAISE NOTICE 'Attempting insert with user_id: %, skill_id: %, subskill_id: %, rating: %', 
    p_user_id, p_skill_id, p_subskill_id, p_rating;
    
  INSERT INTO public.employee_ratings (user_id, skill_id, subskill_id, rating, status)
  VALUES (p_user_id, p_skill_id, p_subskill_id, p_rating, 'draft');
  
  RAISE NOTICE 'Insert successful';
END;
$$;

-- Also fix the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;