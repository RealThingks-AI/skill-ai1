-- Create backup_history table to track backups
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('manual', 'auto')),
  file_size BIGINT NOT NULL,
  table_count INTEGER NOT NULL,
  record_count INTEGER NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB,
  CONSTRAINT fk_backup_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Admins can manage all backups
CREATE POLICY "Admins can manage backup history"
ON public.backup_history
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_backup_history_created_at ON public.backup_history(created_at DESC);
CREATE INDEX idx_backup_history_created_by ON public.backup_history(created_by);