-- Create a new employee_ratings table to handle both skill and subskill ratings properly
CREATE TABLE IF NOT EXISTS public.employee_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  subskill_id UUID REFERENCES subskills(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  self_comment TEXT,
  approver_comment TEXT,
  approved_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Unique constraint: one rating per user per skill OR one rating per user per subskill
  UNIQUE(user_id, skill_id, subskill_id),
  
  -- Check: either skill-only rating (subskill_id IS NULL) or subskill rating (subskill_id IS NOT NULL)
  CHECK (
    (subskill_id IS NULL AND skill_id IS NOT NULL) OR 
    (subskill_id IS NOT NULL AND skill_id IS NOT NULL)
  )
);

-- Enable RLS on the new table
ALTER TABLE public.employee_ratings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for employee_ratings
CREATE POLICY "Users can manage their own ratings" 
ON public.employee_ratings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tech leads and management can view team ratings" 
ON public.employee_ratings 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  )
);

CREATE POLICY "Tech leads and management can approve submitted ratings" 
ON public.employee_ratings 
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (
    status = 'submitted' AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.role IN ('tech_lead', 'management', 'admin')
    )
  )
);

-- Create trigger for updating updated_at
CREATE TRIGGER update_employee_ratings_updated_at
  BEFORE UPDATE ON public.employee_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing data from user_skills to employee_ratings
INSERT INTO public.employee_ratings (
  user_id, skill_id, subskill_id, rating, status, self_comment, 
  approver_comment, approved_by, submitted_at, approved_at, created_at, updated_at
)
SELECT 
  user_id, skill_id, subskill_id, rating, status, self_comment,
  approver_comment, approved_by, submitted_at, approved_at, created_at, updated_at
FROM public.user_skills
ON CONFLICT (user_id, skill_id, subskill_id) DO NOTHING;