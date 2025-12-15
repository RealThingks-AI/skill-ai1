import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { dateFormatters } from "@/utils/formatters";

interface LogDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: {
    id: string;
    user_id: string;
    username: string;
    module: string;
    action_type: string;
    description: string;
    record_reference: string | null;
    metadata: any;
    created_at: string;
  } | null;
}

interface ResolvedNames {
  [key: string]: string;
}

export default function LogDetailModal({
  open,
  onOpenChange,
  log
}: LogDetailModalProps) {
  const [resolvedNames, setResolvedNames] = useState<ResolvedNames>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!log || !log.metadata) return;

    const fetchNames = async () => {
      setLoading(true);
      const names: ResolvedNames = {};

      try {
        // Extract all IDs from metadata
        const userIds = new Set<string>();
        const skillIds = new Set<string>();
        const subskillIds = new Set<string>();

        Object.entries(log.metadata).forEach(([key, value]) => {
          if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            if (key.toLowerCase().includes('user') || key.toLowerCase().includes('approver') || key.toLowerCase().includes('employee')) {
              userIds.add(value);
            } else if (key.toLowerCase().includes('skill') && !key.toLowerCase().includes('subskill')) {
              skillIds.add(value);
            } else if (key.toLowerCase().includes('subskill')) {
              subskillIds.add(value);
            }
          }
        });

        // Fetch user names
        if (userIds.size > 0) {
          const { data: users } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', Array.from(userIds));
          
          users?.forEach(user => {
            names[user.user_id] = user.full_name;
          });
        }

        // Fetch skill names
        if (skillIds.size > 0) {
          const { data: skills } = await supabase
            .from('skills')
            .select('id, name')
            .in('id', Array.from(skillIds));
          
          skills?.forEach(skill => {
            names[skill.id] = skill.name;
          });
        }

        // Fetch subskill names
        if (subskillIds.size > 0) {
          const { data: subskills } = await supabase
            .from('subskills')
            .select('id, name')
            .in('id', Array.from(subskillIds));
          
          subskills?.forEach(subskill => {
            names[subskill.id] = subskill.name;
          });
        }

        setResolvedNames(names);
      } catch (error) {
        console.error('Error fetching names:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNames();
  }, [log]);

  const getDisplayValue = (key: string, value: any): string => {
    if (typeof value === 'string' && value.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return resolvedNames[value] || value;
    }
    return typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
  };

  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(672px,90vw)] w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Activity Log Details</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Category</p>
              <Badge variant="outline" className="mt-1">{log.module}</Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Action</p>
              <p className="text-sm mt-1">{log.action_type}</p>
            </div>
          </div>

          <Separator />

          {/* User Info */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Performed By</p>
            <p className="text-sm mt-1">{log.username}</p>
          </div>

          <Separator />

          {/* Timestamp */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
            <p className="text-sm mt-1">
              {dateFormatters.formatDateTimeWithSeconds(log.created_at)}
            </p>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="text-sm mt-1">{log.description}</p>
          </div>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Additional Details</p>
                <div className="bg-muted/50 rounded-md p-3 space-y-2">
                  {Object.entries(log.metadata).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-2">
                      <p className="text-xs font-medium text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}:
                      </p>
                      <p className="text-xs col-span-2 break-all">
                        {getDisplayValue(key, value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
