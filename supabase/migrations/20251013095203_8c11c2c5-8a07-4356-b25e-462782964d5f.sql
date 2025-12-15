-- Clear all skills-related data (703 records total)

-- First, delete all employee ratings
DELETE FROM public.employee_ratings;

-- Delete all user skills
DELETE FROM public.user_skills;

-- Delete all skill rating history
DELETE FROM public.skill_rating_history;

-- Delete all personal goals (they reference skills)
DELETE FROM public.personal_goals;

-- Delete all goal progress history
DELETE FROM public.goal_progress_history;

-- Reset user category preferences (clear visible_category_ids arrays)
UPDATE public.user_category_preferences SET visible_category_ids = '{}';

-- Delete all subskills
DELETE FROM public.subskills;

-- Delete all skills
DELETE FROM public.skills;

-- Delete all skill categories
DELETE FROM public.skill_categories;