-- Create historical skill ratings table to track all rating changes
CREATE TABLE public.skill_rating_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  subskill_id UUID,
  rating_type TEXT NOT NULL CHECK (rating_type IN ('self', 'approved')),
  rating TEXT NOT NULL CHECK (rating IN ('high', 'medium', 'low')),
  rated_by UUID,
  rating_comment TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  superseded_at TIMESTAMP WITH TIME ZONE
);

-- Create approval history table
CREATE TABLE public.approval_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rating_history_id UUID NOT NULL REFERENCES public.skill_rating_history(id),
  approver_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'requested_revision')),
  comment TEXT,
  previous_rating TEXT,
  new_rating TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create training participation table
CREATE TABLE public.training_participation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_name TEXT NOT NULL,
  skill_category_id UUID REFERENCES public.skill_categories(id),
  start_date DATE,
  completion_date DATE,
  cost DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create report generation logs table
CREATE TABLE public.report_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_by UUID NOT NULL,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  filters JSONB,
  status TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  records_processed INTEGER DEFAULT 0,
  file_path TEXT,
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create budget tracking table
CREATE TABLE public.training_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  department TEXT,
  fiscal_year INTEGER NOT NULL,
  allocated_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  used_budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.skill_rating_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skill_rating_history
CREATE POLICY "Users can view their own rating history" 
ON public.skill_rating_history 
FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('tech_lead', 'management', 'admin')
));

CREATE POLICY "Users can insert their own ratings" 
ON public.skill_rating_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() = rated_by);

CREATE POLICY "Tech leads can update team ratings" 
ON public.skill_rating_history 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('tech_lead', 'management', 'admin')
));

-- RLS Policies for approval_history
CREATE POLICY "Anyone can view approval history" 
ON public.approval_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('employee', 'tech_lead', 'management', 'admin')
));

CREATE POLICY "Approvers can insert approval records" 
ON public.approval_history 
FOR INSERT 
WITH CHECK (auth.uid() = approver_id);

-- RLS Policies for training_participation
CREATE POLICY "Users can view their own training" 
ON public.training_participation 
FOR SELECT 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('tech_lead', 'management', 'admin')
));

CREATE POLICY "Users can manage their own training" 
ON public.training_participation 
FOR ALL 
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('management', 'admin')
));

-- RLS Policies for report_logs
CREATE POLICY "Users can view their own report logs" 
ON public.report_logs 
FOR SELECT 
USING (auth.uid() = generated_by OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('management', 'admin')
));

CREATE POLICY "Users can create report logs" 
ON public.report_logs 
FOR INSERT 
WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own report logs" 
ON public.report_logs 
FOR UPDATE 
USING (auth.uid() = generated_by);

-- RLS Policies for training_budgets
CREATE POLICY "Management can view all budgets" 
ON public.training_budgets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('management', 'admin')
));

CREATE POLICY "Management can manage budgets" 
ON public.training_budgets 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('management', 'admin')
));

-- Create indexes for better performance
CREATE INDEX idx_skill_rating_history_user_id ON public.skill_rating_history(user_id);
CREATE INDEX idx_skill_rating_history_skill_id ON public.skill_rating_history(skill_id);
CREATE INDEX idx_skill_rating_history_created_at ON public.skill_rating_history(created_at);
CREATE INDEX idx_approval_history_created_at ON public.approval_history(created_at);
CREATE INDEX idx_training_participation_user_id ON public.training_participation(user_id);
CREATE INDEX idx_report_logs_generated_by ON public.report_logs(generated_by);
CREATE INDEX idx_report_logs_created_at ON public.report_logs(created_at);

-- Create triggers for updated_at columns
CREATE TRIGGER update_training_participation_updated_at
  BEFORE UPDATE ON public.training_participation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_training_budgets_updated_at
  BEFORE UPDATE ON public.training_budgets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to archive old ratings when new ones are created
CREATE OR REPLACE FUNCTION public.archive_superseded_ratings()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark existing ratings as superseded
  UPDATE public.skill_rating_history 
  SET status = 'superseded', superseded_at = now()
  WHERE user_id = NEW.user_id 
    AND skill_id = NEW.skill_id 
    AND (subskill_id = NEW.subskill_id OR (subskill_id IS NULL AND NEW.subskill_id IS NULL))
    AND rating_type = NEW.rating_type
    AND status = 'active'
    AND id != NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically archive old ratings
CREATE TRIGGER archive_superseded_ratings_trigger
  AFTER INSERT ON public.skill_rating_history
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_superseded_ratings();