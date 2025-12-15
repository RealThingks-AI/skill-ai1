-- Create logs table for tracking all user activities
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('Skills', 'Users', 'Approvals', 'Backup', 'Restore', 'Auth', 'Settings', 'Projects', 'Reports')),
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  record_reference TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create password change logs table
CREATE TABLE IF NOT EXISTS public.password_change_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  changed_by_id UUID NOT NULL,
  changed_by_username TEXT NOT NULL,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('Self', 'Admin')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_password_change_logs_user_id ON public.password_change_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_password_change_logs_created_at ON public.password_change_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_change_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for activity_logs
CREATE POLICY "Admins can view all activity logs"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert activity logs"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS Policies for password_change_logs
CREATE POLICY "Admins can view all password change logs"
ON public.password_change_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert password change logs"
ON public.password_change_logs
FOR INSERT
TO authenticated
WITH CHECK (true);