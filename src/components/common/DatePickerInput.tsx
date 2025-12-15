import { useState, useEffect } from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

interface DatePickerInputProps {
  id: string;
  label: string;
  value: string; // ISO format YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  error?: string;
}

export default function DatePickerInput({
  id,
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = 'Select date',
  className,
  minDate,
  maxDate,
  error
}: DatePickerInputProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date | undefined>(undefined);
  
  // Parse the ISO date string to a Date object
  const selectedDate = value ? parseISO(value) : undefined;
  const isValidDate = selectedDate && isValid(selectedDate);
  
  // Format date for display in DD-MMM-YYYY format
  const displayValue = isValidDate ? format(selectedDate, 'dd-MMM-yyyy') : '';
  
  // Reset month to selected date when popover opens
  useEffect(() => {
    if (open) {
      setMonth(isValidDate ? selectedDate : new Date());
    }
  }, [open, isValidDate, selectedDate]);
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // Store in ISO format for form/database
      onChange(format(date, 'yyyy-MM-dd'));
    } else {
      onChange('');
    }
    setOpen(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label 
        htmlFor={id} 
        className={required ? "after:content-['*'] after:ml-0.5 after:text-red-500" : ''}
      >
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-start text-left font-normal',
              !displayValue && 'text-muted-foreground',
              error && 'border-destructive focus-visible:ring-destructive'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue || <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={isValidDate ? selectedDate : undefined}
            onSelect={handleSelect}
            month={month}
            onMonthChange={setMonth}
            disabled={(date) => {
              if (minDate && date < minDate) return true;
              if (maxDate && date > maxDate) return true;
              return false;
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
