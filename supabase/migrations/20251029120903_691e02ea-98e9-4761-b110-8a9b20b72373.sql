
-- Delete employee_ratings records where approved_by references non-existent users
DELETE FROM employee_ratings
WHERE approved_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE profiles.user_id = employee_ratings.approved_by
  );
