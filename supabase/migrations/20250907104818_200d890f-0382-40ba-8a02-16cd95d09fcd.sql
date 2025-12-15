-- Add unique constraints to ensure no duplicate names
ALTER TABLE skill_categories ADD CONSTRAINT unique_category_name UNIQUE (name);
ALTER TABLE skills ADD CONSTRAINT unique_skill_name_per_category UNIQUE (name, category_id);
ALTER TABLE subskills ADD CONSTRAINT unique_subskill_name_per_skill UNIQUE (name, skill_id);