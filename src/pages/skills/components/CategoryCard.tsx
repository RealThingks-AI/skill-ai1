import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, TrendingUp, Minus, TrendingDown, X } from "lucide-react";
import { AddCategoryModal } from "./admin/AddCategoryModal";
import { ApprovedRatingsModal } from "./ApprovedRatingsModal";
import { PendingRatingsModal } from "./PendingRatingsModal";
import { RejectedRatingsModal } from "./RejectedRatingsModal";
import { AdminRatingsDrilldownModal } from "./AdminRatingsDrilldownModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SkillsService } from "../services/skills.service";
import { calculateCategoryProgress, calculateAdminCategoryStats } from "../utils/skillHelpers";
import type { SkillCategory, EmployeeRating, Skill } from "@/types/database";
import { fetchAllRows } from "@/utils/supabasePagination";

interface CategoryCardProps {
  category: SkillCategory;
  skillCount: number;
  isManagerOrAbove: boolean;
  onClick: () => void;
  onRefresh: () => void;
  index: number;
  userSkills?: EmployeeRating[];
  skills?: Skill[];
  subskills?: any[];
  showHideButton?: boolean;
  onHide?: (categoryId: string, categoryName: string) => void;
  allEmployeeRatings?: any[];
}

export const CategoryCard = React.forwardRef<HTMLDivElement, CategoryCardProps>(({
  category,
  skillCount,
  isManagerOrAbove,
  onClick,
  onRefresh,
  index,
  userSkills = [],
  skills = [],
  subskills = [],
  showHideButton = false,
  onHide,
  allEmployeeRatings = []
}, ref) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<'high' | 'medium' | 'low' | undefined>();
  const [showDrilldownModal, setShowDrilldownModal] = useState(false);
  const [drilldownType, setDrilldownType] = useState<'high' | 'medium' | 'low' | 'pending'>('high');
  const [drilldownRecords, setDrilldownRecords] = useState<any[]>([]);
  const {
    toast
  } = useToast();

  // Filter ratings for this category (for admin view)
  const categoryEmployeeRatings = React.useMemo(() => {
    if (!isManagerOrAbove || allEmployeeRatings.length === 0) return [];
    
    // Get skill IDs for this category
    const categorySkillIds = skills.filter(s => s.category_id === category.id).map(s => s.id);
    
    // Filter ratings for this category's skills
    return allEmployeeRatings.filter(rating => 
      categorySkillIds.includes(rating.skill_id)
    );
  }, [isManagerOrAbove, category.id, skills, allEmployeeRatings]);

  // Calculate statistics based on role
  const statsData = React.useMemo(() => {
    if (isManagerOrAbove && categoryEmployeeRatings.length > 0) {
      return calculateAdminCategoryStats(category.id, skills, subskills, categoryEmployeeRatings);
    } else {
      const progress = calculateCategoryProgress(category.id, skills, subskills, userSkills);
      return {
        ratingCounts: progress.ratingCounts,
        pendingCount: progress.pendingCount
      };
    }
  }, [isManagerOrAbove, category.id, skills, subskills, userSkills, categoryEmployeeRatings]);

  const { ratingCounts, pendingCount } = statsData;

  // For user view, still calculate full progress data
  const progressData = React.useMemo(() => {
    if (!isManagerOrAbove) {
      return calculateCategoryProgress(category.id, skills, subskills, userSkills);
    }
    return null;
  }, [isManagerOrAbove, category.id, skills, subskills, userSkills]);

  // Determine status based on level from calculateCategoryProgress (only for user view)
  const statusInfo = React.useMemo(() => {
    if (!isManagerOrAbove && progressData) {
      const { level } = progressData;
      if (level === 'expert') return {
        status: 'Expert',
        color: 'bg-green-500 text-white',
        bgTint: 'bg-green-50 border-green-200'
      };
      if (level === 'moderate') return {
        status: 'Moderate',
        color: 'bg-yellow-500 text-white',
        bgTint: 'bg-yellow-50 border-yellow-200'
      };
      return {
        status: 'Beginner',
        color: 'bg-red-500 text-white',
        bgTint: 'bg-red-50 border-red-200'
      };
    }
    return null;
  }, [isManagerOrAbove, progressData]);
  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowEditModal(true);
  };
  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Delete button clicked for category:', category.name, category.id);
    if (!confirm(`Are you sure you want to delete "${category.name}"? This will also delete all associated skills and ratings.`)) {
      console.log('Delete cancelled by user');
      return;
    }
    try {
      console.log('Attempting to delete category:', category.id);

      // Enhanced logging to debug the deletion process
      const {
        data: userRole
      } = await supabase.rpc('get_current_user_role');
      console.log('Current user role:', userRole);
      await SkillsService.deleteCategory(category.id);
      console.log('Category deleted successfully');
      toast({
        title: "Category Deleted",
        description: `"${category.name}" has been deleted successfully.`
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting category:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      toast({
        title: "Error",
        description: `Failed to delete category: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive"
      });
    }
  };
  const handleRatingClick = (rating: 'high' | 'medium' | 'low', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isManagerOrAbove) {
      // Admin drilldown
      const categorySkillIds = skills
        .filter(s => s.category_id === category.id)
        .map(s => s.id);
      
      const records = allEmployeeRatings
        .filter(r => {
          const skillMatch = categorySkillIds.includes(r.skill_id);
          const ratingMatch = r.rating === rating && r.status === 'approved';
          return skillMatch && ratingMatch;
        })
        .map(r => ({
          ...r,
          employee_name: r.profiles?.full_name,
          skill_name: r.skills?.name,
          subskill_name: r.subskills?.name,
          category_name: category.name,
          approver_name: r.approver?.full_name
        }));
      
      setDrilldownRecords(records);
      setDrilldownType(rating);
      setShowDrilldownModal(true);
    } else {
      // Employee view
      setSelectedRatingFilter(rating);
      setShowApprovedModal(true);
    }
  };
  const handleApprovedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRatingFilter(undefined);
    setShowApprovedModal(true);
  };
  const handleRejectedClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowRejectedModal(true);
  };
  const handlePendingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isManagerOrAbove) {
      // Admin drilldown
      const categorySkillIds = skills
        .filter(s => s.category_id === category.id)
        .map(s => s.id);
      
      const records = allEmployeeRatings
        .filter(r => {
          const skillMatch = categorySkillIds.includes(r.skill_id);
          const statusMatch = r.status === 'submitted';
          return skillMatch && statusMatch;
        })
        .map(r => ({
          ...r,
          employee_name: r.profiles?.full_name,
          skill_name: r.skills?.name,
          subskill_name: r.subskills?.name,
          category_name: category.name,
          approver_name: r.approver?.full_name
        }));
      
      setDrilldownRecords(records);
      setDrilldownType('pending');
      setShowDrilldownModal(true);
    } else {
      // Employee view
      setShowPendingModal(true);
    }
  };
  const handleUpdateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };
  return <>
      <motion.div 
        ref={ref}
        initial={{
          opacity: 0,
          y: 20
        }} 
        animate={{
          opacity: 1,
          y: 0
        }} 
        exit={{
          opacity: 0,
          y: -20,
          scale: 0.95
        }} 
        transition={{
          duration: 0.2,
          delay: Math.min(index * 0.05, 0.3),
          ease: "easeOut"
        }} 
        whileHover={{
          y: -4,
          transition: {
            duration: 0.2
          }
        }} 
        className="group"
      >
        <Card className="relative h-full w-full border border-border/50 bg-card hover:border-primary/50 hover:shadow-xl transition-all duration-300 overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          {/* Action Buttons */}
          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2 z-50" onClick={e => e.stopPropagation()}>
            {/* Hide Category Button for Employee/Tech Lead */}
            {showHideButton && onHide && <Button variant="ghost" size="sm" onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            onHide(category.id, category.name);
          }} className="h-8 w-8 p-0 bg-background/95 backdrop-blur-sm hover:bg-destructive/10 hover:text-destructive" aria-label={`Hide ${category.name}`}>
                <X className="h-4 w-4" />
              </Button>}
            
            {/* Admin Actions - Only for admin/management role */}
            {isManagerOrAbove && (
              <>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleEdit} 
                  className="h-8 w-8 p-0 bg-primary/10 backdrop-blur-sm hover:bg-primary/20 hover:text-primary border border-primary/20" 
                  aria-label={`Edit ${category.name}`}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleDelete} 
                  className="h-8 w-8 p-0 bg-destructive/10 backdrop-blur-sm hover:bg-destructive/20 hover:text-destructive border border-destructive/20" 
                  aria-label={`Delete ${category.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          <CardHeader className="pb-4 px-6 pt-6">
            <div className="space-y-2">
              <motion.h3 className="text-xl font-semibold text-foreground line-clamp-2" whileHover={{
                scale: 1.01
              }} transition={{
                duration: 0.2
              }}>
                {category.name}
              </motion.h3>
              
              {category.description && <p className="text-sm text-muted-foreground line-clamp-2">
                  {category.description}
                </p>}
            </div>
          </CardHeader>

          <CardContent className="px-6 pb-6 pt-0 space-y-3">
            {/* Rating Stats Grid - High, Medium, Low in one row */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={e => {
              handleRatingClick('high', e);
            }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 border border-border hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-all duration-200 cursor-pointer group/stat" type="button">
                <div className="text-2xl font-bold text-foreground group-hover/stat:text-emerald-600 transition-colors">{ratingCounts.high}</div>
                <div className="text-xs font-medium text-muted-foreground group-hover/stat:text-emerald-600 transition-colors mt-1">High</div>
              </button>
              
              <button onClick={e => {
              handleRatingClick('medium', e);
            }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 border border-border hover:border-blue-500/50 hover:bg-blue-50/50 transition-all duration-200 cursor-pointer group/stat" type="button">
                <div className="text-2xl font-bold text-foreground group-hover/stat:text-blue-600 transition-colors">{ratingCounts.medium}</div>
                <div className="text-xs font-medium text-muted-foreground group-hover/stat:text-blue-600 transition-colors mt-1">Medium</div>
              </button>
              
              <button onClick={e => {
              handleRatingClick('low', e);
            }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 border border-border hover:border-amber-500/50 hover:bg-amber-50/50 transition-all duration-200 cursor-pointer group/stat" type="button">
                <div className="text-2xl font-bold text-foreground group-hover/stat:text-amber-600 transition-colors">{ratingCounts.low}</div>
                <div className="text-xs font-medium text-muted-foreground group-hover/stat:text-amber-600 transition-colors mt-1">Low</div>
              </button>
            </div>

            {/* Second Row - Pending, Empty space, Update */}
            <div className="grid grid-cols-3 gap-3">
              <button onClick={e => {
                handlePendingClick(e);
              }} className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 border border-border hover:border-slate-500/50 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer group/stat" type="button">
                <div className="text-2xl font-bold text-foreground group-hover/stat:text-slate-600 transition-colors">{pendingCount}</div>
                <div className="text-xs font-medium text-muted-foreground group-hover/stat:text-slate-600 transition-colors mt-1">Pending</div>
              </button>

              {/* Empty space below Medium */}
              <div className="flex flex-col items-center justify-center p-4 rounded-lg"></div>

              <button onClick={e => {
                handleUpdateClick(e);
              }} className="justify-self-end self-end w-[60%] h-[60%] flex items-center justify-center p-2.5 rounded-xl bg-primary border-0 hover:bg-primary/90 hover:shadow-lg transition-all duration-200 cursor-pointer" type="button">
                <div className="text-sm font-semibold text-primary-foreground">Update</div>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AddCategoryModal open={showEditModal} onOpenChange={setShowEditModal} category={category} onSuccess={() => {
      setShowEditModal(false);
      onRefresh();
    }} />

      <ApprovedRatingsModal open={showApprovedModal} onOpenChange={setShowApprovedModal} categoryName={category.name} ratings={userSkills} skills={skills.filter(skill => skill.category_id === category.id)} subskills={subskills.filter(subskill => skills.some(skill => skill.id === subskill.skill_id && skill.category_id === category.id))} filterRating={selectedRatingFilter} />

      <PendingRatingsModal open={showPendingModal} onOpenChange={setShowPendingModal} categoryName={category.name} ratings={userSkills} skills={skills.filter(skill => skill.category_id === category.id)} subskills={subskills.filter(subskill => skills.some(skill => skill.id === subskill.skill_id && skill.category_id === category.id))} />

      <RejectedRatingsModal open={showRejectedModal} onOpenChange={setShowRejectedModal} categoryName={category.name} ratings={userSkills} skills={skills.filter(skill => skill.category_id === category.id)} subskills={subskills.filter(subskill => skills.some(skill => skill.id === subskill.skill_id && skill.category_id === category.id))} />

      <AdminRatingsDrilldownModal 
        open={showDrilldownModal} 
        onOpenChange={setShowDrilldownModal}
        categoryName={category.name}
        ratingType={drilldownType}
        records={drilldownRecords}
        onRefresh={onRefresh}
      />
    </>;
});

CategoryCard.displayName = "CategoryCard";