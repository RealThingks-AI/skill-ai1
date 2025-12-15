-- Insert sample employee rating submissions for testing the approval workflow

-- EMP 02 submits a React skill rating
INSERT INTO employee_ratings (
  user_id,
  skill_id,
  subskill_id,
  rating,
  status,
  self_comment,
  submitted_at
) VALUES (
  'fac10c01-9f7a-453d-94ef-9152b2af2587', -- EMP 02
  'e582b0c5-d7e3-4715-b624-e714c9490644', -- Main Skill
  'd5e57242-4104-4a2b-a33f-7d4d01276034', -- main subskill
  'high',
  'submitted',
  'I have been working with React for 2+ years and feel confident in advanced concepts like hooks, context, and performance optimization.',
  now()
);

-- EMP 02 submits an AWS skill rating
INSERT INTO employee_ratings (
  user_id,
  skill_id,
  subskill_id,
  rating,
  status,
  self_comment,
  submitted_at
) VALUES (
  'fac10c01-9f7a-453d-94ef-9152b2af2587', -- EMP 02
  'f165c8fe-7ffd-4059-94cf-dbe27e6a38e5', -- AWS
  'a8c69e5e-1e9a-4de4-bcf5-97a660d36c44', -- EC2
  'medium',
  'submitted',
  'I can create and manage EC2 instances, configure security groups, and handle basic scaling operations.',
  now()
);

-- EMP 01 submits a skill rating
INSERT INTO employee_ratings (
  user_id,
  skill_id,
  rating,
  status,
  self_comment,
  submitted_at
) VALUES (
  '5cb7706a-d816-4c70-8553-f61e86918ce6', -- EMP 01
  '2d672394-ff0b-4c9a-bf7c-d46466f49497', -- DevOps
  'medium',
  'submitted',
  'I have experience with CI/CD pipelines and containerization using Docker.',
  now()
);

-- Create notifications for the tech lead about these submissions
INSERT INTO notifications (
  user_id,
  title,
  message,
  type
) VALUES (
  '76c11a6d-b618-4a01-882a-0ee3541dc146', -- AI User (tech lead)
  'New Skill Assessment Pending',
  'EMP 02 has submitted a skill assessment for Main Skill - main subskill that requires your approval.',
  'info'
);

INSERT INTO notifications (
  user_id,
  title,
  message,
  type
) VALUES (
  '76c11a6d-b618-4a01-882a-0ee3541dc146', -- AI User (tech lead)
  'New Skill Assessment Pending',
  'EMP 02 has submitted a skill assessment for AWS - EC2 that requires your approval.',
  'info'
);

INSERT INTO notifications (
  user_id,
  title,
  message,
  type
) VALUES (
  '76c11a6d-b618-4a01-882a-0ee3541dc146', -- AI User (tech lead)
  'New Skill Assessment Pending',
  'EMP 01 has submitted a skill assessment for DevOps that requires your approval.',
  'info'
);