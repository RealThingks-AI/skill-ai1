import { useState, useRef, useEffect } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

interface EnhancedSearchProps {
  categories: SkillCategory[];
  skills: Skill[];
  subskills: Subskill[];
  onResultClick: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export const EnhancedSearch = ({
  categories,
  skills,
  subskills,
  onResultClick,
  placeholder = "Search all skills...",
  className = ""
}: EnhancedSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Create unified search results
  const createSearchResults = (term: string): SearchResult[] => {
    if (!term.trim()) return [];
    
    const lowerTerm = term.toLowerCase();
    const results: SearchResult[] = [];

    // Search categories
    categories.forEach(category => {
      if (
        category.name.toLowerCase().includes(lowerTerm) ||
        category.description?.toLowerCase().includes(lowerTerm)
      ) {
        results.push({
          id: `category-${category.id}`,
          name: category.name,
          type: 'category',
          categoryId: category.id,
          categoryName: category.name,
          description: category.description
        });
      }
    });

    // Search skills
    skills.forEach(skill => {
      const category = categories.find(c => c.id === skill.category_id);
      if (
        category &&
        (skill.name.toLowerCase().includes(lowerTerm) ||
        skill.description?.toLowerCase().includes(lowerTerm))
      ) {
        results.push({
          id: `skill-${skill.id}`,
          name: skill.name,
          type: 'skill',
          categoryId: category.id,
          categoryName: category.name,
          skillId: skill.id,
          skillName: skill.name,
          description: skill.description
        });
      }
    });

    // Search subskills
    subskills.forEach(subskill => {
      const skill = skills.find(s => s.id === subskill.skill_id);
      const category = skill ? categories.find(c => c.id === skill.category_id) : null;
      
      if (
        skill && category &&
        (subskill.name.toLowerCase().includes(lowerTerm) ||
        subskill.description?.toLowerCase().includes(lowerTerm))
      ) {
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
        setFocusedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => 
          prev > 0 ? prev - 1 : searchResults.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && searchResults[focusedIndex]) {
          handleResultClick(searchResults[focusedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick(result);
    setSearchTerm("");
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.blur();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
            setFocusedIndex(-1);
          }}
          onFocus={() => {
            if (searchTerm.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="pl-10 w-64"
        />
      </div>

      <AnimatePresence>
        {isOpen && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            {searchResults.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`p-3 cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors ${
                  index === focusedIndex ? 'bg-muted' : ''
                }`}
                onClick={() => handleResultClick(result)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getBadgeVariant(result.type)} className="text-xs">
                        {getTypeLabel(result.type)}
                      </Badge>
                      <span className="font-medium text-sm truncate">
                        {result.name}
                      </span>
                    </div>
                    
                    {/* Breadcrumb path */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>{result.categoryName}</span>
                      {result.skillName && (
                        <>
                          <ChevronRight className="w-3 h-3" />
                          <span>{result.skillName}</span>
                        </>
                      )}
                    </div>
                    
                    {/* Description */}
                    {result.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {result.description}
                      </p>
                    )}
                  </div>
                  
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {isOpen && searchTerm.trim() && searchResults.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 p-3 text-center text-sm text-muted-foreground"
        >
          No results found for "{searchTerm}"
        </motion.div>
      )}
    </div>
  );
};