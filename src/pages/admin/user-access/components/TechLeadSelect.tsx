import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, X, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userService, type UserProfile } from "../services/userService";
import { USER_ROLES } from "@/utils/constants";

interface TechLeadSelectProps {
  user: UserProfile;
  onUpdate: () => void;
}

export function TechLeadSelect({ user, onUpdate }: TechLeadSelectProps) {
  const [techLeads, setTechLeads] = useState<UserProfile[]>([]);
  const [selectedTechLead, setSelectedTechLead] = useState<string>(user.tech_lead_id || "none");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadTechLeads = async () => {
      try {
        const users = await userService.getUsers();
        const availableTechLeads = users.filter(u => 
          [USER_ROLES.TECH_LEAD, USER_ROLES.MANAGEMENT, USER_ROLES.ADMIN].includes(u.role as any) &&
          u.user_id !== user.user_id // Don't allow self-assignment
        );
        setTechLeads(availableTechLeads);
      } catch (error) {
        console.error('Error loading tech leads:', error);
      }
    };
    
    if (isEditing) {
      loadTechLeads();
    }
  }, [isEditing, user.user_id]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const techLeadId = selectedTechLead === "none" ? null : selectedTechLead;
      await userService.updateTechLead(user.user_id, techLeadId);
      toast({
        title: "Success",
        description: "Tech lead assignment updated successfully"
      });
      setIsEditing(false);
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update tech lead assignment",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedTechLead(user.tech_lead_id || "none");
    setIsEditing(false);
  };

  // Don't show tech lead assignment for admins, management, or tech leads themselves
  if ([USER_ROLES.ADMIN, USER_ROLES.MANAGEMENT, USER_ROLES.TECH_LEAD].includes(user.role as any)) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">
          {user.tech_lead?.full_name || (
            <span className="text-muted-foreground">Not assigned</span>
          )}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-primary/10"
          onClick={() => setIsEditing(true)}
        >
          <UserCheck className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 min-w-[200px]">
      <Select value={selectedTechLead} onValueChange={setSelectedTechLead}>
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder="Select tech lead..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No tech lead</SelectItem>
          {techLeads
            .filter(techLead => techLead.user_id && techLead.user_id.trim() !== '')
            .map((techLead) => (
              <SelectItem key={techLead.user_id} value={techLead.user_id}>
                <div>
                  <div className="font-medium">{techLead.full_name}</div>
                  <div className="text-xs text-muted-foreground">{techLead.role}</div>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-success/10"
        onClick={handleSave}
        disabled={loading}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 hover:bg-destructive/10"
        onClick={handleCancel}
        disabled={loading}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}