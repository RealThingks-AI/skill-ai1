-- Add pending_changes column to store original values when Tech Lead updates need approval
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS pending_changes jsonb DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.projects.pending_changes IS 'Stores original field values when a Tech Lead update requires approval. Format: { field_name: original_value }';