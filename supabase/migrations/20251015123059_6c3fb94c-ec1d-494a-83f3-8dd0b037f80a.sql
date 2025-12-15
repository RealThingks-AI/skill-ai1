-- Fix: add admin SELECT policy for user_category_preferences
ALTER TABLE public.user_category_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = 'Admins can view all category preferences'
      AND schemaname = 'public' AND tablename = 'user_category_preferences'
  ) THEN
    DROP POLICY "Admins can view all category preferences" ON public.user_category_preferences;
  END IF;
END $$;

CREATE POLICY "Admins can view all category preferences"
ON public.user_category_preferences
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
