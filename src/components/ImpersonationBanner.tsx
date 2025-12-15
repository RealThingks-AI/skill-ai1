import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonation } from '@/contexts/ImpersonationContext';

export function ImpersonationBanner() {
  const { impersonatedUser, isImpersonating, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div className="bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">
          👤 Viewing as <strong>{impersonatedUser.fullName}</strong> — {impersonatedUser.role}
          <span className="ml-2 text-orange-100 text-sm">(Read-only mode)</span>
        </span>
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={stopImpersonation}
        className="bg-white text-orange-600 hover:bg-orange-50"
      >
        <X className="h-4 w-4 mr-2" />
        Return to Admin
      </Button>
    </div>
  );
}
