-- Add month_wise_manpower column to projects table to store manpower limits per month
ALTER TABLE public.projects 
ADD COLUMN month_wise_manpower JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.projects.month_wise_manpower IS 'Array of {month: "YYYY-MM", limit: number} objects representing manpower limits for each month';
