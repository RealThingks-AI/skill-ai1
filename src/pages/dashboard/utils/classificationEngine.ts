import { ClassificationRule, RuleCondition } from '../services/classificationRulesService';

type UserClassification = 'expert' | 'intermediate' | 'beginner';

interface SkillMetrics {
  highCount: number;
  mediumCount: number;
  lowCount: number;
  totalSubskills: number;
  highPercent: number;
  mediumPercent: number;
  lowPercent: number;
}

export const classificationEngine = {
  /**
   * Map display metric names to actual property names
   */
  mapMetricName(displayName: string): keyof SkillMetrics {
    const mapping: Record<string, keyof SkillMetrics> = {
      'high%': 'highPercent',
      'medium%': 'mediumPercent',
      'low%': 'lowPercent',
      'highCount': 'highCount',
      'mediumCount': 'mediumCount',
      'lowCount': 'lowCount',
      'high% + medium%': 'highPercent', // Will be handled specially
    };
    return mapping[displayName] || displayName as keyof SkillMetrics;
  },

  /**
   * Evaluate a single condition against metrics
   */
  evaluateCondition(condition: RuleCondition, metrics: SkillMetrics): boolean {
    const { metric, operator, value, metric2 } = condition;

    // Get the metric value
    let metricValue: number;
    
    if (metric.includes('+')) {
      // Handle combined metrics like 'high% + medium%'
      const parts = metric.split('+').map(p => p.trim());
      metricValue = parts.reduce((sum, part) => {
        const mappedName = this.mapMetricName(part);
        return sum + (metrics[mappedName] as number || 0);
      }, 0);
    } else {
      const mappedName = this.mapMetricName(metric);
      metricValue = metrics[mappedName] as number || 0;
    }

    // Get comparison value (either a fixed value or another metric)
    let compareValue: number;
    if (metric2) {
      const mappedName2 = this.mapMetricName(metric2);
      compareValue = metrics[mappedName2] as number || 0;
    } else {
      compareValue = value || 0;
    }

    // Evaluate operator
    switch (operator) {
      case '>=':
        return metricValue >= compareValue;
      case '>':
        return metricValue > compareValue;
      case '<=':
        return metricValue <= compareValue;
      case '<':
        return metricValue < compareValue;
      case '=':
        return metricValue === compareValue;
      default:
        return false;
    }
  },

  /**
   * Evaluate all conditions for a level with AND/OR logic
   * Properly handles operator precedence: AND groups are evaluated first, then combined with OR
   */
  evaluateLevel(conditions: RuleCondition[], metrics: SkillMetrics): boolean {
    if (conditions.length === 0) return false;

    console.log('🔍 Evaluating conditions:', conditions.map(c => 
      `${c.metric} ${c.operator} ${c.value} (${c.combineWith || 'END'})`).join(' | ')
    );

    // Group conditions by AND/OR precedence
    // Split into groups where each group is connected by AND, and groups are connected by OR
    const groups: RuleCondition[][] = [];
    let currentGroup: RuleCondition[] = [];

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      currentGroup.push(condition);

      // If this condition's combineWith is OR (or it's the last condition), end the current group
      const isLastCondition = i === conditions.length - 1;
      const nextIsOr = condition.combineWith === 'OR' || !condition.combineWith;
      
      if (isLastCondition || nextIsOr) {
        groups.push([...currentGroup]);
        currentGroup = [];
      }
    }

    console.log('📦 Grouped into', groups.length, 'groups:', 
      groups.map(g => `[${g.map(c => `${c.metric}${c.operator}${c.value}`).join(' AND ')}]`).join(' OR ')
    );

    // Evaluate each group (all conditions in a group must be true - AND logic)
    // Then combine groups with OR logic (any group can be true)
    const result = groups.some((group, groupIdx) => {
      const groupResult = group.every((condition, condIdx) => {
        let conditionResult = this.evaluateCondition(condition, metrics);

        // If there are sub-conditions, they must ALL be true (implicit AND)
        if (condition.subConditions && condition.subConditions.length > 0) {
          const subResults = condition.subConditions.every(subCond => 
            this.evaluateCondition(subCond, metrics)
          );
          console.log(`  ⚙️ Group ${groupIdx} Cond ${condIdx}: ${condition.metric}${condition.operator}${condition.value} = ${conditionResult}, subConditions = ${subResults} → ${conditionResult && subResults}`);
          conditionResult = conditionResult && subResults;
        } else {
          const metricValue = condition.metric.includes('+') 
            ? condition.metric.split('+').map(p => p.trim()).reduce((sum, part) => {
                const mappedName = this.mapMetricName(part);
                return sum + (metrics[mappedName] as number || 0);
              }, 0)
            : metrics[this.mapMetricName(condition.metric)] as number || 0;
          console.log(`  ⚙️ Group ${groupIdx} Cond ${condIdx}: ${condition.metric}(${metricValue.toFixed(1)}) ${condition.operator} ${condition.value} = ${conditionResult}`);
        }

        return conditionResult;
      });
      console.log(`  📊 Group ${groupIdx} result: ${groupResult}`);
      return groupResult;
    });

    console.log(`✅ Final result: ${result}`);
    return result;
  },

  /**
   * Classify based on dynamic rules
   * 
   * This method works at two levels:
   * 1. Skill Level: highCount = high-rated subskills, mediumCount = medium-rated, lowCount = low-rated
   * 2. Category Level: highCount = expert skills, mediumCount = intermediate skills, lowCount = beginner skills
   * 
   * The same rules and logic apply to both levels for consistency.
   */
  classify(
    highCount: number,
    mediumCount: number,
    lowCount: number,
    totalSubskills: number,
    rules: ClassificationRule[]
  ): UserClassification {
    const metrics: SkillMetrics = {
      highCount,
      mediumCount,
      lowCount,
      totalSubskills,
      highPercent: (highCount / totalSubskills) * 100,
      mediumPercent: (mediumCount / totalSubskills) * 100,
      lowPercent: (lowCount / totalSubskills) * 100,
    };

    console.log('🎯 Classification Input:', {
      highCount, 
      mediumCount, 
      lowCount, 
      totalSubskills,
      'high%': metrics.highPercent.toFixed(1),
      'medium%': metrics.mediumPercent.toFixed(1),
      'low%': metrics.lowPercent.toFixed(1)
    });

    // Check Expert rules first
    const expertRule = rules.find(r => r.level === 'expert');
    if (expertRule) {
      console.log('🔵 Checking EXPERT rules...');
      if (this.evaluateLevel(expertRule.conditions, metrics)) {
        console.log('✅ Classified as EXPERT');
        return 'expert';
      }
    }

    // Check Intermediate rules (only if NOT Expert)
    const intermediateRule = rules.find(r => r.level === 'intermediate');
    if (intermediateRule) {
      console.log('🟡 Checking INTERMEDIATE rules...');
      if (this.evaluateLevel(intermediateRule.conditions, metrics)) {
        console.log('✅ Classified as INTERMEDIATE');
        return 'intermediate';
      }
    }

    // Check Beginner rules (only if NOT Expert and NOT Intermediate)
    const beginnerRule = rules.find(r => r.level === 'beginner');
    if (beginnerRule) {
      console.log('🟢 Checking BEGINNER rules...');
      if (this.evaluateLevel(beginnerRule.conditions, metrics)) {
        console.log('✅ Classified as BEGINNER');
        return 'beginner';
      }
    }

    // Default to beginner if no rules match
    console.log('⚠️ No rules matched, defaulting to BEGINNER');
    return 'beginner';
  }
};
