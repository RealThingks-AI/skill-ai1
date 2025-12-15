-- Update Dashboard route to match the new routing structure
UPDATE public.pages 
SET route = '/dashboard', updated_at = now()
WHERE route = '/' AND name = 'Dashboard';

-- Ensure all page_access records exist for new routes
DO $$
DECLARE
  page_record RECORD;
  role_name TEXT;
BEGIN
  FOR page_record IN SELECT id FROM public.pages LOOP
    FOR role_name IN SELECT unnest(ARRAY['admin', 'management', 'tech_lead', 'employee']) LOOP
      INSERT INTO public.page_access (page_id, role_name, has_access)
      VALUES (page_record.id, role_name, false)
      ON CONFLICT ON CONSTRAINT page_access_page_id_role_name_key DO NOTHING;
    END LOOP;
  END LOOP;
END $$;