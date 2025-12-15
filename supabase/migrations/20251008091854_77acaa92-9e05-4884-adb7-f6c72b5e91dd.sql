-- Create skill explorer presets table
CREATE TABLE IF NOT EXISTS public.skill_explorer_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  preset_name TEXT NOT NULL,
  selections JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.skill_explorer_presets ENABLE ROW LEVEL SECURITY;

-- Users can manage their own presets
CREATE POLICY "Users can manage their own presets"
ON public.skill_explorer_presets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_skill_explorer_presets_user_id ON public.skill_explorer_presets(user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_skill_explorer_presets_updated_at
BEFORE UPDATE ON public.skill_explorer_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();