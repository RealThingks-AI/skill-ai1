import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useSkillExplorerPresets = (profile: any) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleSavePreset = async (presetName: string, selections: any[]) => {
    if (!profile || selections.length === 0) return false;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from("skill_explorer_presets").insert({
        user_id: profile.user_id,
        preset_name: presetName,
        selections: selections,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Preset "${presetName}" saved successfully`,
      });
      return true;
    } catch (error) {
      console.error("Error saving preset:", error);
      toast({
        title: "Error",
        description: "Failed to save preset",
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadPreset = async (presetId: string) => {
    if (!profile) return null;
    
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("skill_explorer_presets")
        .select("selections")
        .eq("id", presetId)
        .eq("user_id", profile.user_id)
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Preset loaded successfully",
      });
      return data.selections;
    } catch (error) {
      console.error("Error loading preset:", error);
      toast({
        title: "Error",
        description: "Failed to load preset",
        variant: "destructive",
      });
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  return { handleSavePreset, handleLoadPreset, submitting };
};
