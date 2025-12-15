-- Add tech_lead_id column to profiles table to link employees to their tech leads
ALTER TABLE public.profiles 
ADD COLUMN tech_lead_id uuid REFERENCES public.profiles(user_id);

-- Add an index for better performance when querying by tech lead
CREATE INDEX idx_profiles_tech_lead_id ON public.profiles(tech_lead_id);

-- Add a comment to document the relationship
COMMENT ON COLUMN public.profiles.tech_lead_id IS 'References the user_id of the tech lead assigned to this employee';