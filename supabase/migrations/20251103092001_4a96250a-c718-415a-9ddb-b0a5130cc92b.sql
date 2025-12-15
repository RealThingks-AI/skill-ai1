-- Add fields to notifications table for related record tracking
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS related_record_id uuid,
ADD COLUMN IF NOT EXISTS related_record_type text,
ADD COLUMN IF NOT EXISTS related_record_route text;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_related_record 
ON notifications(related_record_id, related_record_type);

-- Add comment for documentation
COMMENT ON COLUMN notifications.related_record_id IS 'UUID of the related record (e.g., project_id, rating_id)';
COMMENT ON COLUMN notifications.related_record_type IS 'Type of related record (e.g., project, rating, approval)';
COMMENT ON COLUMN notifications.related_record_route IS 'Route to navigate to when viewing the related record';