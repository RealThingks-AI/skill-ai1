import { useState, useRef, useEffect } from "react";
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
interface UserSearchResult {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}
interface DashboardSearchProps {
  onUserSelect: (user: UserSearchResult) => void;
  placeholder?: string;
  className?: string;
}
export const DashboardSearch = ({
  onUserSelect,
  placeholder = "Search employees and tech leads...",
  className = ""
}: DashboardSearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search users from database
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const {
          data,
          error
        } = await supabase.from('profiles').select('user_id, full_name, email, role').eq('status', 'active').or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`).order('full_name').limit(10);
        if (error) throw error;
        const results: UserSearchResult[] = (data || []).map(profile => ({
          userId: profile.user_id,
          fullName: profile.full_name,
          email: profile.email,
          role: profile.role
        }));
        setSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

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
        setFocusedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };
  const handleResultClick = (result: UserSearchResult) => {
    onUserSelect(result);
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
  const getRoleBadgeVariant = (role: string) => {
    if (role === 'admin' || role === 'management') return 'default';
    if (role === 'tech_lead') return 'secondary';
    return 'outline';
  };
  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Admin';
    if (role === 'management') return 'Management';
    if (role === 'tech_lead') return 'Tech Lead';
    return 'Employee';
  };
  return <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input ref={inputRef} placeholder={placeholder} value={searchTerm} onChange={e => {
        setSearchTerm(e.target.value);
        setIsOpen(true);
        setFocusedIndex(-1);
      }} onFocus={() => {
        if (searchTerm.trim()) setIsOpen(true);
      }} onKeyDown={handleKeyDown} className="pl-10 w-64" />
      </div>

      <AnimatePresence>
        {isOpen && searchResults.length > 0 && <motion.div initial={{
        opacity: 0,
        y: -10
      }} animate={{
        opacity: 1,
        y: 0
      }} exit={{
        opacity: 0,
        y: -10
      }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto">
            {searchResults.map((result, index) => <motion.div key={result.userId} initial={{
          opacity: 0
        }} animate={{
          opacity: 1
        }} transition={{
          delay: index * 0.05
        }} className={`p-3 cursor-pointer border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors ${index === focusedIndex ? 'bg-muted' : ''}`} onClick={() => handleResultClick(result)}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate">
                      {result.fullName}
                    </span>
                  </div>
                </div>
              </motion.div>)}
          </motion.div>}
      </AnimatePresence>

      {isOpen && searchTerm.trim() && !isSearching && searchResults.length === 0 && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 p-3 text-center text-sm text-muted-foreground">
          No users found for "{searchTerm}"
        </motion.div>}

      {isOpen && isSearching && <motion.div initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 p-3 text-center text-sm text-muted-foreground">
          Searching...
        </motion.div>}
    </div>;
};