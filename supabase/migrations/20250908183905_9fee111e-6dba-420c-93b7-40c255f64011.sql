-- Fix search path security warning by updating the function
CREATE OR REPLACE FUNCTION public.update_leaderboard_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week_start DATE;
BEGIN
  -- Get Monday of current week
  current_week_start := date_trunc('week', CURRENT_DATE)::DATE;
  
  -- Check if we already have data for this week
  IF EXISTS (
    SELECT 1 FROM public.leaderboard_history 
    WHERE week_start_date = current_week_start
  ) THEN
    RETURN;
  END IF;
  
  -- Insert current leaderboard rankings for this week
  WITH ranked_users AS (
    SELECT 
      ug.user_id,
      ug.total_xp,
      ROW_NUMBER() OVER (ORDER BY ug.total_xp DESC) as rank_position
    FROM public.user_gamification ug
    WHERE ug.total_xp > 0
  )
  INSERT INTO public.leaderboard_history (user_id, rank_position, total_xp, week_start_date)
  SELECT user_id, rank_position, total_xp, current_week_start
  FROM ranked_users;
END;
$$;