import { cn } from "@/lib/utils";

interface RatingPillProps {
  rating: 'high' | 'medium' | 'low' | null;
  onRatingChange: (rating: 'high' | 'medium' | 'low' | null) => void;
  disabled?: boolean;
  availableRatings?: ('high' | 'medium' | 'low')[];
  className?: string;
}

export const RatingPill = ({ rating, onRatingChange, disabled = false, availableRatings, className }: RatingPillProps) => {
  const ratingOptions = [
    { value: 'high' as const, label: 'High', color: 'bg-emerald-500 text-white border-emerald-500' },
    { value: 'medium' as const, label: 'Medium', color: 'bg-blue-500 text-white border-blue-500' },
    { value: 'low' as const, label: 'Low', color: 'bg-amber-500 text-white border-amber-500' }
  ];

  return (
    <div className={cn("flex gap-1", className)}>
      {ratingOptions.map((option) => {
        const isAvailable = !availableRatings || availableRatings.includes(option.value);
        const isCurrentRating = rating === option.value;
        const isClickable = isAvailable && !disabled;
        
        return (
          <button
            key={option.value}
            onClick={() => {
              if (isClickable) {
                // If clicking the same rating, deselect it (set to null)
                onRatingChange(isCurrentRating ? null : option.value);
              }
            }}
            disabled={disabled || !isAvailable}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-all duration-200",
              "border focus:outline-none focus:ring-2 focus:ring-primary/20",
              isCurrentRating
                ? option.color
                : isAvailable 
                  ? "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
                  : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed",
              disabled && "opacity-50 cursor-not-allowed hover:scale-100",
              !isAvailable && !isCurrentRating && "opacity-30"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};