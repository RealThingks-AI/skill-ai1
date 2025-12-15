-- Backfill all roles from profiles to user_roles (only valid roles)
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, 
  CASE 
    WHEN p.role = 'admin' THEN 'admin'::app_role
    WHEN p.role = 'tech_lead' THEN 'tech_lead'::app_role
    WHEN p.role = 'management' THEN 'management'::app_role
  END as role
FROM public.profiles p
WHERE p.role IN ('admin', 'tech_lead', 'management')
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = p.user_id 
      AND ur.role = CASE 
        WHEN p.role = 'admin' THEN 'admin'::app_role
        WHEN p.role = 'tech_lead' THEN 'tech_lead'::app_role
        WHEN p.role = 'management' THEN 'management'::app_role
      END
  );

-- Update the sync function to handle all roles
CREATE OR REPLACE FUNCTION public.sync_profile_admin_role_to_user_roles()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync any privileged role to user_roles
  IF NEW.role IN ('admin', 'tech_lead', 'management') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (
      NEW.user_id, 
      CASE 
        WHEN NEW.role = 'admin' THEN 'admin'::app_role
        WHEN NEW.role = 'tech_lead' THEN 'tech_lead'::app_role
        WHEN NEW.role = 'management' THEN 'management'::app_role
      END
    )
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;