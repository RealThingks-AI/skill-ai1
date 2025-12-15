import { useState, useRef, useEffect } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { SkillCategory, Skill, Subskill } from "@/types/database";
interface SearchResult {
  id: string;
  name: string;
  type: 'category' | 'skill' | 'subskill';
  categoryId: string;
  categoryName: string;
  skillId?: string;
  skillName?: string;
  description?: string;
}
interface EnhancedSkillSearchProps {
  categories: SkillCategory[];
  skills: Skill[];
  subskills: Subskill[];
  onSubskillSelect: (subskillId: string, subskillName: string, rating: 'low' | 'medium' | 'high') => void;
  selectedSubskillIds?: string[];
  placeholder?: string;
  className?: string;
}
export const EnhancedSkillSearch = ({
  categories,
  skills,
  subskills,
  onSubskillSelect,
  selectedSubskillIds = [],
  placeholder = "Search skills & subskills...",
  className = ""
}: EnhancedSkillSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showRatingSelection, setShowRatingSelection] = useState(false);
  const [selectedSubskill, setSelectedSubskill] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create unified search results - only subskills
  const createSearchResults = (term: string): SearchResult[] => {
    if (!term.trim()) return [];
    const lowerTerm = term.toLowerCase();
    const results: SearchResult[] = [];

    // Search subskills only
    subskills.forEach(subskill => {
      const skill = skills.find(s => s.id === subskill.skill_id);
      const category = skill ? categories.find(c => c.id === skill.category_id) : null;
      if (skill && category && (subskill.name.toLowerCase().includes(lowerTerm) || subskill.description?.toLowerCase().includes(lowerTerm))) {
        results.push({
          id: `subskill-${subskill.id}`,
          name: subskill.name,
          type: 'subskill',
          categoryId: category.id,
          categoryName: category.name,
          skillId: skill.id,
          skillName: skill.name,
          description: subskill.description
        });
      }
    });
    return results.slice(0, 8); // Limit results
  };
  const searchResults = createSearchResults(searchTerm);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => prev < searchResults.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : searchResults.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && searchResults[focusedIndex]) {
          handleResultClick(searchResults[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setShowRatingSelection(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'subskill') {
      const subskillId = result.id.replace('subskill-', '');
      
      // Check if already selected
      if (selectedSubskillIds.includes(subskillId)) {
        return; // Don't do anything if already selected
      }
      
      // Show rating selection for subskills
      setSelectedSubskill({
        id: subskillId,
        name: result.name
      });
      setShowRatingSelection(true);
      setIsOpen(false);
    }
    setFocusedIndex(-1);
  };
  const handleRatingSelect = (rating: 'low' | 'medium' | 'high') => {
    if (selectedSubskill) {
      onSubskillSelect(selectedSubskill.id, selectedSubskill.name, rating);
      setSearchTerm("");
      setShowRatingSelection(false);
      setSelectedSubskill(null);
      inputRef.current?.focus();
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRatingSelection(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const getBadgeVariant = (type: SearchResult['type']) => {
    switch (type) {
      case 'category':
        return 'default';
      case 'skill':
        return 'secondary';
      case 'subskill':
        return 'outline';
      default:
        return 'default';
    }
  };
  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'category':
        return 'Category';
      case 'skill':
        return 'Skill';
      case 'subskill':
        return 'Subskill';
      default:
        return '';
    }
  };
  return <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input ref={inputRef} placeholder={placeholder} value={searchTerm} onChange={e => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        setShowRatingSelection(false);
        setFocusedIndex(-1);
      }} onFocus={() => {
        if (searchTerm.trim()) setIsOpen(true);
      }} onKeyDown={handleKeyDown} className="pl-10 w-full" />
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
              const subskillId = result.id.replace('subskill-', '');
              const isAlreadySelected = selectedSubskillIds.includes(subskillId);
              
              return <motion.div key={result.id} initial={{
                opacity: 0
              }} animate={{
                opacity: 1
              }} transition={{
                delay: index * 0.05
              }} className={`p-3 border-b border-border/50 last:border-b-0 transition-colors ${
                isAlreadySelected 
                  ? 'opacity-50 cursor-not-allowed bg-muted/30' 
                  : `cursor-pointer hover:bg-muted/50 ${index === focusedIndex ? 'bg-muted' : ''}`
              }`} onClick={() => !isAlreadySelected && handleResultClick(result)}>
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-medium text-sm truncate ${isAlreadySelected ? 'line-through' : ''}`}>
                        {result.name}
                      </span>
                      {isAlreadySelected && (
                        <Badge variant="secondary" className="text-xs">
                          Already Selected
                        </Badge>
                      )}
                    </div>
                    
                    {/* Breadcrumb path */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{result.categoryName}</span>
                      {result.skillName && <>
                          <ChevronRight className="w-3 h-3" />
                          <span>{result.skillName}</span>
                        </>}
                    </div>
                    
                    {/* Description */}
                    {result.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {result.description}
                      </p>}
                  </div>
                  
                  {!isAlreadySelected && <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />}
                </div>
              </motion.div>
            })}
          </motion.div>}
      </AnimatePresence>

      {/* Rating Selection Dropdown */}
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
    </div>;
};