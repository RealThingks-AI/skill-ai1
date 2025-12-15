-- Create leaderboard history table to track rank changes over time
CREATE TABLE public.leaderboard_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rank_position INTEGER NOT NULL,
  total_xp INTEGER NOT NULL,
  week_start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leaderboard_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view leaderboard history" 
ON public.leaderboard_history 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert leaderboard history" 
ON public.leaderboard_history 
FOR INSERT 
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_leaderboard_history_user_week ON public.leaderboard_history(user_id, week_start_date DESC);
CREATE INDEX idx_leaderboard_history_week_rank ON public.leaderboard_history(week_start_date DESC, rank_position);

-- Create function to calculate and store weekly leaderboard snapshots
CREATE OR REPLACE FUNCTION public.update_leaderboard_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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