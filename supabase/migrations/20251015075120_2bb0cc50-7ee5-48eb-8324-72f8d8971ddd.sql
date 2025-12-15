-- Add unique constraint for employee_ratings to support upserts
-- This ensures each user can have only one rating per skill or subskill

-- First, check if there are any duplicate rows and handle them
-- (keeping the most recent one)
CREATE TEMP TABLE temp_duplicates AS
SELECT 
  user_id, 
  skill_id, 
  COALESCE(subskill_id::text, 'NULL') as subskill_id_key,
  MAX(updated_at) as max_updated_at
FROM employee_ratings
GROUP BY user_id, skill_id, COALESCE(subskill_id::text, 'NULL')
HAVING COUNT(*) > 1;

-- Delete duplicate rows, keeping only the most recent
DELETE FROM employee_ratings
WHERE id IN (
  SELECT er.id
  FROM employee_ratings er
  INNER JOIN temp_duplicates td ON 
    er.user_id = td.user_id 
    AND er.skill_id = td.skill_id 
    AND COALESCE(er.subskill_id::text, 'NULL') = td.subskill_id_key
    AND er.updated_at < td.max_updated_at
);

-- Add unique constraint
-- Note: In PostgreSQL, NULL values are distinct, so we need to handle the case
-- where subskill_id can be NULL
ALTER TABLE employee_ratings 
ADD CONSTRAINT employee_ratings_user_skill_subskill_unique 
UNIQUE NULLS NOT DISTINCT (user_id, skill_id, subskill_id);

-- Add index for better performance on lookups
CREATE INDEX IF NOT EXISTS idx_employee_ratings_user_skill_subskill 
ON employee_ratings(user_id, skill_id, subskill_id) 
WHERE subskill_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_employee_ratings_user_skill_null 
ON employee_ratings(user_id, skill_id) 
WHERE subskill_id IS NULL;