-- Create classification_rules table to store dynamic logic for Expert/Intermediate/Beginner
CREATE TABLE IF NOT EXISTS public.classification_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL CHECK (level IN ('expert', 'intermediate', 'beginner')),
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NULL,
  updated_by uuid NULL
);

-- Enable RLS
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can view rules
CREATE POLICY "Anyone can view classification rules"
  ON public.classification_rules
  FOR SELECT
  USING (true);

-- Admin and Management can manage rules
CREATE POLICY "Admin and Management can manage classification rules"
  ON public.classification_rules
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'management'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'management'::app_role)
  );

-- Create trigger to update updated_at
CREATE TRIGGER update_classification_rules_updated_at
  BEFORE UPDATE ON public.classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();