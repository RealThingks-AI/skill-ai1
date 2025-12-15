import { useState } from "react";
import { Plus, Info, LayoutGrid, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { CategoryCard } from "./components/CategoryCard";
import { CategoryModal } from "./components/CategoryModal";
import { AddCategoryModal } from "./components/admin/AddCategoryModal";
import { ActionMenu } from "./components/admin/ActionMenu";
import { CriteriaModal } from "./components/CriteriaModal";
import { AddCategorySelectionModal } from "./components/AddCategorySelectionModal";
import { HideCategoryConfirmDialog } from "./components/HideCategoryConfirmDialog";
import { EnhancedSearch } from "./components/EnhancedSearch";
import { SkillsGraphicalView } from "./components/SkillsGraphicalView";
import { useSkills } from "./hooks/useSkills";
import { useCategoryPreferences } from "./hooks/useCategoryPreferences";
import { calculateCategoryProgress } from "./utils/skillHelpers";
import type { SkillCategory } from "@/types/database";
const Skills = () => {
  const [viewMode, setViewMode] = useState<"cards" | "charts">("cards");
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [showCategorySelection, setShowCategorySelection] = useState(false);
  const [categoryToHide, setCategoryToHide] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [targetSkillId, setTargetSkillId] = useState<string | undefined>();
  const [targetSubskillId, setTargetSubskillId] = useState<string | undefined>();
  const {
    isManagerOrAbove,
    profile
  } = useAuth();
  const {
    skillCategories,
    skills,
    subskills,
    userSkills,
    pendingRatings,
    loading,
    fetchData,
    handleSkillRate,
    handleSubskillRate,
    handleToggleNA,
    handleSaveRatings,
    setPendingRatings
  } = useSkills();
  const {
    visibleCategoryIds,
    loading: preferencesLoading,
    addCategories,
    hideCategory
  } = useCategoryPreferences();
  const handleCategoryClick = (category: SkillCategory) => {
    setSelectedCategory(category);
  };
  const handleCloseModal = () => {
    setSelectedCategory(null);
    setPendingRatings(new Map()); // Clear pending ratings when closing modal
    setTargetSkillId(undefined);
    setTargetSubskillId(undefined);
  };
  const handleHideCategory = (categoryId: string, categoryName: string) => {
    setCategoryToHide({
      id: categoryId,
      name: categoryName
    });
  };
  const confirmHideCategory = () => {
    if (categoryToHide) {
      hideCategory(categoryToHide.id, categoryToHide.name);
      setCategoryToHide(null);
    }
  };
  const handleCategorySelected = (categoryId: string) => {
    // Add category to dashboard
    addCategories([categoryId]);

    // Auto-open the category modal
    const category = skillCategories.find(c => c.id === categoryId);
    if (category) {
      setSelectedCategory(category);
    }
  };

  // Get visible categories based on user preferences and sort alphabetically
  // Admins/Management see all categories, employees see only their visible ones
  const visibleCategories = skillCategories.filter(category => isManagerOrAbove || visibleCategoryIds.includes(category.id)).sort((a, b) => {
    // Sort alphabetically by name (A-Z)
    return a.name.localeCompare(b.name);
  });
  // Derive category IDs that already have any ratings
  const ratedCategoryIds = Array.from(new Set(userSkills.map(r => skills.find(s => s.id === r.skill_id)?.category_id).filter(Boolean) as string[]));
  console.log('📊 Total categories:', skillCategories.length, 'Visible categories:', visibleCategories.length, 'IsManagerOrAbove:', isManagerOrAbove);

  // Update handleSearchResultClick to pass target info
  const handleSearchResultClick = (result: any) => {
    const category = skillCategories.find(c => c.id === result.categoryId);
    if (category) {
      // Pass the target skill/subskill info to CategoryModal for auto-expansion
      setSelectedCategory(category);

      // Store target info for CategoryModal
      if (result.type === "skill") {
        setTargetSkillId(result.skillId);
        setTargetSubskillId(undefined);
      } else if (result.type === "subskill") {
        setTargetSkillId(result.skillId);
        setTargetSubskillId(result.id.replace("subskill-", ""));
      } else {
        setTargetSkillId(undefined);
        setTargetSubskillId(undefined);
      }
    }
  };
  if (loading || preferencesLoading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading skills...</p>
        </div>
      </div>;
  }
  return <>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl tracking-tight text-foreground font-medium">Skills</h1>
            {isManagerOrAbove && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                Admin Mode
              </Badge>}
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle - only show for admin in card mode */}
            {isManagerOrAbove && visibleCategories.length > 0 && (
              <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as "cards" | "charts")}>
                <ToggleGroupItem value="cards" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="charts" aria-label="Chart view">
                  <BarChart3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            )}
            
            {/* Enhanced Search - only show if there are visible categories */}
            {visibleCategories.length > 0 && <EnhancedSearch categories={skillCategories} skills={skills} subskills={subskills} onResultClick={handleSearchResultClick} placeholder="Search skills & subskills" />}
            <Button variant="outline" size="sm" onClick={() => setShowCriteria(true)} className="flex items-center gap-2">
              <Info className="w-4 h-4" />
            </Button>

            {isManagerOrAbove && <ActionMenu categories={skillCategories} skills={skills} subskills={subskills} onRefresh={fetchData} />}
          </div>
        </div>

        {/* Category Cards Grid or Charts - Scrollable */}
        <ScrollArea className="flex-1">
          {viewMode === "charts" && isManagerOrAbove ? (
            <SkillsGraphicalView
              categories={visibleCategories}
              skills={skills}
              subskills={subskills}
              allEmployeeRatings={userSkills}
            />
          ) : visibleCategories.length === 0 /* Empty State */ ? <motion.div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] text-center" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} exit={{
          opacity: 0,
          y: -20
        }}>
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {isManagerOrAbove ? "No Categories Yet" : "No Categories Selected"}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {isManagerOrAbove ? "Get started by creating your first skill category." : "Add categories to your dashboard to start tracking your skills. Click the '+ Add Category' button to get started."}
              </p>
              {isManagerOrAbove ? skillCategories.length === 0 && <Button onClick={() => setShowAddCategory(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Category
                  </Button> : <Button onClick={() => setShowCategorySelection(true)} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>}
            </motion.div> : <div className="p-6">
              <motion.div className="grid grid-cols-3 gap-4 auto-rows-fr" layout>
                <AnimatePresence mode="popLayout">
                  {/* Render all visible categories */}
                  {visibleCategories.map((category, index) => <CategoryCard key={category.id} category={category} skillCount={skills.filter(skill => skill.category_id === category.id).length} subskills={subskills} isManagerOrAbove={isManagerOrAbove} onClick={() => handleCategoryClick(category)} onRefresh={fetchData} index={index} userSkills={userSkills} skills={skills} showHideButton={!isManagerOrAbove} onHide={!isManagerOrAbove ? handleHideCategory : undefined} allEmployeeRatings={userSkills} />)}

                  {/* Add Category button for employees */}
                  {!isManagerOrAbove && <motion.div key="add-category" className="border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center p-6 hover:border-muted-foreground/50 transition-colors cursor-pointer group min-h-[200px]" onClick={() => setShowCategorySelection(true)} initial={{
                opacity: 0,
                scale: 0.9
              }} animate={{
                opacity: 1,
                scale: 1
              }} exit={{
                opacity: 0,
                scale: 0.9
              }} whileHover={{
                scale: 1.02
              }} whileTap={{
                scale: 0.98
              }}>
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:bg-muted-foreground/10 transition-colors">
                        <Plus className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                        Add Category
                      </span>
                    </motion.div>}
                </AnimatePresence>
              </motion.div>
            </div>}
        </ScrollArea>
      </div>

      {/* Category Modal */}
      <AnimatePresence>
        {selectedCategory && <CategoryModal category={selectedCategory} skills={skills.filter(skill => skill.category_id === selectedCategory.id)} subskills={subskills} userSkills={userSkills} pendingRatings={pendingRatings} isManagerOrAbove={isManagerOrAbove} isAdmin={profile?.role === 'admin'} profile={profile as any} onClose={handleCloseModal} onSkillRate={handleSkillRate} onSubskillRate={handleSubskillRate} onToggleNA={handleToggleNA} onSaveRatings={handleSaveRatings} onRefresh={fetchData} targetSkillId={targetSkillId} targetSubskillId={targetSubskillId} />}
      </AnimatePresence>

      {/* Add Category Modal */}
      <AddCategoryModal open={showAddCategory} onOpenChange={setShowAddCategory} onSuccess={() => {
      setShowAddCategory(false);
      fetchData();
    }} />

      {/* Criteria Modal */}
      <CriteriaModal open={showCriteria} onOpenChange={setShowCriteria} />

      {/* Category Selection Modal */}
      <AddCategorySelectionModal open={showCategorySelection} onOpenChange={setShowCategorySelection} categories={skillCategories} visibleCategoryIds={visibleCategoryIds} ratedCategoryIds={ratedCategoryIds} onCategorySelected={handleCategorySelected} />

      {/* Hide Category Confirmation Dialog */}
      <HideCategoryConfirmDialog open={!!categoryToHide} onOpenChange={open => !open && setCategoryToHide(null)} categoryName={categoryToHide?.name || ""} onConfirm={confirmHideCategory} />
    </>;
};
export default Skills;