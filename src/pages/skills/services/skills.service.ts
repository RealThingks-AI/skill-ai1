import { supabase } from "@/integrations/supabase/client";
import type { SkillCategory, Skill, Subskill } from "@/types/database";

export class SkillsService {
  static async getCategories(): Promise<SkillCategory[]> {
    const { data, error } = await supabase
      .from('skill_categories')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getSkills(): Promise<Skill[]> {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async getSubskills(): Promise<Subskill[]> {
    const { data, error } = await supabase
      .from('subskills')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data || [];
  }

  static async createCategory(name: string, description?: string): Promise<SkillCategory> {
    const { data, error } = await supabase
      .from('skill_categories')
      .insert({ name, description })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createSkill(name: string, categoryId: string, description?: string): Promise<Skill> {
    const { data, error } = await supabase
      .from('skills')
      .insert({ name, category_id: categoryId, description })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async createSubskill(name: string, skillId: string, description?: string): Promise<Subskill> {
    const { data, error } = await supabase
      .from('subskills')
      .insert({ name, skill_id: skillId, description })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async deleteCategory(categoryId: string): Promise<void> {
    // First, get all skills in this category
    const { data: categorySkills } = await supabase
      .from('skills')
      .select('id')
      .eq('category_id', categoryId);

    if (categorySkills && categorySkills.length > 0) {
      const skillIds = categorySkills.map(skill => skill.id);
      
      // Delete all user skills ratings for these skills
      await supabase
        .from('user_skills')
        .delete()
        .in('skill_id', skillIds);

      // Delete all employee ratings for these skills
      await supabase
        .from('employee_ratings')
        .delete()
        .in('skill_id', skillIds);

      // Delete all subskills for these skills
      await supabase
        .from('subskills')
        .delete()
        .in('skill_id', skillIds);

      // Delete all skills in this category
      await supabase
        .from('skills')
        .delete()
        .eq('category_id', categoryId);
    }

    // Finally, delete the category
    const { error } = await supabase
      .from('skill_categories')
      .delete()
      .eq('id', categoryId);

    if (error) throw error;
  }

  static async deleteSkill(skillId: string): Promise<void> {
    // Delete all user skills ratings for this skill
    await supabase
      .from('user_skills')
      .delete()
      .eq('skill_id', skillId);

    // Delete all employee ratings for this skill
    await supabase
      .from('employee_ratings')
      .delete()
      .eq('skill_id', skillId);

    // Delete all subskills for this skill
    await supabase
      .from('subskills')
      .delete()
      .eq('skill_id', skillId);

    // Finally, delete the skill
    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', skillId);

    if (error) throw error;
  }

  static async deleteSubskill(subskillId: string): Promise<void> {
    // Delete all user skills ratings for this subskill
    await supabase
      .from('user_skills')
      .delete()
      .eq('subskill_id', subskillId);

    // Delete all employee ratings for this subskill
    await supabase
      .from('employee_ratings')
      .delete()
      .eq('subskill_id', subskillId);

    // Finally, delete the subskill
    const { error } = await supabase
      .from('subskills')
      .delete()
      .eq('id', subskillId);

    if (error) throw error;
  }

  static async deleteAllData(): Promise<void> {
    // Get all categories
    const categories = await this.getCategories();
    
    // Delete each category (cascades to skills and subskills)
    for (const category of categories) {
      await this.deleteCategory(category.id);
    }
  }
}