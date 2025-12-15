import { useState, useEffect, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Search, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ProjectFormData, RequiredSkill, RatingLevel } from '../../types/projects';
import { motion, AnimatePresence } from 'framer-motion';
interface StepOneProps {
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  prefilledSubskills?: {
    skill_id: string;
    subskill_id: string;
  }[];
}
interface SearchResult {
  id: string;
  name: string;
  categoryName: string;
  skillName: string;
  description?: string;
}
export default function StepOne({
  formData,
  setFormData,
  prefilledSubskills = []
}: StepOneProps) {
  const [subskills, setSubskills] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [showRatingSelection, setShowRatingSelection] = useState(false);
  const [selectedSubskill, setSelectedSubskill] = useState<{
    id: string;
    name: string;
    skillId: string;
    skillName: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetchSubskills();
  }, []);

  // Load prefilled subskills into formData
  useEffect(() => {
    if (prefilledSubskills.length > 0 && subskills.length > 0 && formData.required_skills.length === 0) {
      const prefilledSkills: RequiredSkill[] = prefilledSubskills.map(ps => {
        const subskill = subskills.find(s => s.id === ps.subskill_id);
        if (!subskill) return null;
        return {
          skill_id: ps.skill_id,
          skill_name: subskill.skills.name,
          subskill_id: ps.subskill_id,
          subskill_name: subskill.name,
          required_rating: 'medium' as RatingLevel
        };
      }).filter((s): s is RequiredSkill => s !== null);
      if (prefilledSkills.length > 0) {
        setFormData({
          ...formData,
          required_skills: prefilledSkills
        });
      }
    }
  }, [prefilledSubskills, subskills, formData, setFormData]);
  const fetchSubskills = async () => {
    const {
      data
    } = await supabase.from('subskills').select(`
        *,
        skills!inner(
          id,
          name,
          skill_categories(name)
        )
      `).order('name');
    if (data) setSubskills(data);
  };

  // Create search results
  const createSearchResults = (term: string): SearchResult[] => {
    if (!term.trim()) return [];
    const lowerTerm = term.toLowerCase();
    return subskills.filter(s => s.name.toLowerCase().includes(lowerTerm) || s.skills.name.toLowerCase().includes(lowerTerm) || s.description?.toLowerCase().includes(lowerTerm)).map(s => ({
      id: s.id,
      name: s.name,
      categoryName: s.skills.skill_categories?.name || 'Uncategorized',
      skillName: s.skills.name,
      description: s.description
    })).slice(0, 8);
  };
  const searchResults = createSearchResults(searchTerm);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRatingSelection(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleResultClick = (result: SearchResult) => {
    // Check if already selected
    if (formData.required_skills.some(s => s.subskill_id === result.id)) {
      return;
    }
    const subskill = subskills.find(s => s.id === result.id);
    if (!subskill) return;
    setSelectedSubskill({
      id: result.id,
      name: result.name,
      skillId: subskill.skills.id,
      skillName: subskill.skills.name
    });
    setShowRatingSelection(true);
    setIsOpen(false);
  };
  const handleRatingSelect = (rating: RatingLevel) => {
    if (!selectedSubskill) return;
    setFormData({
      ...formData,
      required_skills: [...formData.required_skills, {
        skill_id: selectedSubskill.skillId,
        skill_name: selectedSubskill.skillName,
        subskill_id: selectedSubskill.id,
        subskill_name: selectedSubskill.name,
        required_rating: rating
      }]
    });
    setSearchTerm('');
    setShowRatingSelection(false);
    setSelectedSubskill(null);
    inputRef.current?.focus();
  };
  const removeSkill = (subskillId: string) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.filter(s => s.subskill_id !== subskillId)
    });
  };
  const updateRating = (subskillId: string, rating: RatingLevel) => {
    setFormData({
      ...formData,
      required_skills: formData.required_skills.map(s => s.subskill_id === subskillId ? {
        ...s,
        required_rating: rating
      } : s)
    });
  };
  return <div className="space-y-4">
      <div className="space-y-3">
        <div ref={containerRef} className="relative">
          <Label className="text-sm">Search and Select Required Subskills</Label>
          <div className="relative mt-2 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input ref={inputRef} placeholder="Search subskills..." value={searchTerm} onChange={e => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setShowRatingSelection(false);
          }} onFocus={() => {
            if (searchTerm.trim()) setIsOpen(true);
          }} className="pl-10" />
          </div>

          {/* Search Results Dropdown */}
          <AnimatePresence>
            {isOpen && searchResults.length > 0 && !showRatingSelection && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
                {searchResults.map((result, index) => {
              const isAlreadySelected = formData.required_skills.some(s => s.subskill_id === result.id);
              return <motion.div key={result.id} initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: index * 0.05
              }} className={`p-3 border-b border-border/50 last:border-b-0 transition-colors ${isAlreadySelected ? 'opacity-50 cursor-not-allowed bg-muted/30' : 'cursor-pointer hover:bg-muted/50'}`} onClick={() => !isAlreadySelected && handleResultClick(result)}>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-medium text-sm truncate ${isAlreadySelected ? 'line-through' : ''}`}>
                              {result.name}
                            </span>
                            {isAlreadySelected && <Badge variant="secondary" className="text-xs">
                                Already Selected
                              </Badge>}
                          </div>
                          
                          {/* Breadcrumb path */}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{result.categoryName}</span>
                            <ChevronRight className="w-3 h-3" />
                            <span>{result.skillName}</span>
                          </div>
                          
                          {result.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {result.description}
                            </p>}
                        </div>
                        
                        {!isAlreadySelected && <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />}
                      </div>
                    </motion.div>;
            })}
              </motion.div>}
          </AnimatePresence>

          {/* Rating Selection */}
          <AnimatePresence>
            {showRatingSelection && selectedSubskill && <motion.div initial={{
            opacity: 0,
            y: -10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 p-4">
                <div className="mb-3">
                  <p className="text-sm font-medium mb-1">Select rating for:</p>
                  <p className="text-sm text-muted-foreground">{selectedSubskill.name}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => handleRatingSelect('low')} variant="outline" size="sm" className="flex-1 hover:bg-blue-500/10 hover:border-blue-500">
                    Low
                  </Button>
                  <Button onClick={() => handleRatingSelect('medium')} variant="outline" size="sm" className="flex-1 hover:bg-amber-500/10 hover:border-amber-500">
                    Medium
                  </Button>
                  <Button onClick={() => handleRatingSelect('high')} variant="outline" size="sm" className="flex-1 hover:bg-emerald-500/10 hover:border-emerald-500">
                    High
                  </Button>
                </div>
              </motion.div>}
          </AnimatePresence>

          {/* No Results */}
          {isOpen && searchTerm.trim() && searchResults.length === 0 && !showRatingSelection && <motion.div initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 p-3 text-center text-sm text-muted-foreground">
              No results found for "{searchTerm}"
            </motion.div>}
        </div>
      </div>

      <div>
        <Label className="text-sm">Selected Skills ({formData.required_skills.length})</Label>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {formData.required_skills.map(skill => (
            <div
              key={skill.subskill_id}
              className="flex items-center gap-2 px-2.5 py-1.5 bg-background border rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 animate-fade-in"
            >
              <span className="text-sm font-medium">{skill.subskill_name}</span>
              <Badge
                onClick={() => {
                  // Cycle through ratings on click
                  const ratings: RatingLevel[] = ['low', 'medium', 'high'];
                  const currentIndex = ratings.indexOf(skill.required_rating);
                  const nextRating = ratings[(currentIndex + 1) % ratings.length];
                  updateRating(skill.subskill_id, nextRating);
                }}
                className={`cursor-pointer text-xs h-5 px-2 transition-all duration-200 hover:scale-110 ${
                  skill.required_rating === 'high'
                    ? 'bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))]/90'
                    : skill.required_rating === 'medium'
                    ? 'bg-[hsl(var(--info))] text-white hover:bg-[hsl(var(--info))]/90'
                    : 'bg-[hsl(var(--warning))] text-white hover:bg-[hsl(var(--warning))]/90'
                }`}
              >
                {skill.required_rating === 'high' ? 'H' : skill.required_rating === 'medium' ? 'M' : 'L'}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="h-5 w-5 p-0 hover:bg-destructive/10 transition-all duration-200 hover:scale-110"
                onClick={() => removeSkill(skill.subskill_id)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>;
}