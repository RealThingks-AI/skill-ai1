import { useState } from "react";
import { Plus, Info, LayoutGrid, BarChart3, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/useAuth";
import { DashboardCategoryCard } from "./components/DashboardCategoryCard";
import { DashboardSearch } from "./components/DashboardSearch";
import { DashboardCriteriaModal } from "./components/DashboardCriteriaModal";
import { UserDetailModal } from "./components/UserDetailModal";
import { UserCategoriesModal } from "./components/UserCategoriesModal";
import { CategorySkillsModal } from "./components/CategorySkillsModal";
import { DashboardChartView } from "./components/DashboardChartView";
import { useDashboardData } from "./hooks/useDashboardData";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import ClassificationLogicModal from "./components/ClassificationLogicModal";
type ClassifiedUser = {
  userId: string;
  fullName: string;
  email: string;
  classification: 'expert' | 'intermediate' | 'beginner';
  percentage: number;
  skills: any[];
};
const Dashboard = () => {
  const [viewMode, setViewMode] = useState<"cards" | "charts">("cards");
  const [showCriteria, setShowCriteria] = useState(false);
  const [showLogicModal, setShowLogicModal] = useState(false);
  const {
    isManagerOrAbove,
    profile
  } = useAuth();
  const {
    categoryStats,
    loading,
    refreshData
  } = useDashboardData();
  const [selectedClassification, setSelectedClassification] = useState<{
    categoryId: string;
    categoryName: string;
    classification: 'expert' | 'intermediate' | 'beginner';
    users: ClassifiedUser[];
  } | null>(null);
  const [selectedUser, setSelectedUser] = useState<{
    userName: string;
    userEmail: string;
    categoryName: string;
    skills: any[];
  } | null>(null);

  // New state for user search modals
  const [selectedSearchUser, setSelectedSearchUser] = useState<{
    userId: string;
    userName: string;
    userEmail: string;
  } | null>(null);
  const [selectedCategoryDetail, setSelectedCategoryDetail] = useState<{
    categoryName: string;
    categoryColor: string;
    userName: string;
    userEmail: string;
    percentage: number;
    classification: 'expert' | 'intermediate' | 'beginner';
    skills: any[];
  } | null>(null);
  const handleClassificationClick = (categoryId: string, categoryName: string, classification: 'expert' | 'intermediate' | 'beginner', users: ClassifiedUser[]) => {
    setSelectedClassification({
      categoryId,
      categoryName,
      classification,
      users
    });
  };
  const handleUserClick = (user: ClassifiedUser, categoryName: string) => {
    setSelectedUser({
      userName: user.fullName,
      userEmail: user.email,
      categoryName,
      skills: user.skills
    });
  };
  const handleUserSearchSelect = (user: {
    userId: string;
    fullName: string;
    email: string;
  }) => {
    setSelectedSearchUser({
      userId: user.userId,
      userName: user.fullName,
      userEmail: user.email
    });
  };
  const handleCategoryClick = (categoryData: any) => {
    setSelectedCategoryDetail({
      categoryName: categoryData.categoryName,
      categoryColor: categoryData.categoryColor,
      userName: selectedSearchUser?.userName || '',
      userEmail: selectedSearchUser?.userEmail || '',
      percentage: categoryData.percentage,
      classification: categoryData.classification,
      skills: categoryData.skills
    });
  };
  const handleCloseCategoryDetail = () => {
    setSelectedCategoryDetail(null);
    // Keep UserCategoriesModal open
  };
  const handleCloseUserCategories = () => {
    setSelectedSearchUser(null);
    setSelectedCategoryDetail(null);
  };
  const handleRefresh = () => {
    refreshData();
  };

  // Sort categories alphabetically
  const visibleCategories = [...categoryStats].sort((a, b) => a.name.localeCompare(b.name));

  // Show loading spinner while fetching data
  if (loading) {
    return <div className="h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>;
  }
  return <>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl tracking-tight text-foreground font-medium">Dashboard</h1>
            {isManagerOrAbove && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                Admin Mode
              </Badge>}
          </div>

          <div className="flex items-center gap-3">
            {/* View Toggle - only show for admin in card mode */}
            {isManagerOrAbove && visibleCategories.length > 0 && <ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value as "cards" | "charts")}>
                <ToggleGroupItem value="cards" aria-label="Card view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="charts" aria-label="Chart view">
                  <BarChart3 className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>}
            
            {/* Enhanced Search - Global user search */}
            <DashboardSearch onUserSelect={handleUserSearchSelect} placeholder="Search employees and tech leads" />
            
            <Button variant="outline" size="sm" onClick={() => setShowLogicModal(true)} className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Logic
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => setShowCriteria(true)} className="flex items-center gap-2">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Category Cards Grid - Scrollable */}
        <ScrollArea className="flex-1">
          {viewMode === "charts" && isManagerOrAbove ? <DashboardChartView categoryStats={categoryStats} /> : visibleCategories.length === 0 ? (/* Empty State */
        <motion.div className="flex flex-col items-center justify-center h-full py-16 text-center" initial={{
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
                No Categories Yet
              </h3>
              <p className="text-muted-foreground max-w-md">
                Get started by creating your first dashboard category.
              </p>
            </motion.div>) : <div className="p-6">
              <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" layout>
                <AnimatePresence mode="popLayout">
                  {visibleCategories.map((category, catIndex) => <DashboardCategoryCard key={category.id} category={category} classifications={{
                expertUsers: category.expertUsers,
                intermediateUsers: category.intermediateUsers,
                beginnerUsers: category.beginnerUsers
              }} onClassificationClick={classification => {
                const users = classification === 'expert' ? category.expertUsers : classification === 'intermediate' ? category.intermediateUsers : category.beginnerUsers;
                handleClassificationClick(category.id, category.name, classification, users);
              }} index={catIndex} />)}
                </AnimatePresence>
              </motion.div>
            </div>}
        </ScrollArea>
      </div>

      {/* Criteria Modal */}
      <DashboardCriteriaModal open={showCriteria} onOpenChange={setShowCriteria} />

      {/* Classification Logic Modal */}
      <ClassificationLogicModal
        open={showLogicModal}
        onOpenChange={setShowLogicModal}
        onRulesUpdated={handleRefresh}
      />

      {/* Classification Users Modal */}
      {selectedClassification && <Dialog open={!!selectedClassification} onOpenChange={() => setSelectedClassification(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {selectedClassification.categoryName} - {selectedClassification.classification.charAt(0).toUpperCase() + selectedClassification.classification.slice(1)} Users
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {selectedClassification.users.length} user{selectedClassification.users.length !== 1 ? 's' : ''}
              </p>
            </DialogHeader>

            <div className="space-y-3 mt-4">
              {selectedClassification.users.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">
                  No users in this classification
                </p> : [...selectedClassification.users].sort((a, b) => b.percentage - a.percentage).map(user => <Card key={user.userId} className="p-4 hover:shadow-md transition-all cursor-pointer border-border/50" onClick={() => handleUserClick(user, selectedClassification.categoryName)}>
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{user.fullName}</h4>
                      
                    </div>
                  </Card>)}
            </div>
          </DialogContent>
        </Dialog>}

      {/* User Detail Modal */}
      {selectedUser && <UserDetailModal open={!!selectedUser} onClose={() => setSelectedUser(null)} userName={selectedUser.userName} userEmail={selectedUser.userEmail} categoryName={selectedUser.categoryName} skills={selectedUser.skills} />}
      
      {/* User Categories Modal (from search) */}
      {selectedSearchUser && <UserCategoriesModal open={!!selectedSearchUser} onClose={handleCloseUserCategories} userId={selectedSearchUser.userId} userName={selectedSearchUser.userName} userEmail={selectedSearchUser.userEmail} onCategoryClick={handleCategoryClick} />}

      {/* Category Skills Detail Modal */}
      {selectedCategoryDetail && <CategorySkillsModal open={!!selectedCategoryDetail} onClose={handleCloseCategoryDetail} data={selectedCategoryDetail} />}
    </>;
};
export default Dashboard;