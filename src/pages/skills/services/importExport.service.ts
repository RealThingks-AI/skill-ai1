import { supabase } from "@/integrations/supabase/client";
import type { SkillCategory, Skill, Subskill } from "@/types/database";

interface ImportRow {
  Category: string;
  Skill: string;
  Subskill: string;
  Description: string;
}

interface LogEntry {
  operation_type: 'import' | 'export';
  log_level: 'success' | 'error' | 'info';
  entity_type: 'category' | 'skill' | 'subskill';
  entity_name: string;
  action: 'created' | 'reused' | 'linked' | 'failed' | 'duplicate';
  details?: any;
}

export class ImportExportService {
  private static async logOperation(entry: LogEntry): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('import_export_logs').insert({
        user_id: user.id,
        ...entry
      });
    } catch (error) {
      console.error('Failed to log operation:', error);
    }
  }

  static async exportToCSV(
    categories: SkillCategory[],
    skills: Skill[],
    subskills: Subskill[]
  ): Promise<string> {
    await this.logOperation({
      operation_type: 'export',
      log_level: 'info',
      entity_type: 'category',
      entity_name: 'export_started',
      action: 'linked',
      details: { categories_count: categories.length, skills_count: skills.length, subskills_count: subskills.length }
    });

    const csvData: ImportRow[] = [];
    
    categories.forEach(category => {
      const categorySkills = skills.filter(s => s.category_id === category.id);
      
      if (categorySkills.length === 0) {
        csvData.push({
          Category: category.name,
          Skill: "",
          Subskill: "",
          Description: category.description || ""
        });
      } else {
        categorySkills.forEach(skill => {
          const skillSubskills = subskills.filter(s => s.skill_id === skill.id);
          
          if (skillSubskills.length === 0) {
            csvData.push({
              Category: category.name,
              Skill: skill.name,
              Subskill: "",
              Description: skill.description || ""
            });
          } else {
            skillSubskills.forEach(subskill => {
              csvData.push({
                Category: category.name,
                Skill: skill.name,
                Subskill: subskill.name,
                Description: subskill.description || ""
              });
            });
          }
        });
      }
    });
    
    const headers = ["Category", "Skill", "Subskill", "Description"];
    const csvString = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${(row as any)[header] || ''}"`).join(','))
    ].join('\n');

    await this.logOperation({
      operation_type: 'export',
      log_level: 'success',
      entity_type: 'category',
      entity_name: 'export_completed',
      action: 'linked',
      details: { total_rows: csvData.length }
    });
    
    return csvString;
  }

  static async findOrCreateCategory(
    name: string,
    description: string,
    existingCategories: SkillCategory[]
  ): Promise<{ category: SkillCategory; isNew: boolean }> {
    const trimmedName = name.trim();
    
    // Check if category already exists
    let existingCategory = existingCategories.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    
    if (existingCategory) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'category',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: existingCategory.id }
      });
      return { category: existingCategory, isNew: false };
    }

    // Try to find in database (in case cache is stale)
    const { data: dbCategory } = await supabase
      .from('skill_categories')
      .select('*')
      .ilike('name', trimmedName)
      .single();

    if (dbCategory) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'category',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: dbCategory.id, found_in_db: true }
      });
      return { category: dbCategory, isNew: false };
    }

    // Create new category
    try {
      const { data: newCategory, error } = await supabase
        .from('skill_categories')
        .insert({ 
          name: trimmedName,
          description: description || null,
          color: '#3B82F6'
        })
        .select()
        .single();

      if (error) throw error;

      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'category',
        entity_name: trimmedName,
        action: 'created',
        details: { new_id: newCategory.id, description }
      });

      return { category: newCategory, isNew: true };
    } catch (error) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'error',
        entity_type: 'category',
        entity_name: trimmedName,
        action: 'failed',
        details: { error: error.message }
      });
      throw error;
    }
  }

  static async findOrCreateSkill(
    name: string,
    categoryId: string,
    description: string,
    existingSkills: Skill[]
  ): Promise<{ skill: Skill; isNew: boolean }> {
    const trimmedName = name.trim();
    
    // Check if skill already exists in this category
    let existingSkill = existingSkills.find(s => 
      s.name.toLowerCase() === trimmedName.toLowerCase() && s.category_id === categoryId
    );
    
    if (existingSkill) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'skill',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: existingSkill.id, category_id: categoryId }
      });
      return { skill: existingSkill, isNew: false };
    }

    // Try to find in database
    const { data: dbSkill } = await supabase
      .from('skills')
      .select('*')
      .ilike('name', trimmedName)
      .eq('category_id', categoryId)
      .single();

    if (dbSkill) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'skill',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: dbSkill.id, category_id: categoryId, found_in_db: true }
      });
      return { skill: dbSkill, isNew: false };
    }

    // Create new skill
    try {
      const { data: newSkill, error } = await supabase
        .from('skills')
        .insert({
          name: trimmedName,
          category_id: categoryId,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;

      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'skill',
        entity_name: trimmedName,
        action: 'created',
        details: { new_id: newSkill.id, category_id: categoryId, description }
      });

      return { skill: newSkill, isNew: true };
    } catch (error) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'error',
        entity_type: 'skill',
        entity_name: trimmedName,
        action: 'failed',
        details: { error: error.message, category_id: categoryId }
      });
      throw error;
    }
  }

  static async findOrCreateSubskill(
    name: string,
    skillId: string,
    description: string,
    existingSubskills: Subskill[]
  ): Promise<{ subskill: Subskill; isNew: boolean }> {
    const trimmedName = name.trim();
    
    // Check if subskill already exists for this skill
    let existingSubskill = existingSubskills.find(s => 
      s.name.toLowerCase() === trimmedName.toLowerCase() && s.skill_id === skillId
    );
    
    if (existingSubskill) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'subskill',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: existingSubskill.id, skill_id: skillId }
      });
      return { subskill: existingSubskill, isNew: false };
    }

    // Try to find in database
    const { data: dbSubskill } = await supabase
      .from('subskills')
      .select('*')
      .ilike('name', trimmedName)
      .eq('skill_id', skillId)
      .single();

    if (dbSubskill) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'subskill',
        entity_name: trimmedName,
        action: 'reused',
        details: { existing_id: dbSubskill.id, skill_id: skillId, found_in_db: true }
      });
      return { subskill: dbSubskill, isNew: false };
    }

    // Create new subskill
    try {
      const { data: newSubskill, error } = await supabase
        .from('subskills')
        .insert({
          name: trimmedName,
          skill_id: skillId,
          description: description || null
        })
        .select()
        .single();

      if (error) throw error;

      await this.logOperation({
        operation_type: 'import',
        log_level: 'success',
        entity_type: 'subskill',
        entity_name: trimmedName,
        action: 'created',
        details: { new_id: newSubskill.id, skill_id: skillId, description }
      });

      return { subskill: newSubskill, isNew: true };
    } catch (error) {
      await this.logOperation({
        operation_type: 'import',
        log_level: 'error',
        entity_type: 'subskill',
        entity_name: trimmedName,
        action: 'failed',
        details: { error: error.message, skill_id: skillId }
      });
      throw error;
    }
  }

  static async importFromCSV(
    csvData: ImportRow[],
    existingCategories: SkillCategory[],
    existingSkills: Skill[],
    existingSubskills: Subskill[]
  ): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;
    
    console.log('📊 ImportExportService: Starting CSV import with', csvData.length, 'rows');
    
    await this.logOperation({
      operation_type: 'import',
      log_level: 'info',
      entity_type: 'category',
      entity_name: 'import_started',
      action: 'linked',
      details: { total_rows: csvData.length }
    });

    // Keep track of newly created items to avoid duplicates within the same import
    const updatedCategories = [...existingCategories];
    const updatedSkills = [...existingSkills];
    const updatedSubskills = [...existingSubskills];

    for (const row of csvData) {
      try {
        const categoryName = row.Category?.trim();
        const skillName = row.Skill?.trim();
        const subskillName = row.Subskill?.trim();
        const description = row.Description?.trim();

        console.log('🔄 Processing row:', { categoryName, skillName, subskillName });

        if (!categoryName) {
          console.warn('⚠️ Skipping row - missing category name:', row);
          await this.logOperation({
            operation_type: 'import',
            log_level: 'error',
            entity_type: 'category',
            entity_name: 'unknown',
            action: 'failed',
            details: { error: 'Missing category name', row }
          });
          errors++;
          continue;
        }

        // Handle category
        const { category, isNew: categoryIsNew } = await this.findOrCreateCategory(
          categoryName,
          description,
          updatedCategories
        );
        
        if (categoryIsNew) {
          updatedCategories.push(category);
          console.log('✅ Created new category:', category.name);
        } else {
          console.log('🔄 Reused existing category:', category.name);
        }

        // Handle skill (if provided)
        if (skillName) {
          const { skill, isNew: skillIsNew } = await this.findOrCreateSkill(
            skillName,
            category.id,
            description,
            updatedSkills
          );
          
          if (skillIsNew) {
            updatedSkills.push(skill);
            console.log('✅ Created new skill:', skill.name);
          } else {
            console.log('🔄 Reused existing skill:', skill.name);
          }

          // Handle subskill (if provided)
          if (subskillName) {
            const { subskill, isNew: subskillIsNew } = await this.findOrCreateSubskill(
              subskillName,
              skill.id,
              description,
              updatedSubskills
            );
            
            if (subskillIsNew) {
              updatedSubskills.push(subskill);
              console.log('✅ Created new subskill:', subskill.name);
            } else {
              console.log('🔄 Reused existing subskill:', subskill.name);
            }
          }
        }

        success++;
      } catch (error) {
        console.error('❌ Error processing row:', error, row);
        await this.logOperation({
          operation_type: 'import',
          log_level: 'error',
          entity_type: 'category',
          entity_name: row.Category || 'unknown',
          action: 'failed',
          details: { error: error instanceof Error ? error.message : String(error), row }
        });
        errors++;
      }
    }

    console.log('📊 Import completed:', { success, errors, total: csvData.length });

    await this.logOperation({
      operation_type: 'import',
      log_level: 'success',
      entity_type: 'category',
      entity_name: 'import_completed',
      action: 'linked',
      details: { success_count: success, error_count: errors, total_rows: csvData.length }
    });

    return { success, errors };
  }

  static async replaceAllFromCSV(
    csvData: ImportRow[],
    currentCategories: SkillCategory[],
    currentSkills: Skill[],
    currentSubskills: Subskill[]
  ): Promise<{ success: number; errors: number; backupFile: string }> {
    console.log('🔄 Starting REPLACE ALL process');
    
    // Step 1: Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupFilename = `skills_backup_${timestamp}.csv`;
    
    await this.logOperation({
      operation_type: 'export',
      log_level: 'info',
      entity_type: 'category',
      entity_name: 'backup_before_replace',
      action: 'linked',
      details: { filename: backupFilename }
    });

    const csvString = await this.exportToCSV(currentCategories, currentSkills, currentSubskills);
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename;
    a.click();
    window.URL.revokeObjectURL(url);

    console.log('✅ Backup created:', backupFilename);

    // Step 2: Delete all existing data
    await this.logOperation({
      operation_type: 'import',
      log_level: 'info',
      entity_type: 'category',
      entity_name: 'delete_all_started',
      action: 'linked',
      details: { 
        categories: currentCategories.length,
        skills: currentSkills.length,
        subskills: currentSubskills.length
      }
    });

    // Import SkillsService dynamically to avoid circular dependency
    const { SkillsService } = await import('./skills.service');
    await SkillsService.deleteAllData();
    
    console.log('✅ All existing data deleted');

    // Step 3: Import new data (with empty arrays since everything is deleted)
    await this.logOperation({
      operation_type: 'import',
      log_level: 'info',
      entity_type: 'category',
      entity_name: 'import_new_data_started',
      action: 'linked',
      details: { rows_to_import: csvData.length }
    });

    const result = await this.importFromCSV(csvData, [], [], []);
    
    console.log('✅ Replace all completed:', result);

    await this.logOperation({
      operation_type: 'import',
      log_level: 'success',
      entity_type: 'category',
      entity_name: 'replace_all_completed',
      action: 'linked',
      details: { ...result, backup_file: backupFilename }
    });

    return { ...result, backupFile: backupFilename };
  }
}
