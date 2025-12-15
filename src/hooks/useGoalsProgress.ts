import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import type { PersonalGoal, UserSkill, UserGamification } from '@/types/database';

export const useGoalsProgress = () => {
  const [goals, setGoals] = useState<PersonalGoal[]>([]);
  const [gamification, setGamification] = useState<UserGamification | null>(null);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile?.user_id) {
      fetchGoalsData();
      setupRealTimeSubscription();
    }
  }, [profile]);

  const fetchGoalsData = async () => {
    if (!profile?.user_id) return;
    
    try {
      setLoading(true);
      
      // Fetch personal goals first
      const { data: goalsData, error: goalsError } = await supabase
        .from('personal_goals')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false });
      
      if (goalsError) {
        console.error('Error fetching goals:', goalsError);
      }

      // Fetch skills separately to avoid relation issues
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*');
      
      // Fetch or create gamification data
      let { data: gamificationData } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();
      
      if (!gamificationData) {
        const { data: newGamificationData } = await supabase
          .from('user_gamification')
          .insert({ user_id: profile.user_id })
          .select()
          .single();
        gamificationData = newGamificationData;
      }
      
      // Map goals with skills and proper typing
      const goalsWithSkills = (goalsData || []).map(goal => {
        const skill = skillsData?.find(s => s.id === goal.skill_id);
        return {
          ...goal,
          target_rating: goal.target_rating as 'high' | 'medium' | 'low',
          current_rating: goal.current_rating as 'high' | 'medium' | 'low',
          status: goal.status as 'active' | 'completed' | 'overdue' | 'cancelled',
          skill: skill ? {
            id: skill.id,
            category_id: skill.category_id,
            name: skill.name,
            description: skill.description,
            created_at: skill.created_at
          } : undefined
        };
      });
      
      setGoals(goalsWithSkills as PersonalGoal[]);
      setGamification(gamificationData);
      
    } catch (error) {
      console.error('Error fetching goals data:', error);
      toast({
        title: "Error",
        description: "Failed to load goals data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    if (!profile?.user_id) return;

    // Subscribe to goal updates
    const goalsSubscription = supabase
      .channel('personal_goals_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'personal_goals',
          filter: `user_id=eq.${profile.user_id}`
        }, 
        (payload) => {
          console.log('Goals change received:', payload);
          fetchGoalsData();
        }
      )
      .subscribe();

    // Subscribe to gamification updates
    const gamificationSubscription = supabase
      .channel('user_gamification_changes')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_gamification',
          filter: `user_id=eq.${profile.user_id}`
        },
        (payload) => {
          console.log('Gamification change received:', payload);
          fetchGoalsData();
        }
      )
      .subscribe();

    return () => {
      goalsSubscription.unsubscribe();
      gamificationSubscription.unsubscribe();
    };
  };

  const updateGoalProgress = async (goalId: string, newRating: 'high' | 'medium' | 'low') => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      // Calculate new progress percentage
      const ratingValues = { low: 1, medium: 2, high: 3 };
      const currentValue = ratingValues[newRating];
      const targetValue = ratingValues[goal.target_rating];
      const newProgress = Math.min(100, Math.round((currentValue / targetValue) * 100));
      
      // Check if goal is completed
      const isCompleted = newProgress >= 100;
      const status = isCompleted ? 'completed' : 'active';

      const { error } = await supabase
        .from('personal_goals')
        .update({
          current_rating: newRating,
          progress_percentage: newProgress,
          status,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', goalId);

      if (error) throw error;

      // Insert progress history
      await supabase
        .from('goal_progress_history')
        .insert({
          goal_id: goalId,
          previous_rating: goal.current_rating,
          new_rating: newRating,
          progress_percentage: newProgress,
          milestone_reached: newProgress >= 100 ? 'completed' : 
                           newProgress >= 80 ? '80_percent' : 
                           newProgress >= 50 ? '50_percent' : null,
          notes: `Rating updated from ${goal.current_rating} to ${newRating}`
        });

      if (isCompleted) {
        toast({
          title: "🎉 Goal Completed!",
          description: `Congratulations! You've achieved your ${goal.skill?.name} goal! +50 XP awarded`,
        });
      } else if (newProgress >= 80 && goal.progress_percentage < 80) {
        toast({
          title: "🚀 80% Progress!",
          description: "You're almost there! Keep up the great work!",
        });
      }

      fetchGoalsData();
    } catch (error) {
      console.error('Error updating goal progress:', error);
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
    }
  };

  const checkAndUpdateOverdueGoals = async () => {
    if (!profile?.user_id) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('personal_goals')
        .update({ status: 'overdue' })
        .eq('user_id', profile.user_id)
        .eq('status', 'active')
        .lt('target_date', today);

      if (error) throw error;
      
      fetchGoalsData();
    } catch (error) {
      console.error('Error updating overdue goals:', error);
    }
  };

  // Check for overdue goals on component mount
  useEffect(() => {
    if (goals.length > 0) {
      checkAndUpdateOverdueGoals();
    }
  }, [goals.length]);

  return {
    goals,
    gamification,
    loading,
    updateGoalProgress,
    refreshGoals: fetchGoalsData
  };
};