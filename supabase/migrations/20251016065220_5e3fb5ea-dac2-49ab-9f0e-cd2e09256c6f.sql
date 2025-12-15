-- Create subskill rating history table
CREATE TABLE IF NOT EXISTS public.subskill_rating_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  subskill_id UUID NOT NULL,
  rating TEXT NOT NULL,
  self_comment TEXT,
  approver_comment TEXT,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subskill_rating_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own history
CREATE POLICY "Users can view their own rating history"
ON public.subskill_rating_history
FOR SELECT
USING (auth.uid() = user_id);

-- Tech leads can view team history
CREATE POLICY "Tech leads can view team rating history"
ON public.subskill_rating_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('tech_lead', 'management', 'admin')
  )
);

-- System can insert history records
CREATE POLICY "System can insert rating history"
ON public.subskill_rating_history
FOR INSERT
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_subskill_rating_history_user_subskill 
ON public.subskill_rating_history(user_id, subskill_id, archived_at DESC);