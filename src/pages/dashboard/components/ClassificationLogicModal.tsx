import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { classificationRulesService, ClassificationRule, RuleCondition } from '../services/classificationRulesService';
import { useAuth } from '@/hooks/useAuth';
import ClearSubconditionsButton from './ClearSubconditionsButton';
import { cn } from '@/lib/utils';
interface ClassificationLogicModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRulesUpdated: () => void;
}
const METRICS = ['high%', 'medium%', 'low%', 'highCount', 'mediumCount', 'lowCount', 'high% + medium%'];
const OPERATORS = ['>=', '>', '<=', '<', '='];
export default function ClassificationLogicModal({
  open,
  onOpenChange,
  onRulesUpdated
}: ClassificationLogicModalProps) {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const {
    toast
  } = useToast();
  const {
    profile
  } = useAuth();
  const canEdit = profile?.role === 'admin' || profile?.role === 'management';
  useEffect(() => {
    if (open) {
      loadRules();
    }
  }, [open]);
  const loadRules = async () => {
    try {
      setLoading(true);
      const data = await classificationRulesService.fetchAll();
      setRules(data);
    } catch (error) {
      console.error('Error loading rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classification rules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };
  const handleAddCondition = (level: 'expert' | 'intermediate' | 'beginner', afterIndex?: number) => {
    const rule = rules.find(r => r.level === level);
    if (!rule || !canEdit) return;
    const newCondition: RuleCondition = {
      metric: 'high%',
      operator: '>=',
      value: 30,
      combineWith: 'AND'
    };
    let updatedConditions = [...rule.conditions];
    if (afterIndex !== undefined) {
      // Insert after specific index
      updatedConditions.splice(afterIndex + 1, 0, newCondition);
    } else {
      // Add to end
      updatedConditions.push(newCondition);
    }
    const updatedRule = {
      ...rule,
      conditions: updatedConditions
    };
    setRules(rules.map(r => r.id === rule.id ? updatedRule : r));
  };
  const handleDeleteCondition = (level: 'expert' | 'intermediate' | 'beginner', index: number) => {
    if (!canEdit) return;
    const rule = rules.find(r => r.level === level);
    if (!rule) return;
    const updatedRule = {
      ...rule,
      conditions: rule.conditions.filter((_, i) => i !== index)
    };
    setRules(rules.map(r => r.id === rule.id ? updatedRule : r));
  };
  const handleUpdateCondition = (level: 'expert' | 'intermediate' | 'beginner', index: number, field: keyof RuleCondition, value: any) => {
    if (!canEdit) return;
    const rule = rules.find(r => r.level === level);
    if (!rule) return;
    const updatedConditions = [...rule.conditions];
    const oldValue = updatedConditions[index][field];

    // When updating metric, operator, or value, clear subconditions to avoid conflicts
    if (field === 'metric' || field === 'operator' || field === 'value') {
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value,
        subConditions: [] // Clear subconditions when main condition changes
      };
    } else {
      updatedConditions[index] = {
        ...updatedConditions[index],
        [field]: value
      };
    }

    // If changing from OR to AND and this is the last condition, add a new condition
    if (field === 'combineWith' && oldValue === 'OR' && value === 'AND' && index === rule.conditions.length - 1) {
      const newCondition: RuleCondition = {
        metric: 'high%',
        operator: '>=',
        value: 30,
        combineWith: 'AND'
      };
      updatedConditions.push(newCondition);
    }
    const updatedRule = {
      ...rule,
      conditions: updatedConditions
    };
    setRules(rules.map(r => r.id === rule.id ? updatedRule : r));
  };
  const handleSave = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);

      // Update all rules
      await Promise.all(rules.map(rule => classificationRulesService.update(rule.id, {
        conditions: rule.conditions,
        display_order: rule.display_order
      })));
      toast({
        title: 'Success',
        description: 'Classification rules updated successfully'
      });
      onRulesUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving rules:', error);
      toast({
        title: 'Error',
        description: 'Failed to save classification rules',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  const getLevelBadge = (level: string) => {
    const colors = {
      expert: 'bg-green-500/10 text-green-700 dark:text-green-400',
      intermediate: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      beginner: 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    };
    return <Badge className={cn(colors[level as keyof typeof colors], "text-xs h-5 px-2")}>{level.toUpperCase()}</Badge>;
  };
  const renderCondition = (condition: RuleCondition, level: 'expert' | 'intermediate' | 'beginner', index: number, isLastCondition: boolean, nextConditionCombine?: 'AND' | 'OR') => {
    const isAndChained = condition.combineWith === 'AND' && !isLastCondition;
    const showAddButton = condition.combineWith === 'AND' && isLastCondition && canEdit;
    return <div key={index}>
        <Card className={cn("p-2.5", isAndChained && "border-l-2 border-l-primary/50")}>
          <div className="flex items-center gap-2">
            {canEdit && <GripVertical className="h-3.5 w-3.5 text-muted-foreground cursor-move" />}
            
            <Select value={condition.metric} onValueChange={value => handleUpdateCondition(level, index, 'metric', value)} disabled={!canEdit}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={condition.operator} onValueChange={value => handleUpdateCondition(level, index, 'operator', value)} disabled={!canEdit}>
              <SelectTrigger className="w-[60px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OPERATORS.map(op => <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input type="number" value={condition.value || ''} onChange={e => handleUpdateCondition(level, index, 'value', Number(e.target.value))} className="w-[80px] h-8 text-xs" disabled={!canEdit} />

            <Select value={condition.combineWith || 'OR'} onValueChange={value => handleUpdateCondition(level, index, 'combineWith', value as 'AND' | 'OR')} disabled={!canEdit}>
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AND" className="text-xs">AND</SelectItem>
                <SelectItem value="OR" className="text-xs">OR</SelectItem>
              </SelectContent>
            </Select>

            {canEdit && <Button variant="ghost" size="icon" onClick={() => handleDeleteCondition(level, index)} className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>}
          </div>

          {condition.subConditions && condition.subConditions.length > 0 && <div className="ml-6 mt-1.5 space-y-1 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-yellow-800 dark:text-yellow-200 font-medium">
                  Sub-conditions (all must be true):
                </p>
                {canEdit && <ClearSubconditionsButton onClear={() => handleUpdateCondition(level, index, 'subConditions', [])} />}
              </div>
              {condition.subConditions.map((subCond, subIdx) => <div key={subIdx} className="flex items-center gap-1.5 text-[10px] text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">AND</span>
                  <span>{subCond.metric}</span>
                  <span>{subCond.operator}</span>
                  <span>{subCond.value}</span>
                </div>)}
              <p className="text-[10px] text-yellow-600 dark:text-yellow-400 mt-1">
                ⚠️ Hidden subconditions may restrict this rule.
              </p>
            </div>}

          {condition.note && <p className="text-[10px] text-muted-foreground mt-1.5">{condition.note}</p>}
        </Card>

        {/* Show connector between conditions */}
        {!isLastCondition && <div className="flex items-center gap-1.5 my-1 ml-6">
            <div className={cn("h-4 w-0.5", condition.combineWith === 'AND' ? "bg-primary" : "bg-muted-foreground")} />
            <Badge variant={condition.combineWith === 'AND' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
              {condition.combineWith}
            </Badge>
          </div>}

        {/* Show add button for AND chains */}
        {showAddButton && <div className="flex items-center gap-1.5 mt-1 ml-6">
            <Button variant="outline" size="sm" onClick={() => handleAddCondition(level, index)} className="text-[10px] h-6 px-2">
              <Plus className="h-3 w-3 mr-1" />
              Add AND Condition
            </Button>
          </div>}
      </div>;
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg">Classification Logic Rules</DialogTitle>
          <DialogDescription className="text-xs space-y-1 pt-1">
            <div className="p-2 bg-muted/50 rounded-md space-y-0.5">
              <p className="font-medium">These rules apply at two levels:</p>
              <ul className="list-disc list-inside ml-2 text-xs">
                <li><strong>Skill Level:</strong> Classify each skill based on subskill ratings</li>
                <li><strong>Category Level:</strong> Classify users based on their skill classifications</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading ? <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div> : <div className="space-y-4 mt-3">
              {['expert', 'intermediate', 'beginner'].map(level => {
            const rule = rules.find(r => r.level === level);
            if (!rule) return null;
            const hasConditions = rule.conditions.length > 0;
            const lastCondition = rule.conditions[rule.conditions.length - 1];
            const canAddNewGroup = !hasConditions || lastCondition?.combineWith === 'OR';
            return <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      {getLevelBadge(level)}
                      {canEdit && canAddNewGroup && <Button variant="outline" size="sm" onClick={() => handleAddCondition(level as any)} className="h-7 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Condition
                        </Button>}
                    </div>

                    {!hasConditions && canEdit && <div className="text-center py-4 text-muted-foreground text-xs">
                        No conditions. Click "Add Condition" to start.
                      </div>}

                    <div className="space-y-1">
                      {rule.conditions.map((condition, index) => {
                  const isLastCondition = index === rule.conditions.length - 1;
                  const nextCondition = rule.conditions[index + 1];
                  return renderCondition(condition, level as any, index, isLastCondition, nextCondition?.combineWith);
                })}
                    </div>
                  </div>;
          })}
            </div>}

        {canEdit && <div className="flex justify-end gap-2 pt-3 border-t border-border mt-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="h-8 text-xs">
              {saving ? <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving...
                </> : <>
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  Save Rules
                </>}
            </Button>
          </div>}
      </DialogContent>
    </Dialog>;
}