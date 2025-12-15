-- Create audit logs table for import/export operations
CREATE TABLE public.import_export_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('import', 'export')),
  log_level TEXT NOT NULL CHECK (log_level IN ('success', 'error', 'info')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category', 'skill', 'subskill')),
  entity_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'reused', 'linked', 'failed', 'duplicate')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_export_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own logs" 
ON public.import_export_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own logs" 
ON public.import_export_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_import_export_logs_user_operation ON public.import_export_logs(user_id, operation_type, created_at);
CREATE INDEX idx_import_export_logs_entity ON public.import_export_logs(entity_type, entity_name);