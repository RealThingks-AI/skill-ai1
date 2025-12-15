-- Create activity_log table for tracking page access changes
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admins can manage all activity logs
CREATE POLICY "Admins can manage activity logs"
ON public.activity_log
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view activity logs
CREATE POLICY "Users can view activity logs"
ON public.activity_log
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'management'::app_role)
);

-- Create index for better performance
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

-- Update page_access table trigger to update timestamp
CREATE OR REPLACE FUNCTION public.update_page_access_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create trigger for page_access updates
DROP TRIGGER IF EXISTS update_page_access_updated_at_trigger ON public.page_access;
CREATE TRIGGER update_page_access_updated_at_trigger
BEFORE UPDATE ON public.page_access
FOR EACH ROW
EXECUTE FUNCTION public.update_page_access_updated_at();