import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle2 } from "lucide-react";
import { dateFormatters } from "@/utils/formatters";

interface Page {
  id: string;
  name: string;
  description: string | null;
  route: string;
  updated_at: string;
}

interface PageAccess {
  id: string;
  page_id: string;
  role_name: string;
  has_access: boolean;
  updated_at: string;
}

interface PageAccessMap {
  [pageId: string]: {
    [role: string]: { id: string; has_access: boolean };
  };
}

const roles = ['admin', 'management', 'tech_lead', 'employee'];

export function PageAccess() {
  const [pages, setPages] = useState<Page[]>([]);
  const [accessMap, setAccessMap] = useState<PageAccessMap>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [pagesRes, accessRes] = await Promise.all([
        supabase.from('pages').select('*').order('name'),
        supabase.from('page_access').select('*')
      ]);

      if (pagesRes.error) throw pagesRes.error;
      if (accessRes.error) throw accessRes.error;

      setPages(pagesRes.data || []);
      
      // Build access map
      const map: PageAccessMap = {};
      (accessRes.data || []).forEach((access: PageAccess) => {
        if (!map[access.page_id]) map[access.page_id] = {};
        map[access.page_id][access.role_name] = {
          id: access.id,
          has_access: access.has_access
        };
      });
      
      setAccessMap(map);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccessToggle = async (pageId: string, role: string, currentAccess: boolean) => {
    const accessId = accessMap[pageId]?.[role]?.id;
    if (!accessId) {
      toast({
        title: "Error",
        description: "Access configuration not found",
        variant: "destructive",
      });
      return;
    }

    setAutoSaving(`${pageId}-${role}`);
    
    try {
      // Get page info for logging
      const page = pages.find(p => p.id === pageId);
      
      const { data, error } = await supabase
        .from('page_access')
        .update({ has_access: !currentAccess, updated_at: new Date().toISOString() })
        .eq('id', accessId)
        .select()
        .single();

      if (error) throw error;

      // Update local state with confirmed data
      setAccessMap(prev => ({
        ...prev,
        [pageId]: {
          ...prev[pageId],
          [role]: {
            id: data.id,
            has_access: data.has_access
          }
        }
      }));

      // Log the activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activity_log').insert({
          user_id: user.id,
          action: data.has_access ? 'granted_access' : 'revoked_access',
          entity_type: 'page_access',
          entity_id: pageId,
          old_value: { has_access: currentAccess, role, page_name: page?.name },
          new_value: { has_access: data.has_access, role, page_name: page?.name },
          metadata: {
            page_id: pageId,
            page_route: page?.route,
            role_name: role,
            changed_at: new Date().toISOString()
          }
        });
      }

      toast({
        title: "Page access updated",
        description: `${role} access ${data.has_access ? 'granted' : 'revoked'} for ${page?.name}`,
      });
    } catch (error: any) {
      console.error('Error updating page access:', error);
      toast({
        title: "Failed to update access",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      // Reload data to ensure UI is in sync
      await loadData();
    } finally {
      setTimeout(() => setAutoSaving(null), 800);
    }
  };

  const filteredPages = pages.filter(page => {
    // Hide /notifications and /profile pages as they're accessible to all users by default
    if (page.route === '/notifications' || page.route === '/profile') {
      return false;
    }
    
    return (
      page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.route.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Page Access Control</CardTitle>
          <CardDescription>
            Manage which roles can access each page in the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by page name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead className="text-center">Administrator</TableHead>
                  <TableHead className="text-center">Management</TableHead>
                  <TableHead className="text-center">Tech Lead</TableHead>
                  <TableHead className="text-center">Employee</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPages.map((page) => (
                  <TableRow key={page.id}>
                    <TableCell className="font-medium">{page.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {page.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{page.route}</Badge>
                    </TableCell>
                    {roles.map((role) => {
                      const hasAccess = accessMap[page.id]?.[role]?.has_access || false;
                      const isSaving = autoSaving === `${page.id}-${role}`;
                      
                      // Always disable all toggles for Admin page to prevent changing admin access
                      const isAdminPage = page.route === '/admin';
                      const isDisabled = isAdminPage;
                      
                      return (
                        <TableCell key={role} className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={hasAccess}
                              onCheckedChange={() => handleAccessToggle(page.id, role, hasAccess)}
                              disabled={isSaving || isDisabled}
                              className={isDisabled ? "opacity-40 cursor-not-allowed" : ""}
                            />
                            {isSaving && (
                              <CheckCircle2 className="h-4 w-4 text-green-500 animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-muted-foreground text-sm">
                      {dateFormatters.formatDate(page.updated_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredPages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No pages found matching your search
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}