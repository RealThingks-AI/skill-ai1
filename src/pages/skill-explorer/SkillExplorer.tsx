import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download } from "lucide-react";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import ProjectCreateDialog from "@/pages/projects/components/ProjectCreateDialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CategorySelectionModal } from "./components/CategorySelectionModal";
import { SkillSelectionModal } from "./components/SkillSelectionModal";
import { SubskillSelectionModal } from "./components/SubskillSelectionModal";
import { EnhancedSkillSearch } from "./components/EnhancedSkillSearch";
import { SavePresetDialog } from "./components/SavePresetDialog";
import { LoadPresetDialog } from "./components/LoadPresetDialog";
import { SkillExplorerHeader } from "./components/SkillExplorerHeader";
import { SelectedSkillsPills } from "./components/SelectedSkillsPills";
import { SkillExplorerTable } from "./components/SkillExplorerTable";
import { useSkillExplorerData } from "./hooks/useSkillExplorerData";
import { useSkillExplorerResults } from "./hooks/useSkillExplorerResults";
import { useSkillExplorerPresets } from "./hooks/useSkillExplorerPresets";
import { useEmployeeExplorer } from "./hooks/useEmployeeExplorer";
import { EmployeeExplorerView } from "./components/EmployeeExplorerView";
import { getRatingValueForSubskill, getHighestRatingValue } from "./utils/skillExplorerHelpers";
import { dateFormatters } from "@/utils/formatters";
interface SubskillWithRating {
  subskill: {
    id: string;
    name: string;
    skill_id: string;
  };
  rating: "low" | "medium" | "high";
}
type SortField = "name" | "role" | "matching_count" | "last_updated" | string;
type SortDirection = "asc" | "desc";
export default function SkillExplorer() {
  const {
    profile,
    loading: authLoading,
    isTechLeadOrAbove,
    isAuthenticated
  } = useAuth();
  const {
    toast
  } = useToast();
  // Treat authenticated state with unresolved profile as loading to prevent flicker
  const stillResolvingProfile = isAuthenticated && !profile;
  const hasAccess = !!profile && isTechLeadOrAbove;

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [subskillModalOpen, setSubskillModalOpen] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [loadPresetOpen, setLoadPresetOpen] = useState(false);

  // UI states
  const [activeTab, setActiveTab] = useState<"skills" | "employees">("skills");
  const [searchTerm, setSearchTerm] = useState("");
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("matching_count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedEngineers, setSelectedEngineers] = useState<string[]>([]);
  const [showProjectDialog, setShowProjectDialog] = useState(false);

  // Custom hooks
  const {
    categories,
    skills,
    subskills,
    allCategories,
    allSkills,
    allSubskills,
    selectedCategory,
    selectedSkill,
    pendingSelections,
    setPendingSelections,
    handleCategorySelect,
    handleSkillSelect
  } = useSkillExplorerData(hasAccess);
  const {
    results,
    loading,
    loadResults
  } = useSkillExplorerResults(hasAccess, pendingSelections);
  const {
    handleSavePreset,
    handleLoadPreset,
    submitting
  } = useSkillExplorerPresets(profile);
  const {
    employees,
    loading: employeesLoading
  } = useEmployeeExplorer(hasAccess);

  // Handler functions
  const handleCategorySelectModal = async (category: any) => {
    const success = await handleCategorySelect(category);
    if (success) {
      setCategoryModalOpen(false);
      setSkillModalOpen(true);
    }
  };
  const handleSkillSelectModal = async (skill: any) => {
    const success = await handleSkillSelect(skill);
    if (success) {
      setSkillModalOpen(false);
      setSubskillModalOpen(true);
    }
  };
  const handleSubskillSubmit = async (selections: SubskillWithRating[]) => {
    const newSelections = selections.filter(sel => !pendingSelections.some(existing => existing.subskill_id === sel.subskill.id)).map(sel => ({
      id: `${selectedSkill!.id}-${sel.subskill.id}-${Date.now()}`,
      category: selectedCategory!.name,
      skill: selectedSkill!.name,
      subskill: sel.subskill.name,
      subskill_id: sel.subskill.id,
      skill_id: selectedSkill!.id,
      rating: sel.rating
    }));
    const duplicateCount = selections.length - newSelections.length;
    if (newSelections.length > 0) {
      setPendingSelections(prev => [...prev, ...newSelections]);
    }
    setSubskillModalOpen(false);
    if (duplicateCount > 0) {
      toast({
        title: "Duplicates Skipped",
        description: `${newSelections.length} added, ${duplicateCount} duplicate${duplicateCount !== 1 ? "s" : ""} skipped`,
        variant: "default"
      });
    } else {
      toast({
        title: "Added to selection",
        description: `${newSelections.length} subskill${newSelections.length !== 1 ? "s" : ""} added`
      });
    }
  };
  const handleSearchSubskillSelect = (subskillId: string, subskillName: string, rating: "low" | "medium" | "high") => {
    const existing = pendingSelections.find(s => s.subskill_id === subskillId);
    if (existing) {
      toast({
        title: "Already Selected",
        description: `${subskillName} is already in your selections`,
        variant: "default"
      });
      return;
    }
    const subskill = allSubskills.find(s => s.id === subskillId);
    if (!subskill) return;
    const skill = allSkills.find(s => s.id === subskill.skill_id);
    if (!skill) return;
    const category = allCategories.find(c => c.id === skill.category_id);
    if (!category) return;
    setPendingSelections(prev => [...prev, {
      id: `${skill.id}-${subskill.id}-${Date.now()}`,
      category: category.name,
      skill: skill.name,
      subskill: subskill.name,
      subskill_id: subskill.id,
      skill_id: skill.id,
      rating
    }]);
    toast({
      title: "Subskill Added",
      description: `${subskillName} added with ${rating} rating`
    });
  };
  const handleRemoveSelection = (id: string) => {
    setPendingSelections(prev => prev.filter(sel => sel.id !== id));
  };
  const handleUpdateRating = (id: string, rating: "low" | "medium" | "high") => {
    setPendingSelections(prev => prev.map(sel => sel.id === id ? {
      ...sel,
      rating
    } : sel));
  };
  const handleSaveAll = () => {
    if (!profile || pendingSelections.length === 0) return;
    setSavePresetOpen(true);
  };
  const handleSavePresetConfirm = async (presetName: string) => {
    const success = await handleSavePreset(presetName, pendingSelections);
    if (success) {
      setSavePresetOpen(false);
    }
  };
  const handleLoadPresetConfirm = (selections: any[]) => {
    setPendingSelections(selections);
    setLoadPresetOpen(false);
  };
  const handleExport = () => {
    const csvContent = [["Engineer Name", "Role", ...pendingSelections.map(s => s.subskill)], ...filteredAndSortedResults.map(user => [user.full_name, user.role, ...pendingSelections.map(sel => {
      const skill = user.approved_skills.find(s => s.subskill === sel.subskill);
      return skill ? skill.rating.toUpperCase().charAt(0) : "-";
    })])].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], {
      type: "text/csv"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skill-explorer-${dateFormatters.formatForInput(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };
  const handleToggleEngineer = (userId: string) => {
    setSelectedEngineers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };
  const handleToggleAllEngineers = () => {
    if (selectedEngineers.length === filteredAndSortedResults.length) {
      setSelectedEngineers([]);
    } else {
      setSelectedEngineers(filteredAndSortedResults.map(user => user.user_id));
    }
  };
  const handleAddToProject = () => {
    if (selectedEngineers.length === 0) {
      toast({
        title: "No Engineers Selected",
        description: "Please select at least one engineer to add to a project",
        variant: "destructive"
      });
      return;
    }
    setShowProjectDialog(true);
  };

  // Filter and sort results
  const filteredAndSortedResults = results.filter(user => searchTerm ? user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) : true).sort((a, b) => {
    const isSubskillSort = !["name", "role", "matching_count", "last_updated"].includes(sortField);
    if (isSubskillSort) {
      const aRating = getRatingValueForSubskill(a, sortField);
      const bRating = getRatingValueForSubskill(b, sortField);
      return sortDirection === "asc" ? aRating - bRating : bRating - aRating;
    }
    if (sortField === "matching_count") {
      const countDiff = b.matching_count - a.matching_count;
      if (countDiff !== 0) return sortDirection === "asc" ? -countDiff : countDiff;
      return getHighestRatingValue(b) - getHighestRatingValue(a);
    }
    let aVal: any = a[sortField as keyof typeof a];
    let bVal: any = b[sortField as keyof typeof b];
    if (sortField === "name") {
      aVal = a.full_name;
      bVal = b.full_name;
    }
    if (typeof aVal === "string") {
      return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
  });

  // Single global loading state to avoid double spinners on first load
  const pageLoading = authLoading || stillResolvingProfile || (activeTab === "skills" ? loading && results.length === 0 : employeesLoading);
  if (pageLoading) {
    return <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>;
  }
  if (!hasAccess) {
    return <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4 mx-auto">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground max-w-md">
            The Skill Explorer is only available to Tech Leads, Management, and Administrators.
          </p>
        </div>
      </div>;
  }
  return <div className="h-screen flex flex-col overflow-hidden">
      {activeTab === "skills" && <>
          <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
              <div className="flex items-center gap-4">
                <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                  <button onClick={() => setActiveTab("skills")} className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground shadow-sm">
                    Skill Explorer
                  </button>
                  <button onClick={() => setActiveTab("employees")} className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                    Employee Explorer
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={handleAddToProject} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add to Project
                  {selectedEngineers.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {selectedEngineers.length}
                    </Badge>}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="h-full flex flex-col">
              {/* Search and Add Skill row */}
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <div className="flex-1 max-w-[360px]">
                  <EnhancedSkillSearch categories={allCategories} skills={allSkills} subskills={allSubskills} onSubskillSelect={handleSearchSubskillSelect} selectedSubskillIds={pendingSelections.map(s => s.subskill_id)} placeholder="Search skills & subskills..." />
                </div>
                <Button onClick={() => setCategoryModalOpen(true)} size="default" className="gap-2 shrink-0 transition-all hover:scale-105">
                  <Plus className="h-4 w-4" />
                  Add Skill
                </Button>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-hidden">

                {/* Main Table Container - Full Height */}
                <div className="flex-1 bg-card border rounded-lg overflow-hidden shadow-md flex flex-col">
                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-6 h-16 border-b bg-muted/30 flex-shrink-0">
                    <h2 className="text-base font-semibold">Selected Skills ({pendingSelections.length})</h2>
                    <div className="flex gap-2">
                      {pendingSelections.length > 0 && <>
                          <Button variant="ghost" size="sm" onClick={() => {
                      setPendingSelections([]);
                      setSortField("matching_count");
                      setSortDirection("desc");
                    }} disabled={submitting} className="h-9 px-3 text-sm transition-all hover:scale-105">
                            Clear All
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setLoadPresetOpen(true)} className="h-9 px-3 text-sm transition-all hover:scale-105">
                            Load
                          </Button>
                          <Button size="sm" onClick={handleSaveAll} disabled={submitting} className="h-9 px-3 text-sm transition-all hover:scale-105">
                            Save All
                          </Button>
                        </>}
                      {pendingSelections.length === 0 && <Button variant="outline" size="sm" onClick={() => setLoadPresetOpen(true)} className="h-9 px-3 text-sm transition-all hover:scale-105">
                          Load
                        </Button>}
                    </div>
                  </div>

                  {/* Selected Skills Pills */}
                  {pendingSelections.length > 0 && <div className="flex-shrink-0">
                      <SelectedSkillsPills selections={pendingSelections} onRemove={handleRemoveSelection} onUpdateRating={handleUpdateRating} />
                    </div>}

                  {/* Results Table - Scrollable */}
                  <div className="flex-1 overflow-auto">
                    <SkillExplorerTable loading={loading} results={filteredAndSortedResults} selections={pendingSelections} sortField={sortField} onSort={handleSort} selectedEngineers={selectedEngineers} onToggleEngineer={handleToggleEngineer} onToggleAll={handleToggleAllEngineers} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>}

      {activeTab === "employees" && <>
          <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
                <button onClick={() => setActiveTab("skills")} className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
                  Skill Explorer
                </button>
                <button onClick={() => setActiveTab("employees")} className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-background text-foreground shadow-sm">
                  Employee Explorer
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6 py-4">
            <div className="h-full flex flex-col">
              {/* Search bar */}
              <div className="flex items-center gap-4 mb-4 flex-shrink-0">
                <div className="flex-1 max-w-[360px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Search employees..." value={employeeSearchTerm} onChange={e => setEmployeeSearchTerm(e.target.value)} className="w-full h-10 pl-9 pr-4 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <EmployeeExplorerView employees={employees.filter(emp => employeeSearchTerm ? emp.full_name.toLowerCase().includes(employeeSearchTerm.toLowerCase()) : true)} loading={employeesLoading} />
              </div>
            </div>
          </div>
        </>}

      {/* Modals */}
      <CategorySelectionModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} categories={categories} onSelectCategory={handleCategorySelectModal} />

      <SkillSelectionModal open={skillModalOpen} onClose={() => setSkillModalOpen(false)} skills={skills} categoryName={selectedCategory?.name || ""} onSelectSkill={handleSkillSelectModal} />

      <SubskillSelectionModal open={subskillModalOpen} onClose={() => setSubskillModalOpen(false)} subskills={subskills} skillName={selectedSkill?.name || ""} onSubmit={handleSubskillSubmit} submitting={false} selectedSubskillIds={pendingSelections.map(s => s.subskill_id)} />

      <SavePresetDialog open={savePresetOpen} onClose={() => setSavePresetOpen(false)} selections={pendingSelections} userId={profile?.user_id || ""} onSaved={() => {
      setSavePresetOpen(false);
    }} />

      <LoadPresetDialog open={loadPresetOpen} onClose={() => setLoadPresetOpen(false)} onLoad={handleLoadPresetConfirm} userId={profile?.user_id || ""} />

      <ProjectCreateDialog open={showProjectDialog} onOpenChange={setShowProjectDialog} prefilledSubskills={pendingSelections.map(sel => ({
      skill_id: sel.skill_id,
      subskill_id: sel.subskill_id
    }))} prefilledUserIds={selectedEngineers} onSuccess={() => {
      setShowProjectDialog(false);
      setSelectedEngineers([]);
      toast({
        title: "Success",
        description: "Project created successfully"
      });
    }} />
    </div>;
}