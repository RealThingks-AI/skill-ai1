-- Create function to automatically update goal progress when user skills are updated
CREATE OR REPLACE FUNCTION public.update_goal_progress_on_skill_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only proceed if the rating was actually changed and approved
  IF TG_OP = 'UPDATE' AND OLD.rating != NEW.rating AND NEW.status = 'approved' THEN
    -- Update all active goals for this user-skill combination
    UPDATE personal_goals 
    SET 
      current_rating = NEW.rating,
      progress_percentage = calculate_goal_progress(NEW.rating, target_rating),
      status = CASE 
        WHEN calculate_goal_progress(NEW.rating, target_rating) >= 100 THEN 'completed'
        WHEN target_date < CURRENT_DATE THEN 'overdue'
        ELSE 'active'
      END,
      completed_at = CASE 
        WHEN calculate_goal_progress(NEW.rating, target_rating) >= 100 THEN now()
        ELSE completed_at
      END,
      updated_at = now()
    WHERE user_id = NEW.user_id 
      AND skill_id = NEW.skill_id 
      AND status IN ('active', 'overdue');
    
    -- Insert progress history for updated goals
    INSERT INTO goal_progress_history (goal_id, previous_rating, new_rating, progress_percentage, notes)
    SELECT 
      id,
      OLD.rating,
      NEW.rating,
      calculate_goal_progress(NEW.rating, target_rating),
      'Automatically updated from skill rating approval'
    FROM personal_goals 
    WHERE user_id = NEW.user_id 
      AND skill_id = NEW.skill_id 
      AND status IN ('active', 'completed', 'overdue');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update goal progress when user skills change
CREATE TRIGGER update_goal_progress_trigger
AFTER UPDATE ON public.user_skills
FOR EACH ROW
EXECUTE FUNCTION public.update_goal_progress_on_skill_change();

-- Create function to send goal reminder notifications
CREATE OR REPLACE FUNCTION public.send_goal_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Send reminders for goals due in 7 days
  INSERT INTO notifications (user_id, title, message, type)
  SELECT 
    user_id,
    'Goal Reminder',
    'Your goal "' || s.name || '" is due in 7 days! Keep pushing forward!',
    'info'
  FROM personal_goals pg
  JOIN skills s ON pg.skill_id = s.id
  WHERE pg.status = 'active'
    AND pg.target_date = CURRENT_DATE + INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.user_id = pg.user_id 
        AND n.title = 'Goal Reminder'
        AND n.created_at::date = CURRENT_DATE
        AND n.message LIKE '%' || s.name || '%'
    );
  
  -- Send notifications for 80% progress milestone
  INSERT INTO notifications (user_id, title, message, type)
  SELECT DISTINCT
    pg.user_id,
    'Progress Milestone!',
    'Amazing! You''ve reached 80% progress on your "' || s.name || '" goal! 🚀',
    'success'
  FROM personal_goals pg
  JOIN skills s ON pg.skill_id = s.id
  WHERE pg.status = 'active'
    AND pg.progress_percentage >= 80
    AND NOT EXISTS (
      SELECT 1 FROM notifications n 
      WHERE n.user_id = pg.user_id 
        AND n.title = 'Progress Milestone!'
        AND n.created_at::date = CURRENT_DATE
        AND n.message LIKE '%' || s.name || '%'
    );
END;
$$;

-- Create function to clean up completed notifications (optional, for performance)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM notifications 
  WHERE read = true 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
  -- Delete unread notifications older than 90 days
  DELETE FROM notifications 
  WHERE read = false 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
END;
$$;