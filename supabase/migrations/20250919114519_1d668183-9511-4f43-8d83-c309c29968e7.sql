-- Fix critical security issue: Remove public access to profiles table
-- and ensure only authenticated users can view employee information

-- Drop the overly permissive policies that allow unauthenticated access
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a secure policy that only allows authenticated users to view profiles
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Ensure the policy for users viewing their own data is properly scoped
-- (This policy already exists and is secure, but let's make it explicit)
-- Users can still update their own profiles
-- Admins and managers can still update profiles as needed
-- The insert policy remains secure (users can only insert their own profile)

-- Add a comment to document this security fix
COMMENT ON POLICY "Authenticated users can view profiles" ON public.profiles 
IS 'Security fix: Restricts profile viewing to authenticated users only, preventing unauthorized access to employee personal information';