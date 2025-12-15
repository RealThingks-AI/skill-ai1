-- Allow admins and management to delete any employee ratings
CREATE POLICY "Admins can delete any ratings"
ON employee_ratings
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'management'::app_role)
);