import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardCategory {
  id: string;
  name: string;
  description: string | null;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  pendingCount: number;
  skillCount: number;
}

interface DashboardCategoryModalProps {
  category: DashboardCategory;
  onClose: () => void;
}

export const DashboardCategoryModal = ({ category, onClose }: DashboardCategoryModalProps) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[min(1200px,95vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-semibold">{category.name}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {category.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {category.description}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Statistics Grid */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Statistics</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="text-3xl font-bold text-emerald-600">{category.highCount}</div>
                  <div className="text-sm text-emerald-700 mt-1">High Ratings</div>
                </div>
                
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="text-3xl font-bold text-blue-600">{category.mediumCount}</div>
                  <div className="text-sm text-blue-700 mt-1">Medium Ratings</div>
                </div>
                
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-3xl font-bold text-amber-600">{category.lowCount}</div>
                  <div className="text-sm text-amber-700 mt-1">Low Ratings</div>
                </div>
                
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-3xl font-bold text-slate-600">{category.pendingCount}</div>
                  <div className="text-sm text-slate-700 mt-1">Pending</div>
                </div>
              </div>
            </div>

            {/* Category Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Category Information</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-muted-foreground">Total Skills</span>
                  <span className="text-lg font-semibold text-foreground">{category.skillCount}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-muted-foreground">Total Ratings</span>
                  <span className="text-lg font-semibold text-foreground">
                    {category.highCount + category.mediumCount + category.lowCount}
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium text-muted-foreground">Pending Approvals</span>
                  <span className="text-lg font-semibold text-foreground">{category.pendingCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Distribution Chart Placeholder */}
          <div className="mt-6 p-6 rounded-lg bg-muted/30 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">Rating Distribution</h3>
            <div className="flex items-end gap-2 h-40">
              {/* Simple bar chart visualization */}
              <div className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                  className="w-full bg-emerald-500 rounded-t-md transition-all duration-300"
                  style={{ 
                    height: `${category.highCount > 0 ? Math.max((category.highCount / Math.max(category.highCount, category.mediumCount, category.lowCount)) * 100, 10) : 0}%` 
                  }}
                ></div>
                <div className="text-xs font-medium mt-2 text-muted-foreground">High</div>
                <div className="text-sm font-bold text-foreground">{category.highCount}</div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                  className="w-full bg-blue-500 rounded-t-md transition-all duration-300"
                  style={{ 
                    height: `${category.mediumCount > 0 ? Math.max((category.mediumCount / Math.max(category.highCount, category.mediumCount, category.lowCount)) * 100, 10) : 0}%` 
                  }}
                ></div>
                <div className="text-xs font-medium mt-2 text-muted-foreground">Medium</div>
                <div className="text-sm font-bold text-foreground">{category.mediumCount}</div>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-end h-full">
                <div 
                  className="w-full bg-amber-500 rounded-t-md transition-all duration-300"
                  style={{ 
                    height: `${category.lowCount > 0 ? Math.max((category.lowCount / Math.max(category.highCount, category.mediumCount, category.lowCount)) * 100, 10) : 0}%` 
                  }}
                ></div>
                <div className="text-xs font-medium mt-2 text-muted-foreground">Low</div>
                <div className="text-sm font-bold text-foreground">{category.lowCount}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
