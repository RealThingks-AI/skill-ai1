-- Update existing employee ratings to submitted status for testing
UPDATE employee_ratings 
SET 
  status = 'submitted',
  submitted_at = now(),
  self_comment = CASE 
    WHEN user_id = 'fac10c01-9f7a-453d-94ef-9152b2af2587'::uuid AND skill_id = 'e582b0c5-d7e3-4715-b624-e714c9490644'::uuid 
    THEN 'I have been working with this skill for 2+ years and feel confident in advanced concepts.'
    WHEN user_id = 'fac10c01-9f7a-453d-94ef-9152b2af2587'::uuid AND skill_id = 'f165c8fe-7ffd-4059-94cf-dbe27e6a38e5'::uuid 
    THEN 'I can manage AWS services and handle basic scaling operations.'
    ELSE 'I have good experience with this skill and ready for assessment.'
  END
WHERE status = 'draft' 
  AND user_id IN ('fac10c01-9f7a-453d-94ef-9152b2af2587'::uuid, '5cb7706a-d816-4c70-8553-f61e86918ce6'::uuid);

-- Create notifications for the tech lead
INSERT INTO notifications (
  user_id,
  title,
  message,
  type
) VALUES (
  '76c11a6d-b618-4a01-882a-0ee3541dc146'::uuid, -- AI User (tech lead)
  'New Skill Assessments Pending',
  'Multiple employees have submitted skill assessments that require your approval.',
  'info'
);