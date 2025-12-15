-- Fix RLS policies for employee_ratings to allow resubmission of approved ratings

-- Drop the restrictive UPDATE policy for users
DROP POLICY IF EXISTS "Users can update their own ratings" ON public.employee_ratings;

-- Create new UPDATE policy that allows users to update their own ratings regardless of status
-- This allows resubmitting approved ratings
CREATE POLICY "Users can update their own ratings" 
ON public.employee_ratings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add DELETE policy to allow users to delete their own ratings (needed for cleanup)
CREATE POLICY "Users can delete their own ratings"
ON public.employee_ratings
FOR DELETE
USING (auth.uid() = user_id);