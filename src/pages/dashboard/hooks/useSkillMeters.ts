import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SkillMeter {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  percentage: number;
  breakdown: {
    high: number;
    medium: number;
    low: number;
    unrated: number;
    total: number;
  };
  level: 'expert' | 'on-track' | 'developing';
}

export interface SkillMetersData {
  categoryMeters: SkillMeter[];
  overallGrowth: number;
  totalXP: number;
  xpGained: number;
  badges: string[];
}

export const useSkillMeters = () => {
  const [metersData, setMetersData] = useState<SkillMetersData>({
    categoryMeters: [],
    overallGrowth: 0,
    totalXP: 0,
    xpGained: 0,
    badges: []
  });
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const calculateCategoryMeters = async () => {
    if (!profile?.user_id) return;

    try {
      setLoading(true);

      // Fetch categories with their skills
      const { data: categoriesData } = await supabase
        .from('skill_categories')
        .select('*')
        .order('name');

      const { data: skillsData } = await supabase
        .from('skills')
        .select('*');

      const { data: subskillsData } = await supabase
        .from('subskills')
        .select('*');

      // Fetch user's approved ratings
      const { data: ratingsData } = await supabase
        .from('employee_ratings')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'approved');

      const categoryMeters: SkillMeter[] = [];
      let totalCategoryPercentage = 0;
      let totalXPGained = 0;
      const earnedBadges: string[] = [];

      for (const category of categoriesData || []) {
        const categorySkills = skillsData?.filter(s => s.category_id === category.id) || [];
        
        // Collect all rating units for this category
        const ratingUnits: Array<{ id: string; type: 'skill' | 'subskill'; rating?: 'high' | 'medium' | 'low' }> = [];
        
        for (const skill of categorySkills) {
          const skillSubskills = subskillsData?.filter(ss => ss.skill_id === skill.id) || [];
          
          if (skillSubskills.length > 0) {
            // Use subskills as rating units
            skillSubskills.forEach(subskill => {
              const rating = ratingsData?.find(r => r.subskill_id === subskill.id);
              ratingUnits.push({
                id: subskill.id,
                type: 'subskill',
                rating: rating?.rating as 'high' | 'medium' | 'low' | undefined
              });
            });
          } else {
            // Use skill itself as rating unit
            const rating = ratingsData?.find(r => r.skill_id === skill.id && !r.subskill_id);
            ratingUnits.push({
              id: skill.id,
              type: 'skill',
              rating: rating?.rating as 'high' | 'medium' | 'low' | undefined
            });
          }
        }

        // Calculate scores
        const breakdown = {
          high: ratingUnits.filter(unit => unit.rating === 'high').length,
          medium: ratingUnits.filter(unit => unit.rating === 'medium').length,
          low: ratingUnits.filter(unit => unit.rating === 'low').length,
          unrated: ratingUnits.filter(unit => !unit.rating).length,
          total: ratingUnits.length
        };

        // Calculate percentage using points-based scoring (as per new rules)
        // Points: High=5, Medium=3, Low=1
        // Percentage = (User points ÷ Max possible points) × 100
        const userPoints = breakdown.high * 5 + breakdown.medium * 3 + breakdown.low * 1;
        const maxPossiblePoints = breakdown.total * 5; // All items could be rated High (5 points each)
        const percentage = breakdown.total > 0 ? Math.round((userPoints / maxPossiblePoints) * 100) : 0;

        // Calculate XP based on ratings (High=5, Medium=3, Low=1)
        const categoryXP = breakdown.high * 5 + breakdown.medium * 3 + breakdown.low * 1;
        totalXPGained += categoryXP;

        // Determine level
        let level: 'expert' | 'on-track' | 'developing' = 'developing';
        if (percentage >= 80) {
          level = 'expert';
          if (percentage === 100) {
            totalXPGained += 50; // 100% completion bonus
            earnedBadges.push(`${category.name} Champion`);
          }
        } else if (percentage >= 60) {
          level = 'on-track';
        }

        categoryMeters.push({
          categoryId: category.id,
          categoryName: category.name,
          categoryColor: category.color || '#3B82F6',
          percentage,
          breakdown,
          level
        });

        totalCategoryPercentage += percentage;
      }

      // Calculate overall growth (weighted by total items per category)
      let totalItems = 0;
      let totalRatedItems = 0;
      
      categoryMeters.forEach(meter => {
        totalItems += meter.breakdown.total;
        totalRatedItems += meter.breakdown.high + meter.breakdown.medium + meter.breakdown.low;
      });
      
      const overallGrowth = totalItems > 0 
        ? Math.round((totalRatedItems / totalItems) * 100) 
        : 0;

      // Award overall skill master badge
      if (overallGrowth >= 85) {
        earnedBadges.push('Skill Master');
        totalXPGained += 100;
      }

      // Award multi-category badge
      const onTrackCategories = categoryMeters.filter(m => m.percentage >= 50).length;
      if (onTrackCategories >= 3) {
        earnedBadges.push('Multi-Skilled');
        totalXPGained += 25;
      }

      // Update or create user gamification record
      await updateGamificationData(totalXPGained, earnedBadges);

      // Get current XP from database
      const { data: gamificationData } = await supabase
        .from('user_gamification')
        .select('total_xp')
        .eq('user_id', profile.user_id)
        .single();

      setMetersData({
        categoryMeters,
        overallGrowth,
        totalXP: gamificationData?.total_xp || 0,
        xpGained: totalXPGained,
        badges: earnedBadges
      });

      // Send notifications for new achievements
      if (earnedBadges.length > 0) {
        await sendAchievementNotifications(earnedBadges, totalXPGained);
      }

    } catch (error) {
      console.error('Error calculating skill meters:', error);
      toast({
        title: "Error",
        description: "Failed to load skill meters",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGamificationData = async (xpGained: number, badges: string[]) => {
    if (!profile?.user_id || xpGained === 0) return;

    try {
      // Update user gamification with new XP
      const { data: currentData } = await supabase
        .from('user_gamification')
        .select('*')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      const newTotalXP = (currentData?.total_xp || 0) + xpGained;
      const newLevel = Math.floor(newTotalXP / 100) + 1; // Level up every 100 XP

      await supabase
        .from('user_gamification')
        .upsert({
          user_id: profile.user_id,
          total_xp: newTotalXP,
          level: newLevel,
          updated_at: new Date().toISOString()
        });

      // Record achievements
      for (const badge of badges) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: profile.user_id,
            achievement_type: 'skill_progress',
            achievement_name: badge,
            description: `Earned for skill category progress`,
            badge_icon: getBadgeIcon(badge)
          });
      }
    } catch (error) {
      console.error('Error updating gamification data:', error);
    }
  };

  const sendAchievementNotifications = async (badges: string[], xpGained: number) => {
    if (!profile?.user_id) return;

    try {
      for (const badge of badges) {
        await supabase
          .from('notifications')
          .insert({
            user_id: profile.user_id,
            title: '🏆 Achievement Unlocked!',
            message: `You earned the "${badge}" badge and +${xpGained} XP!`,
            type: 'success'
          });
      }
    } catch (error) {
      console.error('Error sending achievement notifications:', error);
    }
  };

  const getBadgeIcon = (badge: string): string => {
    if (badge.includes('Champion')) return '🏆';
    if (badge.includes('Master')) return '👑';
    if (badge.includes('Multi-Skilled')) return '🎯';
    return '⭐';
  };

  useEffect(() => {
    if (profile?.user_id) {
      calculateCategoryMeters();
    }
  }, [profile]);

  return {
    metersData,
    loading,
    refreshMeters: calculateCategoryMeters
  };
};