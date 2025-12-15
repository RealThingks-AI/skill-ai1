import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SkillCategory, Skill as DBSkill, Subskill as DBSubskill } from "@/types/database";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Skill {
  id: string;
  name: string;
  category_id: string;
}

interface Subskill {
  id: string;
  name: string;
  skill_id: string;
}

const PENDING_SELECTIONS_KEY = "skill-explorer-pending-selections";

export const useSkillExplorerData = (hasAccess: boolean) => {
  const { toast } = useToast();
  
  // Data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [subskills, setSubskills] = useState<Subskill[]>([]);
  
  // All data for search
  const [allCategories, setAllCategories] = useState<SkillCategory[]>([]);
  const [allSkills, setAllSkills] = useState<DBSkill[]>([]);
  const [allSubskills, setAllSubskills] = useState<DBSubskill[]>([]);
  
  // Selection states
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [pendingSelections, setPendingSelections] = useState<
    Array<{
      id: string;
      category: string;
      skill: string;
      subskill: string;
      subskill_id: string;
      skill_id: string;
      rating: "low" | "medium" | "high";
    }>
  >(() => {
    const saved = localStorage.getItem(PENDING_SELECTIONS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Persist pendingSelections to localStorage
  useEffect(() => {
    localStorage.setItem(PENDING_SELECTIONS_KEY, JSON.stringify(pendingSelections));
  }, [pendingSelections]);

  // Load all data for search silently
  useEffect(() => {
    const loadSearchData = async () => {
      try {
        const [categoriesRes, skillsRes, subskillsRes] = await Promise.all([
          supabase.from("skill_categories").select("*").order("name"),
          supabase.from("skills").select("*").order("name"),
          supabase.from("subskills").select("*").order("name"),
        ]);
        if (categoriesRes.data) setAllCategories(categoriesRes.data);
        if (skillsRes.data) setAllSkills(skillsRes.data);
        if (subskillsRes.data) setAllSubskills(subskillsRes.data);
      } catch (error) {
        console.error("Error loading search data:", error);
      }
    };
    if (hasAccess) {
      loadSearchData(); // Silent load, no loading state
    }
  }, [hasAccess]);

  // Load categories silently
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data, error } = await supabase.from("skill_categories").select("id, name, color").order("name");
        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast({
          title: "Error",
          description: "Failed to load categories",
          variant: "destructive",
        });
      }
    };
    if (hasAccess) {
      loadCategories(); // Silent load, no loading state
    }
  }, [hasAccess, toast]);

  const handleCategorySelect = async (category: Category) => {
    setSelectedCategory(category);
    try {
      const { data, error } = await supabase
        .from("skills")
        .select("id, name, category_id")
        .eq("category_id", category.id)
        .order("name");
      if (error) throw error;
      setSkills(data || []);
      return true;
    } catch (error) {
      console.error("Error loading skills:", error);
      toast({
        title: "Error",
        description: "Failed to load skills",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSkillSelect = async (skill: Skill) => {
    setSelectedSkill(skill);
    try {
      const { data, error } = await supabase
        .from("subskills")
        .select("id, name, skill_id")
        .eq("skill_id", skill.id)
        .order("name");
      if (error) throw error;
      setSubskills(data || []);
      return true;
    } catch (error) {
      console.error("Error loading subskills:", error);
      toast({
        title: "Error",
        description: "Failed to load subskills",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    categories,
    skills,
    subskills,
    allCategories,
    allSkills,
    allSubskills,
    selectedCategory,
    selectedSkill,
    pendingSelections,
    setPendingSelections,
    handleCategorySelect,
    handleSkillSelect,
  };
};
