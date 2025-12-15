-- Update projects table status constraint to support new statuses
ALTER TABLE public.projects 
  DROP CONSTRAINT IF EXISTS projects_status_check;

ALTER TABLE public.projects 
  ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('awaiting_approval', 'active', 'completed', 'on_hold'));

-- Update default status
ALTER TABLE public.projects 
  ALTER COLUMN status SET DEFAULT 'awaiting_approval';

-- Create project_required_skills junction table
CREATE TABLE public.project_required_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  subskill_id UUID REFERENCES public.subskills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, skill_id, subskill_id)
);

-- Create project_skill_validations table for "Project Proven" tracking
CREATE TABLE public.project_skill_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  subskill_id UUID REFERENCES public.subskills(id) ON DELETE CASCADE,
  validated_by UUID NOT NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id, skill_id, subskill_id)
);

-- Enable RLS on new tables
ALTER TABLE public.project_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_skill_validations ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_required_skills
CREATE POLICY "Anyone can view project required skills"
  ON public.project_required_skills
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage project required skills"
  ON public.project_required_skills
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS policies for project_skill_validations
CREATE POLICY "Anyone can view project skill validations"
  ON public.project_skill_validations
  FOR SELECT
  USING (true);

CREATE POLICY "Tech leads and management can manage skill validations"
  ON public.project_skill_validations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('tech_lead', 'management', 'admin')
    )
  );

-- Add approved_by and approved_at to projects table
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;