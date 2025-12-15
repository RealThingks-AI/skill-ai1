import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { SkillCategory, Skill, Subskill } from '@/types/database';
import { fetchAllRows } from '@/utils/supabasePagination';
import { classificationRulesService, ClassificationRule } from '../services/classificationRulesService';
import { classificationEngine } from '../utils/classificationEngine';

interface EmployeeRating {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id: string | null;
  rating: 'high' | 'medium' | 'low';
  status: 'submitted' | 'approved' | 'rejected';
  created_at: string;
}

interface UserProfile {
  user_id: string;
  full_name: string;
  email: string;
}

type UserClassification = 'expert' | 'intermediate' | 'beginner';

interface UserSkillDetail {
  skillId: string;
  skillName: string;
  classification: UserClassification;
  subskills: {
    subskillId: string;
    subskillName: string;
    rating: 'high' | 'medium' | 'low';
  }[];
}

interface ClassifiedUser {
  userId: string;
  fullName: string;
  email: string;
  classification: UserClassification;
  percentage: number;
  skills: UserSkillDetail[];
}

interface DashboardCategoryStats {
  id: string;
  name: string;
  description: string | null;
  expertUsers: ClassifiedUser[];
  intermediateUsers: ClassifiedUser[];
  beginnerUsers: ClassifiedUser[];
  skillCount: number;
}

export const useDashboardData = () => {
  const [categories, setCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subskills, setSubskills] = useState<Subskill[]>([]);
  const [allRatings, setAllRatings] = useState<EmployeeRating[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);

      console.log('📊 Starting Dashboard data fetch with pagination...');

      // Fetch all categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('skill_categories')
        .select('*')
        .order('name');

      if (categoriesError) throw categoriesError;

      // Fetch all skills
      const { data: skillsData, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .order('name');

      if (skillsError) throw skillsError;

      // Fetch all subskills
      const { data: subskillsData, error: subskillsError } = await supabase
        .from('subskills')
        .select('*')
        .order('name');

      if (subskillsError) throw subskillsError;

      // Fetch ALL approved employee ratings using pagination
      console.log('📥 Fetching ALL approved ratings with pagination...');
      const { data: ratingsData, error: ratingsError } = await fetchAllRows<EmployeeRating>(
        supabase
          .from('employee_ratings')
          .select('id, user_id, skill_id, subskill_id, rating, status, created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        1000
      );

      if (ratingsError) {
        console.error('❌ Error fetching ratings:', ratingsError);
        throw ratingsError;
      }

      console.log(`✅ Fetched ${ratingsData?.length || 0} total approved ratings`);

      // Fetch all user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email');

      if (profilesError) throw profilesError;

      // Fetch classification rules
      await classificationRulesService.initializeDefaults();
      const rulesData = await classificationRulesService.fetchAll();
      
      console.log('📋 Fetched classification rules:', rulesData.map(r => `${r.level}: ${r.conditions.length} conditions`));

      setCategories(categoriesData || []);
      setSkills(skillsData || []);
      setSubskills(subskillsData || []);
      setAllRatings((ratingsData || []) as EmployeeRating[]);
      setProfiles((profilesData || []) as UserProfile[]);
      setClassificationRules(rulesData || []);

      console.log('✅ Dashboard data fetch complete - Rules updated:', rulesData.length, 'rules');
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Set up real-time subscriptions for automatic updates
    const ratingsChannel = supabase
      .channel('dashboard-ratings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'employee_ratings'
        },
        (payload) => {
          console.log('📡 Real-time: employee_ratings changed, refreshing dashboard...', payload);
          fetchData();
        }
      )
      .subscribe();

    const profilesChannel = supabase
      .channel('dashboard-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          console.log('📡 Real-time: profiles changed, refreshing dashboard...', payload);
          fetchData();
        }
      )
      .subscribe();

    const rulesChannel = supabase
      .channel('dashboard-rules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classification_rules'
        },
        (payload) => {
          console.log('📡 Real-time: classification_rules changed, refreshing dashboard...', payload);
          fetchData();
        }
      )
      .subscribe();

    // Clean up subscriptions on unmount
    return () => {
      supabase.removeChannel(ratingsChannel);
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rulesChannel);
    };
  }, []);

  // Calculate user classifications for each category
  const categoryStats = useMemo<DashboardCategoryStats[]>(() => {
    if (classificationRules.length === 0) {
      console.log('⏳ Waiting for classification rules to load...');
      return [];
    }
    console.log('🔄 Dashboard: Recalculating category stats with', classificationRules.length, 'classification rules');
    return categories.map((category) => {
      const categorySkills = skills.filter((s) => s.category_id === category.id);
      
      // Get all unique users who have ratings in this category
      const userIds = new Set<string>();
      categorySkills.forEach(skill => {
        const skillSubskills = subskills.filter(sub => sub.skill_id === skill.id);
        skillSubskills.forEach(subskill => {
          allRatings
            .filter(r => r.subskill_id === subskill.id)
            .forEach(r => userIds.add(r.user_id));
        });
      });

      // Classify each user for this category
      const classifiedUsers: ClassifiedUser[] = [];
      
      userIds.forEach(userId => {
        const profile = profiles.find(p => p.user_id === userId);
        if (!profile) return;

        const userSkills: UserSkillDetail[] = [];

        // Calculate classification for each skill in this category
        categorySkills.forEach(skill => {
          const skillSubskills = subskills.filter(sub => sub.skill_id === skill.id);
          
          // Only process skills that have subskills
          if (skillSubskills.length > 0) {
            const totalSubskillCount = skillSubskills.length;
            let highCount = 0;
            let mediumCount = 0;
            let lowCount = 0;
            const userSubskills: UserSkillDetail['subskills'] = [];

            skillSubskills.forEach(subskill => {
              const rating = allRatings.find(
                r => r.subskill_id === subskill.id && r.user_id === userId
              );
              if (rating) {
                if (rating.rating === 'high') highCount++;
                else if (rating.rating === 'medium') mediumCount++;
                else if (rating.rating === 'low') lowCount++;
                
                userSubskills.push({
                  subskillId: subskill.id,
                  subskillName: subskill.name,
                  rating: rating.rating
                });
              }
            });

            // Only include skill if user has rated at least one subskill
            if (userSubskills.length > 0) {
              // Calculate percentages for skill-level classification
              // Skill-Level Classification: Use dynamic classification engine
              // highCount = subskills rated "high"
              // mediumCount = subskills rated "medium"  
              // lowCount = subskills rated "low"
              const skillClassification = classificationEngine.classify(
                highCount,
                mediumCount,
                lowCount,
                totalSubskillCount,
                classificationRules
              );
              
              console.log(`  📊 Dashboard - Skill: ${skill.name} | User: ${profile.full_name} | H:${highCount}(${((highCount/totalSubskillCount)*100).toFixed(1)}%) M:${mediumCount} L:${lowCount} Total:${totalSubskillCount} → ${skillClassification}`);

              userSkills.push({
                skillId: skill.id,
                skillName: skill.name,
                classification: skillClassification,
                subskills: userSubskills
              });
            }
          }
        });

        if (userSkills.length > 0) {
          // Category-level classification: Apply same logic over all skills in category
          const totalSkillsInCategory = userSkills.length;
          const expertSkillCount = userSkills.filter(s => s.classification === 'expert').length;
          const intermediateSkillCount = userSkills.filter(s => s.classification === 'intermediate').length;
          const beginnerSkillCount = userSkills.filter(s => s.classification === 'beginner').length;
          
          // Category-Level Classification: Use the SAME dynamic classification engine
          // This time: highCount = expert skills, mediumCount = intermediate skills, lowCount = beginner skills
          // The same percentage-based rules apply, ensuring consistency across both levels
          const userClassification = classificationEngine.classify(
            expertSkillCount,
            intermediateSkillCount,
            beginnerSkillCount,
            totalSkillsInCategory,
            classificationRules
          );
          
          console.log(`  🎯 Dashboard - Category: ${category.name} | User: ${profile.full_name} | Expert:${expertSkillCount}(${((expertSkillCount/totalSkillsInCategory)*100).toFixed(1)}%) Intermediate:${intermediateSkillCount} Beginner:${beginnerSkillCount} Total:${totalSkillsInCategory} → ${userClassification}`);
          
          // Calculate percentage based on rated subskills vs total subskills
          const totalSubskillsInCategory = userSkills.reduce(
            (sum, skill) => sum + subskills.filter(sub => sub.skill_id === skill.skillId).length, 
            0
          );
          const ratedSubskillsCount = userSkills.reduce((sum, skill) => sum + skill.subskills.length, 0);
          const percentage = totalSubskillsInCategory > 0 
            ? (ratedSubskillsCount / totalSubskillsInCategory) * 100 
            : 0;

          classifiedUsers.push({
            userId,
            fullName: profile.full_name,
            email: profile.email,
            classification: userClassification,
            percentage,
            skills: userSkills
          });
        }
      });

      // Group users by classification
      const expertUsers = classifiedUsers.filter(u => u.classification === 'expert');
      const intermediateUsers = classifiedUsers.filter(u => u.classification === 'intermediate');
      const beginnerUsers = classifiedUsers.filter(u => u.classification === 'beginner');

      return {
        id: category.id,
        name: category.name,
        description: category.description,
        expertUsers,
        intermediateUsers,
        beginnerUsers,
        skillCount: categorySkills.length,
      };
    });
  }, [categories, skills, subskills, allRatings, profiles, classificationRules]);

  return {
    categoryStats,
    loading,
    refreshData: fetchData,
  };
};
