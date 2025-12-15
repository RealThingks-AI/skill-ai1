-- Fix RLS policies to allow managers and admins to update tech lead assignments

-- Drop the existing policy that has incorrect role checking
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Create new policies with correct role checking from profiles table
CREATE POLICY "Admins and managers can manage profiles" 
ON public.profiles 
FOR ALL
USING (
  -- Allow admins and managers to manage all profiles
  EXISTS (
    SELECT 1 
    FROM public.profiles manager_profile 
    WHERE manager_profile.user_id = auth.uid() 
    AND manager_profile.role IN ('admin', 'manager')
  )
  OR 
  -- Allow users to manage their own profile
  auth.uid() = user_id
)
WITH CHECK (
  -- Same conditions for WITH CHECK
  EXISTS (
    SELECT 1 
    FROM public.profiles manager_profile 
    WHERE manager_profile.user_id = auth.uid() 
    AND manager_profile.role IN ('admin', 'manager')
  )
  OR 
  auth.uid() = user_id
);

-- Also update the existing "Users can update their own profile" policy to not conflict
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- The new comprehensive policy above covers both admin/manager access and self-update