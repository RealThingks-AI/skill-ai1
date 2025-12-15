-- Add 'rejected' status to projects table constraint
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('awaiting_approval', 'active', 'completed', 'on_hold', 'rejected'));