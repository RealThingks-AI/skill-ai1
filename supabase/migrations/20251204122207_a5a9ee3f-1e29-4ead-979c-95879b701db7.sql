-- Create table for project member monthly allocations
CREATE TABLE public.project_member_monthly_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
  allocation_percentage INTEGER NOT NULL CHECK (allocation_percentage IN (25, 50, 75, 100)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, month)
);

-- Enable RLS
ALTER TABLE public.project_member_monthly_allocations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view monthly allocations"
ON public.project_member_monthly_allocations
FOR SELECT
USING (true);

CREATE POLICY "Tech leads and management can manage monthly allocations"
ON public.project_member_monthly_allocations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_project_member_monthly_allocations_updated_at
BEFORE UPDATE ON public.project_member_monthly_allocations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_member_monthly_allocations;