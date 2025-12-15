-- Drop the existing check constraint that's preventing subskill ratings
ALTER TABLE user_skills DROP CONSTRAINT IF EXISTS check_skill_or_subskill;

-- Add a new constraint that allows:
-- 1. skill_id only (for direct skill ratings)
-- 2. Both skill_id and subskill_id (for subskill ratings)
-- But prevents subskill_id without skill_id
ALTER TABLE user_skills ADD CONSTRAINT check_skill_or_subskill 
CHECK (
  (skill_id IS NOT NULL AND subskill_id IS NULL) OR 
  (skill_id IS NOT NULL AND subskill_id IS NOT NULL)
);