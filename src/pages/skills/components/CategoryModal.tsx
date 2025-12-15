import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SkillRow } from "./SkillRow";
import { SkillDetail } from "./SkillDetail";
import { AddSkillModal } from "./admin/AddSkillModal";
import { AddSubskillModal } from "./admin/AddSubskillModal";
import { EditSkillModal } from "./admin/EditSkillModal";
import { EditSubskillModal } from "./admin/EditSubskillModal";
import { DeleteSkillDialog } from "./admin/DeleteSkillDialog";
import { DeleteSubskillDialog } from "./admin/DeleteSubskillDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SkillCategory, Skill, Subskill, UserSkill, Profile } from "@/types/database";
interface CategoryModalProps {
  category: SkillCategory;
  skills: Skill[];
  subskills: Subskill[];
  userSkills: UserSkill[];
  pendingRatings: Map<string, {
    type: 'skill' | 'subskill';
    id: string;
    rating: 'high' | 'medium' | 'low';
  }>;
  isManagerOrAbove: boolean;
  isAdmin?: boolean;
  profile: Profile | null;
  onClose: () => void;
  onSkillRate: (skillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onSubskillRate: (subskillId: string, rating: 'high' | 'medium' | 'low' | null) => void;
  onToggleNA: (skillId: string, isNA: boolean) => void;
  onSaveRatings: (ratingsWithComments: Array<{
    id: string;
    type: 'skill' | 'subskill';
    rating: 'high' | 'medium' | 'low';
    comment: string;
  }>) => void;
  onRefresh: () => void;
  targetSkillId?: string; // For auto-expansion when coming from search
  targetSubskillId?: string; // For auto-highlighting when coming from search
}
export const CategoryModal = ({
  category,
  skills,
  subskills,
  userSkills,
  pendingRatings,
  isManagerOrAbove,
  isAdmin = false,
  profile,
  onClose,
  onSkillRate,
  onSubskillRate,
  onToggleNA,
  onSaveRatings,
  onRefresh,
  targetSkillId,
  targetSubskillId
}: CategoryModalProps) => {
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showEditSkill, setShowEditSkill] = useState(false);
  const [showDeleteSkill, setShowDeleteSkill] = useState(false);
  const [showAddSubskill, setShowAddSubskill] = useState(false);
  const [showEditSubskill, setShowEditSubskill] = useState(false);
  const [showDeleteSubskill, setShowDeleteSubskill] = useState(false);
  const [skillToEdit, setSkillToEdit] = useState<Skill | null>(null);
  const [skillToDelete, setSkillToDelete] = useState<Skill | null>(null);
  const [subskillToEdit, setSubskillToEdit] = useState<Subskill | null>(null);
  const [subskillToDelete, setSubskillToDelete] = useState<Subskill | null>(null);
  const [pendingSubmit, setPendingSubmit] = useState<string[]>([]);
  const {
    toast
  } = useToast();
  const [commentsMap, setCommentsMap] = useState<Record<string, string>>({});
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());

  // Auto-expand skills when coming from search results
  useEffect(() => {
    if (targetSkillId) {
      setExpandedSkills(prev => new Set([...prev, targetSkillId]));
    }
  }, [targetSkillId]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSkill) {
          setSelectedSkill(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedSkill, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);
  const handleSkillClick = (skill: Skill) => {
    setSelectedSkill(skill);
  };
  const handleBackToSkills = () => {
    setSelectedSkill(null);
  };
  const handleEditSkill = (skill: Skill) => {
    // Ensure delete modal is closed first
    setShowDeleteSkill(false);
    setSkillToDelete(null);
    setSkillToEdit(skill);
    setShowEditSkill(true);
  };
  const handleDeleteSkill = (skill: Skill) => {
    // Ensure edit modal is closed first
    setShowEditSkill(false);
    setSkillToEdit(null);
    setSkillToDelete(skill);
    setShowDeleteSkill(true);
  };
  const handleSubmitRatings = async () => {
    // This function is no longer needed since ratings are submitted immediately
    // but keeping it for backward compatibility if any UI still references it
    toast({
      title: "Ratings Already Submitted",
      description: "All skill ratings are automatically submitted for approval."
    });
  };
  const submittedCount = userSkills.filter(us => skills.map(s => s.id).includes(us.skill_id) && us.status === 'submitted').length;
  const approvedCount = userSkills.filter(us => skills.map(s => s.id).includes(us.skill_id) && us.status === 'approved').length;
  return <motion.div initial={{
    opacity: 0
  }} animate={{
    opacity: 1
  }} exit={{
    opacity: 0
  }} transition={{
    duration: 0.2
  }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div initial={{
      opacity: 0
    }} animate={{
      opacity: 1
    }} exit={{
      opacity: 0
    }} className="absolute inset-0 bg-black/40 backdrop-blur-md" onClick={selectedSkill ? handleBackToSkills : onClose} />

      {/* Modal Content */}
      <motion.div initial={{
      opacity: 0,
      scale: 0.95,
      y: 20
    }} animate={{
      opacity: 1,
      scale: 1,
      y: 0
    }} exit={{
      opacity: 0,
      scale: 0.95,
      y: 20
    }} transition={{
      duration: 0.2,
      ease: "easeOut"
    }} className="relative z-10 w-full max-w-6xl max-h-[95vh] mx-auto">
        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-card/50">
            <div className="flex items-center gap-4">
              {selectedSkill && <Button variant="ghost" size="sm" onClick={handleBackToSkills} className="p-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    {selectedSkill ? selectedSkill.name : category.name}
                  </h2>
                  {isAdmin && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      Admin Mode
                    </Badge>
                  )}
                </div>
                {selectedSkill ? selectedSkill.description : <>
                    {category.description}
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
                      </Badge>
                      {submittedCount > 0 && <Badge variant="secondary" className="text-xs bg-primary/20 text-primary-foreground border-primary/30">
                          {submittedCount} pending
                        </Badge>}
                      {approvedCount > 0 && <Badge variant="secondary" className="text-xs bg-success/20 text-success-foreground border-success/30">
                          {approvedCount} approved
                        </Badge>}
                    </div>
                  </>}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {selectedSkill && isAdmin && <Button variant="default" size="sm" onClick={() => setShowAddSubskill(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subskill
                </Button>}
              
              {!selectedSkill && isAdmin && <Button variant="default" size="sm" onClick={() => setShowAddSkill(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Skill
                </Button>}
              
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              
              
              
              
            </div>
          </div>

          {/* Content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {selectedSkill ? <motion.div key="skill-detail" initial={{
              opacity: 0,
              x: 20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: -20
            }} transition={{
              duration: 0.2
            }}>
                  <SkillDetail skill={selectedSkill} subskills={subskills.filter(s => s.skill_id === selectedSkill.id)} userSkills={userSkills} pendingRatings={pendingRatings} isManagerOrAbove={isManagerOrAbove} onSkillRate={onSkillRate} onSubskillRate={onSubskillRate} onSaveRatings={onSaveRatings} onRefresh={onRefresh} />
                </motion.div> : <motion.div key="skills-list" initial={{
              opacity: 0,
              x: -20
            }} animate={{
              opacity: 1,
              x: 0
            }} exit={{
              opacity: 0,
              x: 20
            }} transition={{
              duration: 0.2
            }}>
                  <CardContent className="p-0">
                    {/* Add Skill Button */}
                    {isManagerOrAbove}

                    {/* Skills List */}
                    <ScrollArea className="h-[calc(95vh-120px)] max-h-[800px]">
                      <div className="p-6 space-y-3">
                        {skills.length === 0 ? <div className="text-center py-12">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                              <Plus className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">
                              No Skills Yet
                            </h3>
                            <p className="text-muted-foreground mb-4">
                              {isManagerOrAbove ? "Start building this category by adding your first skill." : "This category doesn't have any skills yet."}
                            </p>
                            {isAdmin && <Button onClick={() => setShowAddSkill(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Add First Skill
                              </Button>}
                          </div> : skills.map((skill, index) => <motion.div key={skill.id} initial={{
                      opacity: 0,
                      y: 20
                    }} animate={{
                      opacity: 1,
                      y: 0
                    }} transition={{
                      duration: 0.2,
                      delay: index * 0.05,
                      ease: "easeOut"
                    }}>
                              <SkillRow skill={skill} subskills={subskills.filter(s => s.skill_id === skill.id)} userSkills={userSkills} pendingRatings={pendingRatings} isManagerOrAbove={isAdmin} onClick={() => handleSkillClick(skill)} onSkillRate={onSkillRate} onSubskillRate={onSubskillRate} onToggleNA={onToggleNA} onSaveRatings={onSaveRatings} onRefresh={onRefresh} onEditSkill={isAdmin ? () => handleEditSkill(skill) : undefined} onDeleteSkill={isAdmin ? () => handleDeleteSkill(skill) : undefined} targetSubskillId={targetSubskillId} expanded={expandedSkills.has(skill.id)} onToggleExpanded={() => {
                        const newExpanded = new Set(expandedSkills);
                        if (newExpanded.has(skill.id)) {
                          newExpanded.delete(skill.id);
                        } else {
                          newExpanded.add(skill.id);
                        }
                        setExpandedSkills(newExpanded);
                      }} />
                             </motion.div>)}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </motion.div>}
            </AnimatePresence>
          </div>
        </Card>
      </motion.div>

      <AddSkillModal open={showAddSkill} onOpenChange={setShowAddSkill} categoryId={category.id} onSuccess={() => {
      setShowAddSkill(false);
      onRefresh();
    }} />

      <EditSkillModal open={showEditSkill} onOpenChange={setShowEditSkill} skill={skillToEdit} onSuccess={() => {
      setShowEditSkill(false);
      setSkillToEdit(null);
      onRefresh();
    }} />

      <DeleteSkillDialog open={showDeleteSkill} onOpenChange={setShowDeleteSkill} skill={skillToDelete} onSuccess={() => {
      setShowDeleteSkill(false);
      setSkillToDelete(null);
      onRefresh();
    }} />
      <AddSubskillModal open={showAddSubskill} onOpenChange={setShowAddSubskill} skillId={selectedSkill?.id || ''} onSuccess={() => {
      setShowAddSubskill(false);
      onRefresh();
    }} />

      <EditSubskillModal open={showEditSubskill} onOpenChange={setShowEditSubskill} subskill={subskillToEdit} onSuccess={() => {
      setShowEditSubskill(false);
      setSubskillToEdit(null);
      onRefresh();
    }} />

      <DeleteSubskillDialog open={showDeleteSubskill} onOpenChange={setShowDeleteSubskill} subskill={subskillToDelete} onSuccess={() => {
      setShowDeleteSubskill(false);
      setSubskillToDelete(null);
      onRefresh();
    }} />

    </motion.div>;
};