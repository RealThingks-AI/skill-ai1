-- Create personal_goals table
CREATE TABLE public.personal_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_id UUID NOT NULL,
  target_rating TEXT NOT NULL CHECK (target_rating IN ('high', 'medium', 'low')),
  current_rating TEXT DEFAULT 'low' CHECK (current_rating IN ('high', 'medium', 'low')),
  target_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
  motivation_notes TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table for badges and accomplishments
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  goal_id UUID,
  metadata JSONB
);

-- Create user_gamification table for XP and streaks
CREATE TABLE public.user_gamification (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  goals_set_count INTEGER DEFAULT 0,
  goals_achieved_count INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_goal_achieved_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal_progress_history table for tracking progress over time
CREATE TABLE public.goal_progress_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID NOT NULL,
  previous_rating TEXT,
  new_rating TEXT NOT NULL CHECK (new_rating IN ('high', 'medium', 'low')),
  progress_percentage INTEGER NOT NULL,
  milestone_reached TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.personal_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personal_goals
CREATE POLICY "Users can manage their own goals"
ON public.personal_goals
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Tech leads and management can view team goals"
ON public.personal_goals
FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('tech_lead', 'management', 'admin')
  )
);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Tech leads can view team achievements"
ON public.user_achievements
FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('tech_lead', 'management', 'admin')
  )
);

-- RLS Policies for user_gamification
CREATE POLICY "Users can view their own gamification data"
ON public.user_gamification
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own gamification data"
ON public.user_gamification
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for goal_progress_history
CREATE POLICY "Users can view their own goal progress"
ON public.goal_progress_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM personal_goals 
    WHERE id = goal_id AND user_id = auth.uid()
  )
);

CREATE POLICY "System can insert progress records"
ON public.goal_progress_history
FOR INSERT
WITH CHECK (true);

-- Create triggers for updated_at columns
CREATE TRIGGER update_personal_goals_updated_at
BEFORE UPDATE ON public.personal_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_gamification_updated_at
BEFORE UPDATE ON public.user_gamification
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate goal progress percentage
CREATE OR REPLACE FUNCTION public.calculate_goal_progress(
  current_rating_param TEXT,
  target_rating_param TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_value INTEGER;
  target_value INTEGER;
BEGIN
  -- Convert ratings to numeric values (low=1, medium=2, high=3)
  current_value := CASE 
    WHEN current_rating_param = 'low' THEN 1
    WHEN current_rating_param = 'medium' THEN 2
    WHEN current_rating_param = 'high' THEN 3
    ELSE 1
  END;
  
  target_value := CASE 
    WHEN target_rating_param = 'low' THEN 1
    WHEN target_rating_param = 'medium' THEN 2
    WHEN target_rating_param = 'high' THEN 3
    ELSE 3
  END;
  
  -- Calculate percentage (ensure we don't exceed 100%)
  RETURN LEAST(100, ROUND((current_value::FLOAT / target_value::FLOAT) * 100));
END;
$$;

-- Create function to award XP and handle achievements
CREATE OR REPLACE FUNCTION public.award_goal_xp_and_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award XP for setting a goal (only on INSERT)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_gamification (user_id, total_xp, goals_set_count)
    VALUES (NEW.user_id, 10, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_xp = user_gamification.total_xp + 10,
      goals_set_count = user_gamification.goals_set_count + 1,
      updated_at = now();
  END IF;
  
  -- Handle goal completion
  IF TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Award XP for completing goal
    UPDATE user_gamification 
    SET 
      total_xp = total_xp + 50,
      goals_achieved_count = goals_achieved_count + 1,
      current_streak = current_streak + 1,
      best_streak = GREATEST(best_streak, current_streak + 1),
      last_goal_achieved_date = CURRENT_DATE,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
    -- Award "Goal Achiever" badge
    INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, badge_icon, goal_id)
    VALUES (
      NEW.user_id, 
      'goal_completion', 
      'Goal Achiever', 
      'Completed a personal skill goal on time!', 
      '🎯', 
      NEW.id
    );
    
    -- Check for streak achievements
    DECLARE
      current_streak_count INTEGER;
    BEGIN
      SELECT current_streak INTO current_streak_count
      FROM user_gamification 
      WHERE user_id = NEW.user_id;
      
      -- Award streak badges
      IF current_streak_count = 3 THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, badge_icon)
        VALUES (NEW.user_id, 'streak', 'On Fire', 'Completed 3 goals in a row!', '🔥');
      ELSIF current_streak_count = 5 THEN
        INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, badge_icon)
        VALUES (NEW.user_id, 'streak', 'Unstoppable', 'Completed 5 goals in a row!', '⚡');
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for XP and achievements
CREATE TRIGGER goal_xp_achievements_trigger
AFTER INSERT OR UPDATE ON public.personal_goals
FOR EACH ROW
EXECUTE FUNCTION public.award_goal_xp_and_achievements();