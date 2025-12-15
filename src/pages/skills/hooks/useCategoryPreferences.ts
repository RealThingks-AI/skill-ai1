import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export const useCategoryPreferences = () => {
  const [visibleCategoryIds, setVisibleCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  const { toast } = useToast();

  const fetchPreferences = async () => {
    if (!profile?.user_id) {
      console.log('[useCategoryPreferences] No profile user_id');
      return;
    }

    console.log('[useCategoryPreferences] Fetching preferences for user:', profile.user_id, profile.full_name);

    try {
      // Fetch stored preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_category_preferences')
        .select('visible_category_ids')
        .eq('user_id', profile.user_id)
        .maybeSingle();

      if (prefsError && prefsError.code !== 'PGRST116') {
        throw prefsError;
      }

      // Fetch categories where user has rated subskills
      const { data: ratedCategories, error: ratedError } = await supabase
        .from('employee_ratings')
        .select('skill_id, skills!inner(category_id)')
        .eq('user_id', profile.user_id);

      if (ratedError) throw ratedError;

      // Extract unique category IDs from rated subskills
      const ratedCategoryIds = [...new Set(
        ratedCategories?.map(r => (r.skills as any)?.category_id).filter(Boolean) || []
      )] as string[];

      console.log('[useCategoryPreferences] Rated category IDs:', ratedCategoryIds);

      // Merge stored preferences with categories that have ratings
      const storedCategoryIds = prefsData?.visible_category_ids || [];
      const mergedCategoryIds = [...new Set([...storedCategoryIds, ...ratedCategoryIds])];

      console.log('[useCategoryPreferences] Merged category IDs:', mergedCategoryIds);

      // If there are new categories from ratings, update preferences
      if (mergedCategoryIds.length > storedCategoryIds.length) {
        await supabase
          .from('user_category_preferences')
          .upsert({
            user_id: profile.user_id,
            visible_category_ids: mergedCategoryIds
          }, {
            onConflict: 'user_id'
          });
      }

      setVisibleCategoryIds(mergedCategoryIds);
    } catch (error) {
      console.error('Error fetching category preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load category preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (categoryIds: string[]) => {
    if (!profile?.user_id) return;

    try {
      const { error } = await supabase
        .from('user_category_preferences')
        .upsert({
          user_id: profile.user_id,
          visible_category_ids: categoryIds
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setVisibleCategoryIds(categoryIds);
    } catch (error) {
      console.error('Error updating category preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update category preferences",
        variant: "destructive",
      });
    }
  };

  const addCategories = async (categoryIds: string[]) => {
    const newCategoryIds = [...new Set([...visibleCategoryIds, ...categoryIds])];
    const addedCount = newCategoryIds.length - visibleCategoryIds.length;
    
    await updatePreferences(newCategoryIds);
    
    if (addedCount > 0) {
      toast({
        title: "Categories Added",
        description: `${addedCount} categor${addedCount === 1 ? 'y' : 'ies'} added to your dashboard`,
      });
    }
  };

  const hideCategory = async (categoryId: string, categoryName: string) => {
    const newCategoryIds = visibleCategoryIds.filter(id => id !== categoryId);
    await updatePreferences(newCategoryIds);
    toast({
      title: "Category Hidden",
      description: `"${categoryName}" has been hidden from your dashboard`,
    });
  };

  useEffect(() => {
    console.log('[useCategoryPreferences] Profile changed:', profile?.user_id, profile?.full_name);
    fetchPreferences();
  }, [profile?.user_id]); // Only depend on user_id to trigger when impersonation changes

  return {
    visibleCategoryIds,
    loading,
    addCategories,
    hideCategory,
    refetch: fetchPreferences
  };
};