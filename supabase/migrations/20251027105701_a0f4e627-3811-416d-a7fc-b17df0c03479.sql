-- Create storage bucket for backups
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('backups', 'backups', false, 52428800, ARRAY['application/json']::text[])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for backups bucket
CREATE POLICY "Admins can upload backups"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'backups' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can view backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'backups' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete backups"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'backups' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add storage_path column to backup_history
ALTER TABLE public.backup_history
ADD COLUMN IF NOT EXISTS storage_path text;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_backup_history_created_at 
ON public.backup_history(created_at DESC);