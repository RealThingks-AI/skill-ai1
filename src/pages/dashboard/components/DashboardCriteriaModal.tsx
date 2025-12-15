import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DashboardCriteriaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DashboardCriteriaModal = ({ open, onOpenChange }: DashboardCriteriaModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Dashboard Criteria</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* High Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">High</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• Excellent performance metrics</li>
              <li>• Consistent delivery</li>
              <li>• Leadership qualities</li>
              <li>• Strategic thinking</li>
            </ul>
          </div>

          {/* Medium Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Medium</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• Good performance metrics</li>
              <li>• Regular delivery</li>
              <li>• Team collaboration</li>
              <li>• Problem solving</li>
            </ul>
          </div>

          {/* Low Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Low</h3>
            <ul className="space-y-1 text-sm text-muted-foreground ml-4">
              <li>• Basic performance metrics</li>
              <li>• Learning phase</li>
              <li>• Needs guidance</li>
              <li>• Development focus</li>
            </ul>
          </div>

          {/* None Rating */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">None</h3>
            <p className="text-sm text-muted-foreground ml-4">→ No data available</p>
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
