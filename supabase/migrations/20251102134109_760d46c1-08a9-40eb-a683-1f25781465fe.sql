-- Add requested_status to track target status during approval
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS requested_status text;

-- Optional: set requested_status to null for existing rows
UPDATE public.projects SET requested_status = NULL WHERE requested_status IS NULL;