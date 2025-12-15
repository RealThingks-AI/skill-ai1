import { Button } from "@/components/ui/button";
import { Download, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SkillExplorerHeaderProps {
  onExport: () => void;
  onAddToProject: () => void;
  selectedCount: number;
}

export function SkillExplorerHeader({
  onExport,
  onAddToProject,
  selectedCount,
}: SkillExplorerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Skill Explorer</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="outline" size="default" onClick={onExport} className="gap-2 transition-all hover:scale-105">
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button
          variant="outline"
          size="default"
          onClick={onAddToProject}
          className="gap-2 transition-all hover:scale-105 relative"
        >
          <UserPlus className="h-4 w-4" />
          Add to Project
          {selectedCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {selectedCount}
            </Badge>
          )}
        </Button>
      </div>
    </div>
  );
}