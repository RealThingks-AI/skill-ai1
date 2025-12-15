import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { SkillCategory, Skill, Subskill, UserSkill, EmployeeRating } from "@/types/database";
import { fetchAllRows } from "@/utils/supabasePagination";

export const useSkills = () => {
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subskills, setSubskills] = useState<Subskill[]>([]);
  const [userSkills, setUserSkills] = useState<EmployeeRating[]>([]);
  const [pendingRatings, setPendingRatings] = useState<Map<string, { type: 'skill' | 'subskill', id: string, rating: 'high' | 'medium' | 'low' }>>(new Map());
  const [loading, setLoading] = useState(true);
  
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchData = async (showLoading = false) => {
    if (!profile) return;
    
    try {
      if (showLoading) setLoading(true);
      console.log('🔍 Fetching data for user:', profile.user_id);

      // Fetch skill categories
      const { data: categoriesData } = await supabase
        .from('skill_categories')
        .select('*')
        .order('name');
      
      console.log('📊 Fetched categories count:', categoriesData?.length);

      // Fetch skills
      const { data: skillsData } = await supabase
        .from('skills')
        .select('*')
        .order('name');

      // Fetch subskills
      const { data: subskillsData } = await supabase
        .from('subskills' as any)
        .select('*')
        .order('name');

      // Fetch employee ratings based on role
      // Admins and Management: See ALL users' data for oversight
      // Employees and Tech Leads: See only their own data
      let userSkillsData: any[] = [];
      if (profile.user_id) {
        console.log('📊 Fetching employee ratings for user:', profile.user_id, 'role:', profile.role);
        
        let allRatingsData: any[] = [];
        
        // Check if user is admin or management - they can see all data
        const canSeeAllData = ['admin', 'management'].includes(profile.role || '');
        
        if (canSeeAllData) {
          // Fetch ALL ratings for admins and management
          console.log('🔑 Admin/Management user - fetching all employee ratings');
          
          const { data: ratingsData, error: ratingsError } = await fetchAllRows(
            supabase
              .from('employee_ratings')
              .select('*')
              .order('created_at', { ascending: false })
          );
          
          if (ratingsError) {
            console.error('❌ Error fetching all ratings:', ratingsError);
          } else {
            allRatingsData = ratingsData || [];
            console.log('✅ Total ratings fetched for admin/management:', allRatingsData.length);
          }
        } else {
          // Fetch only current user's ratings for employees and tech leads
          console.log('👤 Regular user - fetching own ratings only');
          const { data: ratingsData, error: ratingsError } = await supabase
            .from('employee_ratings')
            .select('*')
            .eq('user_id', profile.user_id)
            .order('created_at', { ascending: false });
          
          if (ratingsError) {
            console.error('❌ Error fetching user ratings:', ratingsError);
          } else {
            allRatingsData = ratingsData || [];
            console.log('📊 User ratings fetched:', allRatingsData.length);
          }
        }
        
        console.log('📊 Raw ratings result:', { count: allRatingsData.length });

        if (allRatingsData && allRatingsData.length > 0) {
          // Get related skills and profiles
          const skillIds = [...new Set(allRatingsData.map(r => r.skill_id))];
          const subskillIds = [...new Set(allRatingsData.map(r => r.subskill_id).filter(Boolean))];
          const approverIds = [...new Set(allRatingsData.map(r => r.approved_by).filter(Boolean))];
          const userIds = [...new Set(allRatingsData.map(r => r.user_id))]; // Add employee IDs

          // Fetch related data
          const [skillsResult, subskillsResult, approverProfilesResult, employeeProfilesResult] = await Promise.all([
            supabase.from('skills').select('*').in('id', skillIds),
            subskillIds.length > 0 ? supabase.from('subskills').select('*').in('id', subskillIds) : Promise.resolve({ data: [] }),
            approverIds.length > 0 ? supabase.from('profiles').select('*').in('user_id', approverIds) : Promise.resolve({ data: [] }),
            supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds) // Fetch employee profiles
          ]);

          // Manually join the data
          userSkillsData = allRatingsData.map(rating => ({
            ...rating,
            skill: skillsResult.data?.find(s => s.id === rating.skill_id),
            subskill: rating.subskill_id ? subskillsResult.data?.find(s => s.id === rating.subskill_id) : null,
            approver: rating.approved_by ? approverProfilesResult.data?.find(p => p.user_id === rating.approved_by) : null,
            profiles: employeeProfilesResult.data?.find(p => p.user_id === rating.user_id), // Add employee profile
            skills: skillsResult.data?.find(s => s.id === rating.skill_id), // Alias for compatibility
            subskills: rating.subskill_id ? subskillsResult.data?.find(s => s.id === rating.subskill_id) : null // Alias for compatibility
          }));
        }
      }

      setSkillCategories(categoriesData || []);
      setSkills(skillsData || []);
      setSubskills(subskillsData as unknown as Subskill[] || []);
      setUserSkills(userSkillsData as EmployeeRating[]);
      console.log('📋 State updated - categories:', categoriesData?.length, 'skills:', skillsData?.length, 'userSkills:', userSkillsData.length);
    } catch (error) {
      console.error('❌ Error fetching skills data:', error);
      toast({
        title: "Error",
        description: "Failed to load skills data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true); // Show loading only on initial mount

    // Set up real-time subscriptions for silent background updates
    const categoriesChannel = supabase
      .channel('skill_categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skill_categories' }, () => {
        console.log('📡 Category change detected - syncing silently');
        fetchData(false); // Silent background update
      })
      .subscribe();

    const skillsChannel = supabase
      .channel('skills_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'skills' }, () => {
        console.log('📡 Skill change detected - syncing silently');
        fetchData(false); // Silent background update
      })
      .subscribe();

    const subskillsChannel = supabase
      .channel('subskills_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subskills' }, () => {
        console.log('📡 Subskill change detected - syncing silently');
        fetchData(false); // Silent background update
      })
      .subscribe();

    const ratingsChannel = supabase
      .channel('employee_ratings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employee_ratings' }, () => {
        console.log('📡 Rating change detected - syncing silently');
        fetchData(false); // Silent background update
      })
      .subscribe();

    return () => {
      supabase.removeChannel(categoriesChannel);
      supabase.removeChannel(skillsChannel);
      supabase.removeChannel(subskillsChannel);
      supabase.removeChannel(ratingsChannel);
    };
  }, [profile]);

  const handleSkillRate = (skillId: string, rating: 'high' | 'medium' | 'low' | null) => {
    if (!profile?.user_id) return;
    
    setPendingRatings(prev => {
      const newRatings = new Map(prev);
      if (rating === null) {
        // Remove the rating if deselected
        newRatings.delete(skillId);
      } else {
        newRatings.set(skillId, { type: 'skill', id: skillId, rating });
      }
      return newRatings;
    });
  };

  const handleSubskillRate = (subskillId: string, rating: 'high' | 'medium' | 'low' | null) => {
    if (!profile?.user_id) return;
    
    setPendingRatings(prev => {
      const newRatings = new Map(prev);
      if (rating === null) {
        // Remove the rating if deselected
        newRatings.delete(subskillId);
      } else {
        newRatings.set(subskillId, { type: 'subskill', id: subskillId, rating });
      }
      return newRatings;
    });
  };

  const handleToggleNA = async (skillId: string, isNA: boolean) => {
    if (!profile?.user_id) return;
    
    try {
      console.log('🔄 Toggling NA status for skill:', skillId, 'to:', isNA);
      
      // Check if rating record exists
      const existingRating = userSkills.find(us => us.skill_id === skillId && !us.subskill_id);
      
      if (existingRating) {
        // Update existing record
        const { error } = await supabase
          .from('employee_ratings')
          .update({ 
            na_status: isNA,
            status: isNA ? 'draft' : existingRating.status
          })
          .eq('id', existingRating.id);
          
        if (error) throw error;
      } else {
        // Create new record with NA status
        const { error } = await supabase
          .from('employee_ratings')
          .insert({
            user_id: profile.user_id,
            skill_id: skillId,
            rating: 'low', // Default rating (required field)
            status: 'draft',
            na_status: isNA
          });
          
        if (error) throw error;
      }
      
      // If marking as NA, remove any pending ratings for this skill and its subskills
      if (isNA) {
        const skillSubskills = subskills.filter(s => s.skill_id === skillId);
        setPendingRatings(prev => {
          const newRatings = new Map(prev);
          newRatings.delete(skillId);
          skillSubskills.forEach(subskill => {
            newRatings.delete(subskill.id);
          });
          return newRatings;
        });
      }
      
      // Refresh data silently
      await fetchData(false);
      
      toast({
        title: isNA ? "Skill marked as NA" : "Skill NA status removed",
        description: isNA ? "This skill and all its subskills are now excluded from progress tracking." : "This skill is now available for rating again."
      });
      
    } catch (error) {
      console.error('❌ Error toggling NA status:', error);
      toast({
        title: "Error",
        description: "Failed to update skill NA status. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSaveRatings = async (ratingsWithComments: Array<{id: string, type: 'skill' | 'subskill', rating: 'high' | 'medium' | 'low', comment: string}>) => {
    if (!profile?.user_id || ratingsWithComments.length === 0) return;

    try {
      console.log('🔄 Saving ratings with comments:', ratingsWithComments);
      console.log('👤 User ID:', profile.user_id);

      // Optimistically update local state so UI reflects the saved items immediately
      setUserSkills(prev => {
        const next = [...prev];
        const nowIso = new Date().toISOString();
        ratingsWithComments.forEach(r => {
          if (r.type === 'skill') {
            const idx = next.findIndex(u => u.user_id === profile.user_id && u.skill_id === r.id && !u.subskill_id);
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                rating: r.rating,
                status: 'submitted',
                self_comment: r.comment,
                submitted_at: nowIso,
              };
            } else {
              next.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                user_id: profile.user_id,
                skill_id: r.id,
                subskill_id: undefined,
                rating: r.rating,
                status: 'submitted',
                self_comment: r.comment,
                created_at: nowIso,
                updated_at: nowIso,
                submitted_at: nowIso,
              } as any);
            }
          } else {
            const sub = subskills.find(s => s.id === r.id);
            if (!sub) return;
            const idx = next.findIndex(u => u.user_id === profile.user_id && u.subskill_id === r.id);
            if (idx >= 0) {
              next[idx] = {
                ...next[idx],
                rating: r.rating,
                status: 'submitted',
                self_comment: r.comment,
                submitted_at: nowIso,
              };
            } else {
              next.push({
                id: `temp-${Date.now()}-${Math.random()}`,
                user_id: profile.user_id,
                skill_id: sub.skill_id,
                subskill_id: r.id,
                rating: r.rating,
                status: 'submitted',
                self_comment: r.comment,
                created_at: nowIso,
                updated_at: nowIso,
                submitted_at: nowIso,
              } as any);
            }
          }
        });
        return next;
      });

      // Step 1: Get category IDs for auto-addition to dashboard
      const categoryIds = new Set<string>();
      for (const rating of ratingsWithComments) {
        if (rating.type === 'skill') {
          const skill = skills.find(s => s.id === rating.id);
          if (skill?.category_id) {
            categoryIds.add(skill.category_id);
            console.log('📂 Found category for skill:', { skillName: skill.name, categoryId: skill.category_id });
          }
        } else {
          const subskill = subskills.find(s => s.id === rating.id);
          if (subskill?.skill_id) {
            const parentSkill = skills.find(s => s.id === subskill.skill_id);
            if (parentSkill?.category_id) {
              categoryIds.add(parentSkill.category_id);
              console.log('📂 Found category for subskill:', { subskillName: subskill.name, skillName: parentSkill.name, categoryId: parentSkill.category_id });
            }
          }
        }
      }

      console.log('📋 Categories to potentially add:', Array.from(categoryIds));

      // Prepare data for UPSERT
      const ratingsData = ratingsWithComments.map(rating => {
        if (rating.type === 'skill') {
          return {
            user_id: profile.user_id,
            skill_id: rating.id,
            subskill_id: null,
            rating: rating.rating,
            status: 'submitted' as const,
            self_comment: rating.comment,
            submitted_at: new Date().toISOString(),
            // Clear approval fields for resubmissions
            approved_by: null,
            approved_at: null,
            approver_comment: null,
            next_upgrade_date: null
          };
        } else {
          // Handle subskill rating
          const subskill = subskills.find(s => s.id === rating.id);
          if (!subskill) return null;

          return {
            user_id: profile.user_id,
            skill_id: subskill.skill_id,
            subskill_id: rating.id,
            rating: rating.rating,
            status: 'submitted' as const,
            self_comment: rating.comment,
            submitted_at: new Date().toISOString(),
            // Clear approval fields for resubmissions
            approved_by: null,
            approved_at: null,
            approver_comment: null,
            next_upgrade_date: null
          };
        }
      }).filter(Boolean);

      console.log('💾 Data to save:', ratingsData);

      // Step 2: Handle existing ratings (archive and delete approved ones)
      const idsToDelete: string[] = [];
      
      for (const rating of ratingsWithComments) {
        // Check for existing rating (both skills and subskills)
        const existingRating = rating.type === 'skill'
          ? userSkills.find(us => us.user_id === profile.user_id && us.skill_id === rating.id && !us.subskill_id)
          : userSkills.find(us => us.user_id === profile.user_id && us.subskill_id === rating.id);

        console.log('🔍 Checking for existing rating:', {
          id: rating.id,
          type: rating.type,
          userId: profile.user_id,
          foundExisting: !!existingRating,
          existingStatus: existingRating?.status,
          existingRating: existingRating?.rating
        });

        if (existingRating) {
          // Archive the old rating to history
          if (rating.type === 'subskill') {
            console.log('📦 Archiving old rating before update:', {
              subskillId: existingRating.subskill_id,
              rating: existingRating.rating,
              status: existingRating.status
            });
            
            const { error: historyError } = await supabase
              .from('subskill_rating_history')
              .insert({
                user_id: existingRating.user_id,
                skill_id: existingRating.skill_id,
                subskill_id: existingRating.subskill_id,
                rating: existingRating.rating,
                self_comment: existingRating.self_comment,
                approver_comment: existingRating.approver_comment,
                approved_by: existingRating.approved_by,
                approved_at: existingRating.approved_at,
                status: existingRating.status,
                archived_at: new Date().toISOString()
              });

            if (historyError) {
              console.error('❌ Failed to archive rating:', historyError);
            } else {
              console.log('✅ Rating archived successfully');
            }
          }
          
          // If rating is approved, we need to DELETE it first (can't UPDATE approved ratings due to RLS)
          if (existingRating.status === 'approved' && existingRating.id) {
            console.log('🗑️ Marking approved rating for deletion:', existingRating.id);
            idsToDelete.push(existingRating.id);
          }
        }
      }

      // Step 3: Delete approved ratings that need to be resubmitted
      if (idsToDelete.length > 0) {
        console.log('🗑️ Deleting approved ratings:', idsToDelete);
        const { error: deleteError } = await supabase
          .from('employee_ratings')
          .delete()
          .in('id', idsToDelete);
        
        if (deleteError) {
          console.error('❌ Failed to delete approved ratings:', deleteError);
          throw deleteError;
        }
        console.log('✅ Deleted approved ratings successfully');
      }

      // Step 4: Upsert all ratings (works for both new and existing after delete)
      const { data, error } = await supabase
        .from('employee_ratings')
        .upsert(ratingsData as any, {
          onConflict: 'user_id,skill_id,subskill_id',
          ignoreDuplicates: false
        })
        .select();

      console.log('✅ Upsert result:', { data, error });

      if (error) throw error;

      // Reconcile local state with server response (replace optimistic rows with actual rows)
      if (data && data.length > 0) {
        setUserSkills(prev => {
          const key = (row: any) => `${row.user_id}-${row.skill_id}-${row.subskill_id || ''}`;
          const incoming = new Map<string, any>();
          (data as any[]).forEach(row => incoming.set(key(row), row));
          const updated = prev.map(item => {
            const match = incoming.get(`${item.user_id}-${item.skill_id}-${item.subskill_id || ''}`);
            return match ? { ...item, ...match } : item;
          });
          // Add any new rows not present previously
          (data as any[]).forEach(row => {
            const exists = updated.some(u => u.user_id === row.user_id && u.skill_id === row.skill_id && (u.subskill_id || null) === (row.subskill_id || null));
            if (!exists) updated.push(row as any);
          });
          return updated as any;
        });
      }

      // Check if any ratings are updates (already submitted/pending)
      const isUpdate = ratingsWithComments.some(rating => {
        const existingRating = userSkills.find(us => 
          us.user_id === profile.user_id && 
          (rating.type === 'skill' ? us.skill_id === rating.id && !us.subskill_id : us.subskill_id === rating.id) &&
          us.status === 'submitted'
        );
        return !!existingRating;
      });

      // Notify all tech leads for submissions (including self-ratings by tech leads)
      const isCurrentUserTechLead = profile.role === 'tech_lead';
      const actionText = isUpdate ? 'updated' : 'submitted';
      const titleText = isUpdate ? 'Updated' : 'Submitted';
      
      if (isCurrentUserTechLead) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(
            (await supabase
              .from('profiles')
              .select('user_id')
              .eq('role', 'tech_lead')
              .neq('user_id', profile.user_id)
            ).data?.map(techLead => ({
              user_id: techLead.user_id,
              title: `Tech Lead Self-Rating ${titleText}`,
              message: `${profile.full_name} has ${actionText} ${ratingsWithComments.length} self-rating${ratingsWithComments.length > 1 ? 's' : ''}${isUpdate ? ' (pending review)' : ' for peer review'}.`,
              type: 'info' as const
            })) || []
          );

        if (notificationError) {
          console.error('❌ Error creating tech lead notifications:', notificationError);
        }
      } else {
        // For ALL employees (including those without assigned tech leads)
        console.log(`📧 Sending notifications to all active tech leads for employee rating ${actionText}`);
        const { data: allTechLeads, error: techLeadsError } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .eq('role', 'tech_lead')
          .eq('status', 'active');

        if (techLeadsError) {
          console.error('❌ Error fetching tech leads:', techLeadsError);
        } else if (allTechLeads && allTechLeads.length > 0) {
          const notifications = allTechLeads.map(techLead => ({
            user_id: techLead.user_id,
            title: `Skill Ratings ${titleText}`,
            message: `${profile.full_name} has ${actionText} ${ratingsWithComments.length} skill rating${ratingsWithComments.length > 1 ? 's' : ''}${isUpdate ? ' while pending review' : ' for your review'}.`,
            type: 'info' as const
          }));

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notificationError) {
            console.error('❌ Error creating notifications:', notificationError);
          }
        }
      }

      toast({
        title: "✅ Ratings submitted successfully",
        description: `${ratingsWithComments.length} rating${ratingsWithComments.length > 1 ? 's' : ''} submitted for approval`,
      });

      // Auto-add categories to dashboard if not already visible
      if (categoryIds.size > 0) {
        const { data: currentPrefs, error: prefsError } = await supabase
          .from('user_category_preferences')
          .select('visible_category_ids')
          .eq('user_id', profile.user_id)
          .maybeSingle();

        if (prefsError && prefsError.code !== 'PGRST116') {
          console.error('❌ Error fetching preferences:', prefsError);
        }

        const currentVisibleIds = currentPrefs?.visible_category_ids || [];
        const categoriesToAdd = Array.from(categoryIds).filter(catId => !currentVisibleIds.includes(catId));

        if (categoriesToAdd.length > 0) {
          const updatedVisibleIds = [...currentVisibleIds, ...categoriesToAdd];
          const { error: updateError } = await supabase
            .from('user_category_preferences')
            .upsert({
              user_id: profile.user_id,
              visible_category_ids: updatedVisibleIds
            }, {
              onConflict: 'user_id'
            });

          if (updateError) {
            console.error('❌ Error updating category preferences:', updateError);
          } else {
            const addedCategoryNames = skillCategories
              .filter(cat => categoriesToAdd.includes(cat.id))
              .map(cat => cat.name);
            toast({
              title: "Categories Added",
              description: `${addedCategoryNames.length} categor${addedCategoryNames.length === 1 ? 'y' : 'ies'} added to your dashboard: ${addedCategoryNames.join(', ')}`,
            });
          }
        }
      }

      // Remove only the saved items from pending ratings (preserve others)
      setPendingRatings(prev => {
        const next = new Map(prev);
        ratingsWithComments.forEach(r => next.delete(r.id));
        return next;
      });

      // No full data refresh to keep the modal state intact
    } catch (error) {
      console.error('❌ Error saving ratings:', error);
      toast({
        title: "Error",
        description: "Failed to submit ratings",
        variant: "destructive",
      });
    }
  };

  return {
    skillCategories,
    skills,
    subskills,
    userSkills,
    pendingRatings,
    loading,
    fetchData,
    handleSkillRate,
    handleSubskillRate,
    handleToggleNA,
    handleSaveRatings: handleSaveRatings,
    setPendingRatings
  };
};