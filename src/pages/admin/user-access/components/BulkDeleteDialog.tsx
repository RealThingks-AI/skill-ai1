import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { UserAccessService } from "../services/UserAccessService";
import { AlertTriangle } from "lucide-react";
import type { UserProfile } from "../services/userService";

interface BulkDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserProfile[];
  onSuccess: () => void;
}

export function BulkDeleteDialog({ open, onOpenChange, users, onSuccess }: BulkDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  const handleBulkDelete = async () => {
    setDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await UserAccessService.deleteUser(user.user_id);
        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to delete user ${user.email}:`, error);
      }
    }

    setDeleting(false);
    
    if (successCount > 0) {
      toast({
        title: "Success",
        description: `Successfully deleted ${successCount} user(s)${failCount > 0 ? `, ${failCount} failed` : ''}`,
        variant: failCount > 0 ? "destructive" : "default"
      });
      onSuccess();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete users",
        variant: "destructive"
      });
    }

    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete {users.length} User(s)?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. The following users will be permanently deleted:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Alert variant="destructive">
          <AlertDescription>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {users.map((user) => (
                <div key={user.id} className="text-sm">
                  • {user.full_name} ({user.email})
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>

        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleBulkDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting..." : `Delete ${users.length} User(s)`}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
