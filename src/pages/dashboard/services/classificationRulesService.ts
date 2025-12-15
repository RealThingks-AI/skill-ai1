import { supabase } from '@/integrations/supabase/client';

export interface RuleCondition {
  metric: string;
  operator: string;
  value?: number;
  metric2?: string;
  combineWith?: 'AND' | 'OR';
  subConditions?: RuleCondition[];
  note?: string;
}

export interface ClassificationRule {
  id: string;
  level: 'expert' | 'intermediate' | 'beginner';
  conditions: RuleCondition[];
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export const classificationRulesService = {
  async fetchAll() {
    const { data, error } = await supabase
      .from('classification_rules')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) throw error;
    return (data || []).map(rule => ({
      ...rule,
      conditions: rule.conditions as unknown as RuleCondition[]
    })) as ClassificationRule[];
  },

  async create(rule: Omit<ClassificationRule, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('classification_rules')
      .insert({
        level: rule.level,
        conditions: rule.conditions as any,
        display_order: rule.display_order,
        is_active: rule.is_active,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      conditions: data.conditions as unknown as RuleCondition[]
    } as ClassificationRule;
  },

  async update(id: string, updates: Partial<ClassificationRule>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {
      updated_by: user.id,
    };

    if (updates.conditions) {
      updateData.conditions = updates.conditions as any;
    }
    if (updates.display_order !== undefined) {
      updateData.display_order = updates.display_order;
    }
    if (updates.is_active !== undefined) {
      updateData.is_active = updates.is_active;
    }
    if (updates.level) {
      updateData.level = updates.level;
    }

    const { data, error } = await supabase
      .from('classification_rules')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      conditions: data.conditions as unknown as RuleCondition[]
    } as ClassificationRule;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('classification_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorder(rules: { id: string; display_order: number }[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const promises = rules.map(({ id, display_order }) =>
      supabase
        .from('classification_rules')
        .update({ display_order, updated_by: user.id })
        .eq('id', id)
    );

    const results = await Promise.all(promises);
    const errors = results.filter(r => r.error);
    if (errors.length > 0) throw errors[0].error;
  },

  // Initialize default rules if none exist
  async initializeDefaults() {
    const { data: existing } = await supabase
      .from('classification_rules')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const defaultRules = [
      {
        level: 'expert' as const,
        conditions: [
          { metric: 'high%', operator: '>=', value: 30, combineWith: 'OR' as const },
          { 
            metric: 'high%', 
            operator: '>=', 
            value: 20, 
            combineWith: 'AND' as const, 
            subConditions: [{ metric: 'medium%', operator: '<=', value: 40 }] 
          }
        ],
        display_order: 1,
        is_active: true,
      },
      {
        level: 'intermediate' as const,
        conditions: [
          { metric: 'high%', operator: '>=', value: 10, combineWith: 'AND' as const, subConditions: [{ metric: 'medium%', operator: '>=', value: 30 }] },
          { metric: 'medium%', operator: '>=', value: 20, combineWith: 'AND' as const, subConditions: [{ metric: 'low%', operator: '>=', value: 40 }] },
          { metric: 'medium%', operator: '>=', value: 50, combineWith: 'OR' as const },
          { metric: 'medium%', operator: '>=', value: 30, combineWith: 'AND' as const, subConditions: [{ metric: 'low%', operator: '>=', value: 30 }] },
          { metric: 'medium%', operator: '>=', value: 40, combineWith: 'AND' as const, subConditions: [{ metric: 'high%', operator: '<', value: 20 }] },
          { metric: 'high% + medium%', operator: '>=', value: 50, combineWith: 'OR' as const }
        ],
        display_order: 2,
        is_active: true,
      },
      {
        level: 'beginner' as const,
        conditions: [
          { metric: 'lowCount', operator: '>=', value: 1, combineWith: 'AND' as const, note: 'Applied when NOT Expert and NOT Intermediate' }
        ],
        display_order: 3,
        is_active: true,
      }
    ];

    await Promise.all(
      defaultRules.map(rule => this.create(rule))
    );
  }
};
