-- Drop existing function to recreate with correct signature
DROP FUNCTION IF EXISTS public.get_project_member_allocations(UUID);

-- Create function to upsert member monthly allocation
CREATE OR REPLACE FUNCTION public.upsert_member_monthly_allocation(
  p_project_id UUID,
  p_user_id UUID,
  p_month TEXT,
  p_allocation_percentage INTEGER
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.project_member_monthly_allocations (project_id, user_id, month, allocation_percentage)
  VALUES (p_project_id, p_user_id, p_month, p_allocation_percentage)
  ON CONFLICT (project_id, user_id, month) 
  DO UPDATE SET 
    allocation_percentage = EXCLUDED.allocation_percentage,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to delete user project allocations
CREATE OR REPLACE FUNCTION public.delete_user_project_allocations(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.project_member_monthly_allocations 
  WHERE project_id = p_project_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to delete member monthly allocation for a specific month
CREATE OR REPLACE FUNCTION public.delete_member_monthly_allocation(
  p_project_id UUID,
  p_user_id UUID,
  p_month TEXT
)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.project_member_monthly_allocations 
  WHERE project_id = p_project_id AND user_id = p_user_id AND month = p_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to get project member allocations
CREATE OR REPLACE FUNCTION public.get_project_member_allocations(p_project_id UUID)
RETURNS TABLE (
  user_id UUID,
  month TEXT,
  allocation_percentage INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pma.user_id,
    pma.month,
    pma.allocation_percentage::INTEGER
  FROM public.project_member_monthly_allocations pma
  WHERE pma.project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to delete all project member allocations
CREATE OR REPLACE FUNCTION public.delete_project_member_allocations(p_project_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.project_member_monthly_allocations 
  WHERE project_id = p_project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add unique constraint if not exists to enable upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'project_member_monthly_allocations_unique'
  ) THEN
    ALTER TABLE public.project_member_monthly_allocations 
    ADD CONSTRAINT project_member_monthly_allocations_unique 
    UNIQUE (project_id, user_id, month);
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;