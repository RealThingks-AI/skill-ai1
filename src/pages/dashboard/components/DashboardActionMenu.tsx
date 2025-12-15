import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Upload, Download } from "lucide-react";

interface DashboardActionMenuProps {
  onRefresh: () => void;
}

export const DashboardActionMenu = ({ onRefresh }: DashboardActionMenuProps) => {
  const handleAction = (action: string) => {
    console.log('Dashboard action:', action);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleAction('add')}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('export')}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleAction('import')}>
          <Upload className="mr-2 h-4 w-4" />
          Import Data
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
