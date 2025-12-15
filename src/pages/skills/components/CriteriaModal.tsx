import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface CriteriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CriteriaModal = ({ open, onOpenChange }: CriteriaModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Skill Rating Criteria</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* High Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">High</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• 2+ customer projects</li>
              <li>• 24+ months active</li>
              <li>• 75%+ self-sufficient</li>
              <li>• Can guide in basic & advanced tasks</li>
            </ul>
          </div>

          {/* Medium Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Medium</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• 1+ customer projects</li>
              <li>• 12+ months active</li>
              <li>• 50%+ self-sufficient</li>
              <li>• Can guide in basic tasks only</li>
            </ul>
          </div>

          {/* Low Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Low</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• First project or internal only</li>
              <li>• 3+ months active</li>
              <li>• 25%+ self-sufficient</li>
              <li>• Cannot guide others</li>
            </ul>
          </div>

          {/* None Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">None</h3>
            <p className="text-sm text-muted-foreground ml-4">→ leave blank</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};