import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProjectFormData, ProjectMember, MonthlyManpower } from '../../types/projects';
import ManpowerLimitInput from './ManpowerLimitInput';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO, startOfMonth, addMonths, isBefore, isEqual, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { dateFormatters } from '@/utils/formatters';

// Helper to generate month list from date range
function generateMonthList(startDate: string, endDate: string): string[] {
  const start = startOfMonth(new Date(startDate));
  const end = startOfMonth(new Date(endDate));
  const monthList: string[] = [];
  let current = start;
  while (isBefore(current, end) || isEqual(current, end)) {
    monthList.push(format(current, 'yyyy-MM'));
    current = addMonths(current, 1);
  }
  return monthList;
}

interface StepOneWithDatesProps {
  formData: ProjectFormData;
  setFormData: (data: ProjectFormData) => void;
  isEditMode?: boolean;
  readOnly?: boolean;
  existingMembers?: ProjectMember[];
  /**
   * Called when the user confirms removal of allocation data for specific months
   * in the monthly manpower limits dialog.
   */
  onMonthsDataRemovalConfirmed?: (months: string[]) => void;
}

export default function StepOneWithDates({ formData, setFormData, isEditMode = false, readOnly = false, existingMembers = [], onMonthsDataRemovalConfirmed }: StepOneWithDatesProps) {
  const { profile } = useAuth();
  const [techLeadName, setTechLeadName] = useState<string>('');
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [startMonth, setStartMonth] = useState<Date | undefined>(undefined);
  const [endMonth, setEndMonth] = useState<Date | undefined>(undefined);
  const prevDatesRef = useRef({ startDate: formData.start_date, endDate: formData.end_date });
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Auto-size description textarea on initial load
  useEffect(() => {
    if (descriptionRef.current && formData.description) {
      descriptionRef.current.style.height = 'auto';
      descriptionRef.current.style.height = `${descriptionRef.current.scrollHeight}px`;
    }
  }, []);

  // Reset calendar month when popover opens
  useEffect(() => {
    if (startDateOpen) {
      const parsedDate = formData.start_date ? parseISO(formData.start_date) : undefined;
      setStartMonth(parsedDate && isValid(parsedDate) ? parsedDate : new Date());
    }
  }, [startDateOpen, formData.start_date]);

  useEffect(() => {
    if (endDateOpen) {
      const parsedDate = formData.end_date ? parseISO(formData.end_date) : undefined;
      setEndMonth(parsedDate && isValid(parsedDate) ? parsedDate : new Date());
    }
  }, [endDateOpen, formData.end_date]);

  // Clean up member allocations when date range changes
  const cleanupMemberAllocationsForDateRange = (newStartDate: string, newEndDate: string) => {
    if (!newStartDate || !newEndDate) return;
    
    const validMonths = new Set(generateMonthList(newStartDate, newEndDate));
    
    // Filter out member allocations that are outside the new date range
    const updatedMembers = formData.members.map(member => {
      if (!member.monthly_allocations) return member;
      
      const filteredAllocations = member.monthly_allocations.filter(alloc => 
        validMonths.has(alloc.month)
      );
      
      return {
        ...member,
        monthly_allocations: filteredAllocations
      };
    });
    
    return updatedMembers;
  };

  // Handle date changes with allocation cleanup
  const handleStartDateChange = (date: Date | undefined) => {
    const newStartDate = date ? format(date, 'yyyy-MM-dd') : '';
    setStartDateOpen(false);
    
    if (newStartDate && formData.end_date) {
      const updatedMembers = cleanupMemberAllocationsForDateRange(newStartDate, formData.end_date);
      setFormData({ 
        ...formData, 
        start_date: newStartDate,
        members: updatedMembers || formData.members
      });
    } else {
      setFormData({ ...formData, start_date: newStartDate });
    }
  };

  const handleEndDateChange = (date: Date | undefined) => {
    const newEndDate = date ? format(date, 'yyyy-MM-dd') : '';
    setEndDateOpen(false);
    
    if (formData.start_date && newEndDate) {
      const updatedMembers = cleanupMemberAllocationsForDateRange(formData.start_date, newEndDate);
      setFormData({ 
        ...formData, 
        end_date: newEndDate,
        members: updatedMembers || formData.members
      });
    } else {
      setFormData({ ...formData, end_date: newEndDate });
    }
  };

  // Track when profile is loaded
  useEffect(() => {
    if (profile) {
      setIsProfileLoaded(true);
    }
  }, [profile]);

  // Auto-set tech_lead_id to current user on create (not edit)
  useEffect(() => {
    if (profile && !isEditMode && !formData.tech_lead_id) {
      setFormData({ ...formData, tech_lead_id: profile.user_id });
    }
  }, [profile, isEditMode]);

  // Fetch tech lead name for display
  useEffect(() => {
    const fetchTechLeadName = async () => {
      const techLeadId = formData.tech_lead_id || profile?.user_id;
      if (!techLeadId) return;
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', techLeadId)
          .single();

        if (error) throw error;
        setTechLeadName(data?.full_name || '');
      } catch (error) {
        console.error('Error fetching tech lead name:', error);
      }
    };

    fetchTechLeadName();
  }, [formData.tech_lead_id, profile?.user_id]);

  const isTechLead = profile?.role === 'tech_lead';
  const isManagementOrAdmin = ['management', 'admin'].includes(profile?.role || '');

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="project-name">Project Name *</Label>
        <Input
          id="project-name"
          placeholder="Enter project name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={readOnly}
        />
      </div>

      <div>
        <Label htmlFor="customer-name">Customer Name *</Label>
        <Input
          id="customer-name"
          placeholder="Enter customer name"
          value={formData.customer_name || ''}
          onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
          required
          disabled={readOnly}
        />
      </div>

      <div>
        <Label htmlFor="project-description">Description *</Label>
        <Textarea
          ref={descriptionRef}
          id="project-description"
          placeholder="Enter project description"
          value={formData.description}
          onChange={(e) => {
            setFormData({ ...formData, description: e.target.value });
            // Auto-expand textarea
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          onFocus={(e) => {
            // Adjust height on focus in case content was set programmatically
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
          }}
          required
          disabled={readOnly}
          className="min-h-[36px] resize-none overflow-hidden"
          rows={1}
        />
      </div>

      {/* Tech Lead field - only show after profile is loaded, hidden for Tech Lead users, read-only for Management/Admin */}
      {isProfileLoaded && !isTechLead && (
        <div>
          <Label htmlFor="tech-lead">Tech Lead</Label>
          <Input
            id="tech-lead"
            value={techLeadName || 'Loading...'}
            disabled
            className="bg-muted"
          />
        </div>
      )}

      {readOnly ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="start-date">Start Date *</Label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formData.start_date ? dateFormatters.formatDate(formData.start_date) : 'Not set'}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date">End Date *</Label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-muted">
              <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{formData.end_date ? dateFormatters.formatDate(formData.end_date) : 'Not set'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="start-date">Start Date *</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="start-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.start_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.start_date ? dateFormatters.formatDate(formData.start_date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.start_date ? parseISO(formData.start_date) : undefined}
                  onSelect={handleStartDateChange}
                  month={startMonth}
                  onMonthChange={setStartMonth}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <Label htmlFor="end-date">End Date *</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="end-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.end_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.end_date ? dateFormatters.formatDate(formData.end_date) : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.end_date ? parseISO(formData.end_date) : undefined}
                  onSelect={handleEndDateChange}
                  month={endMonth}
                  onMonthChange={setEndMonth}
                  disabled={(date) => formData.start_date ? date < parseISO(formData.start_date) : false}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <ManpowerLimitInput
        startDate={formData.start_date}
        endDate={formData.end_date}
        monthlyLimits={formData.month_wise_manpower || []}
        onChange={(limits) => setFormData({ ...formData, month_wise_manpower: limits })}
        readOnly={readOnly}
        existingMembers={existingMembers.map(m => ({
          user_id: m.user_id,
          full_name: m.full_name,
          monthly_allocations: m.monthly_allocations
        }))}
        formMembers={formData.members}
        onDataRemovalConfirmed={(affectedMonths) => {
          // Mark allocations for affected months as null so they are deleted in DB on save
          const updatedMembers = formData.members.map(member => ({
            ...member,
            monthly_allocations: member.monthly_allocations?.map(alloc =>
              affectedMonths.includes(alloc.month)
                ? { ...alloc, allocation_percentage: null }
                : alloc
            ),
          }));

          setFormData({ ...formData, members: updatedMembers });

          // Let parent know which months were explicitly confirmed for data removal
          onMonthsDataRemovalConfirmed?.(affectedMonths);
        }}
      />
    </div>
  );
}