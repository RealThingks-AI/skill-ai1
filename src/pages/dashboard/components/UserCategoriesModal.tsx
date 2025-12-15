import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import type { SkillCategory, Skill, Subskill } from "@/types/database";
import { classificationRulesService, ClassificationRule } from "../services/classificationRulesService";
import { classificationEngine } from "../utils/classificationEngine";
interface EmployeeRating {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id: string | null;
  rating: 'high' | 'medium' | 'low';
  status: string;
}
type UserClassification = 'expert' | 'intermediate' | 'beginner';
interface UserCategoryData {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  classification: UserClassification;
  percentage: number;
  skills: {
    skillId: string;
    skillName: string;
    classification: UserClassification;
    subskills: {
      subskillId: string;
      subskillName: string;
      rating: 'high' | 'medium' | 'low';
    }[];
  }[];
}
interface UserCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  userEmail: string;
  onCategoryClick: (categoryData: UserCategoryData) => void;
}
export const UserCategoriesModal = ({
  open,
  onClose,
  userId,
  userName,
  userEmail,
  onCategoryClick
}: UserCategoriesModalProps) => {
  const [loading, setLoading] = useState(true);
  const [categoriesData, setCategoriesData] = useState<UserCategoryData[]>([]);
  const [classificationRules, setClassificationRules] = useState<ClassificationRule[]>([]);
  useEffect(() => {
    if (open && userId) {
      fetchUserCategories();
    }
  }, [open, userId]);
  const fetchUserCategories = async () => {
    try {
      setLoading(true);

      console.log('🔍 UserCategoriesModal: Fetching classification rules for user:', userName);
      
      // Fetch classification rules
      await classificationRulesService.initializeDefaults();
      const rulesData = await classificationRulesService.fetchAll();
      setClassificationRules(rulesData || []);
      
      console.log('📋 UserCategoriesModal: Loaded', rulesData.length, 'classification rules');

      // Fetch all categories
      const {
        data: categories,
        error: catError
      } = await supabase.from('skill_categories').select('*').order('name');
      if (catError) throw catError;

      // Fetch all skills
      const {
        data: skills,
        error: skillsError
      } = await supabase.from('skills').select('*');
      if (skillsError) throw skillsError;

      // Fetch all subskills
      const {
        data: subskills,
        error: subskillsError
      } = await supabase.from('subskills').select('*');
      if (subskillsError) throw subskillsError;

      // Fetch user's approved ratings
      const {
        data: ratings,
        error: ratingsError
      } = await supabase.from('employee_ratings').select('*').eq('user_id', userId).eq('status', 'approved');
      if (ratingsError) throw ratingsError;

      // Calculate data for each category
      const userCategoriesData: UserCategoryData[] = [];
      (categories || []).forEach((category: SkillCategory) => {
        const categorySkills = (skills || []).filter((s: Skill) => s.category_id === category.id);
        const userSkills: UserCategoryData['skills'] = [];
        categorySkills.forEach(skill => {
          const skillSubskills = (subskills || []).filter((sub: Subskill) => sub.skill_id === skill.id);
          if (skillSubskills.length > 0) {
            const totalSubskillCount = skillSubskills.length;
            let highCount = 0;
            let mediumCount = 0;
            let lowCount = 0;
            const userSubskills: UserCategoryData['skills'][0]['subskills'] = [];
            skillSubskills.forEach(subskill => {
              const rating = (ratings || []).find((r: any) => r.subskill_id === subskill.id);
              if (rating) {
                const ratingValue = rating.rating as 'high' | 'medium' | 'low';
                if (ratingValue === 'high') highCount++;else if (ratingValue === 'medium') mediumCount++;else if (ratingValue === 'low') lowCount++;
                userSubskills.push({
                  subskillId: subskill.id,
                  subskillName: subskill.name,
                  rating: ratingValue
                });
              }
            });
            if (userSubskills.length > 0) {
              // Use dynamic classification engine with database rules
              const skillClassification = classificationEngine.classify(
                highCount,
                mediumCount,
                lowCount,
                totalSubskillCount,
                rulesData
              );
              
              console.log(`  📊 UserCategoriesModal - Skill: ${skill.name} | H:${highCount}(${((highCount/totalSubskillCount)*100).toFixed(1)}%) M:${mediumCount} L:${lowCount} Total:${totalSubskillCount} → ${skillClassification}`);
              userSkills.push({
                skillId: skill.id,
                skillName: skill.name,
                classification: skillClassification,
                subskills: userSubskills
              });
            }
          }
        });
        if (userSkills.length > 0) {
          // Category-level classification: Use dynamic classification engine with database rules
          const totalSkillsInCategory = userSkills.length;
          const expertSkillCount = userSkills.filter(s => s.classification === 'expert').length;
          const intermediateSkillCount = userSkills.filter(s => s.classification === 'intermediate').length;
          const beginnerSkillCount = userSkills.filter(s => s.classification === 'beginner').length;
          
          // Use the same classification engine as dashboard
          const classification = classificationEngine.classify(
            expertSkillCount,
            intermediateSkillCount,
            beginnerSkillCount,
            totalSkillsInCategory,
            rulesData
          );
          
          console.log(`  🎯 UserCategoriesModal - Category: ${category.name} | Expert:${expertSkillCount}(${((expertSkillCount/totalSkillsInCategory)*100).toFixed(1)}%) Intermediate:${intermediateSkillCount} Beginner:${beginnerSkillCount} Total:${totalSkillsInCategory} → ${classification}`);

          // Calculate percentage based on rated subskills vs total subskills in category
          const totalSubskillsInCategory = categorySkills.reduce((sum, skill) => {
            const skillSubskills = (subskills || []).filter((sub: Subskill) => sub.skill_id === skill.id);
            return sum + skillSubskills.length;
          }, 0);
          const ratedSubskillsCount = userSkills.reduce((sum, skill) => sum + skill.subskills.length, 0);
          const percentage = totalSubskillsInCategory > 0 ? ratedSubskillsCount / totalSubskillsInCategory * 100 : 0;
          userCategoriesData.push({
            categoryId: category.id,
            categoryName: category.name,
            categoryColor: category.color || '#3B82F6',
            classification,
            percentage,
            skills: userSkills
          });
        }
      });
      setCategoriesData(userCategoriesData);
    } catch (error) {
      console.error('Error fetching user categories:', error);
    } finally {
      setLoading(false);
    }
  };
  const getClassificationColor = (classification: UserClassification) => {
    if (classification === 'expert') return 'bg-green-500/10 text-green-700 dark:text-green-400';
    if (classification === 'intermediate') return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
    return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
  };
  const getClassificationLabel = (classification: UserClassification) => {
    return classification.charAt(0).toUpperCase() + classification.slice(1);
  };
  return <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">User Categories</DialogTitle>
          <div className="flex flex-col gap-1 pt-2">
            <p className="text-base font-medium text-foreground">{userName}</p>
            
          </div>
        </DialogHeader>

        <Separator />

        {loading ? <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div> : categoriesData.length === 0 ? <p className="text-center text-muted-foreground py-12">
            No skill ratings found for this user
          </p> : <div className="space-y-3 mt-4">
            {categoriesData.map(category => <Card key={category.categoryId} className="p-4 hover:shadow-md transition-all cursor-pointer border-border/50" onClick={() => onCategoryClick(category)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{
                  backgroundColor: category.categoryColor
                }} />
                      <h3 className="font-semibold text-foreground">
                        {category.categoryName}
                      </h3>
                      <Badge className={getClassificationColor(category.classification)}>
                        {getClassificationLabel(category.classification)}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {category.skills.length} skill{category.skills.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>)}
          </div>}
      </DialogContent>
    </Dialog>;
};