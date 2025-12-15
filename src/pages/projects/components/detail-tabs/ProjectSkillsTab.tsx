import { Project } from '../../types/projects';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
interface ProjectSkillsTabProps {
  project: Project;
}
export default function ProjectSkillsTab({
  project
}: ProjectSkillsTabProps) {
  const [skillCoverage, setSkillCoverage] = useState<any[]>([]);
  useEffect(() => {
    loadSkillCoverage();
  }, [project]);
  const loadSkillCoverage = async () => {
    const coverage = await Promise.all(project.required_skills.map(async reqSkill => {
      // Check which team members have this skill approved
      const {
        data: ratings
      } = await supabase.from('employee_ratings').select('user_id, rating, profiles!employee_ratings_user_id_fkey(full_name)').eq('subskill_id', reqSkill.subskill_id).eq('status', 'approved').in('user_id', project.members.map(m => m.user_id));
      const ratingValues = {
        low: 1,
        medium: 2,
        high: 3
      };
      const requiredValue = ratingValues[reqSkill.required_rating];
      const coveredBy = (ratings || []).filter((r: any) => {
        const userValue = ratingValues[r.rating as keyof typeof ratingValues];
        return userValue >= requiredValue;
      });
      return {
        ...reqSkill,
        covered: coveredBy.length > 0,
        covered_by: coveredBy.map((r: any) => r.profiles.full_name)
      };
    }));
    setSkillCoverage(coverage);
  };
  const coveredCount = skillCoverage.filter(s => s.covered).length;
  const totalCount = skillCoverage.length;
  const getRatingColor = (rating: string) => {
    if (rating === 'high') return 'bg-[hsl(var(--success))] text-white';
    if (rating === 'medium') return 'bg-[hsl(var(--info))] text-white';
    return 'bg-[hsl(var(--warning))] text-white';
  };

  const getRatingLabel = (rating: string) => {
    if (rating === 'high') return 'H';
    if (rating === 'medium') return 'M';
    return 'L';
  };

  return <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Skills Coverage</h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {skillCoverage.map(skill => <div key={skill.subskill_id} className="flex items-center gap-1.5 px-3 py-1.5 bg-background border rounded-lg shadow-sm">
            <span className="text-sm font-medium">{skill.subskill_name}</span>
            <Badge className={`text-xs h-5 px-2 ${getRatingColor(skill.required_rating)}`}>
              {getRatingLabel(skill.required_rating)}
            </Badge>
            {skill.covered ? <Check className="h-3.5 w-3.5 text-green-600" /> : <X className="h-3.5 w-3.5 text-red-600" />}
          </div>)}
      </div>
    </div>;
}