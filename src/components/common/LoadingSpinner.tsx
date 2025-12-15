import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  showText?: boolean;
}

export default function LoadingSpinner({ className, showText = true }: LoadingSpinnerProps) {
  // Use smaller spinner when text is hidden (for inline/button usage)
  const spinnerSize = showText ? 'h-12 w-12 border-4' : 'h-4 w-4 border-2';
  
  return (
    <div className={cn(showText ? 'flex flex-col items-center justify-center gap-4' : 'inline-flex', className)}>
      <div 
        className={cn(
          'rounded-full border-primary border-t-transparent animate-spin',
          spinnerSize
        )}
      />
      {showText && (
        <p className="text-base text-muted-foreground animate-fade-in">
          Please wait, your page is loading…
        </p>
      )}
    </div>
  );
}