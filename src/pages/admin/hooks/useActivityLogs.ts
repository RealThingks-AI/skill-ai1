import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  user_id: string;
  username: string;
  module: string;
  action_type: string;
  description: string;
  record_reference: string | null;
  metadata: any;
  created_at: string;
}

interface PasswordChangeLog {
  id: string;
  user_id: string;
  username: string;
  changed_by_id: string;
  changed_by_username: string;
  trigger_type: string;
  created_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
}

interface UseActivityLogsParams {
  module?: string;
  searchQuery?: string;
  dateRange?: 'last7days' | 'last1month' | 'last3months' | 'last6months';
  userId?: string;
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useActivityLogs({
  module,
  searchQuery,
  dateRange = 'last7days',
  userId,
  page,
  pageSize,
  sortBy = 'created_at',
  sortOrder = 'desc',
}: UseActivityLogsParams) {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [passwordLogs, setPasswordLogs] = useState<PasswordChangeLog[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      await fetchUsers();
      await fetchLogs();
    };
    loadData();
  }, [module, searchQuery, dateRange, userId, page, sortBy, sortOrder]);

  const fetchLogs = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Calculate date range
      const now = new Date();
      let dateFrom: Date;
      
      switch (dateRange) {
        case 'last7days':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'last1month':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'last3months':
          dateFrom = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'last6months':
          dateFrom = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Helper function to normalize module names from activity_logs table
      const normalizeModule = (module: string): string => {
        // Map old module names to new UI categories
        const moduleMap: Record<string, string> = {
          'Backup': 'Backup & Restore',
          'Restore': 'Backup & Restore',
          'Users': 'Settings',
          'Skills': 'Settings',
          'Approvals': 'Approvals & Rejections',
        };
        return moduleMap[module] || module;
      };

      // Fetch from new activity_logs table
      let newLogsQuery = supabase
        .from("activity_logs")
        .select("*")
        .gte("created_at", dateFrom.toISOString());

      if (userId) {
        newLogsQuery = newLogsQuery.eq("user_id", userId);
      }

      let oldLogsQuery = supabase
        .from("activity_log")
        .select("*")
        .gte("created_at", dateFrom.toISOString());

      if (userId) {
        oldLogsQuery = oldLogsQuery.eq("user_id", userId);
      }

      const [{ data: newLogsData, error: newLogsError }, { data: oldLogsData, error: oldLogsError }] = 
        await Promise.all([newLogsQuery, oldLogsQuery]);

      if (newLogsError) throw newLogsError;
      if (oldLogsError) throw oldLogsError;

      // Transform old logs to match new format
      const profileMap = new Map(users.map(u => [u.user_id, u.full_name]));
      
      // Helper function to determine module from entity_type
      const getModuleFromEntityType = (entityType: string, action: string, metadata: any) => {
        // Auth logs
        if (entityType === 'auth' || action === 'login' || action === 'logout' || action === 'sign_in' || action === 'sign_out') {
          return 'Auth';
        }
        
        // Settings logs (page access, role changes, system settings)
        if (entityType === 'page_access' || entityType === 'role_change' || entityType === 'system_settings' || 
            action === 'update_page_access' || action === 'update_role') {
          return 'Settings';
        }
        
        // Project logs
        if (entityType === 'project' || action.includes('project') || 
            action === 'create_project' || action === 'update_project' || action === 'assign_project' || action === 'approve_project') {
          return 'Projects';
        }
        
        // Password changes
        if (entityType === 'password_change' || action === 'password_change' || action === 'password_reset') {
          return 'Profile & Password Updates';
        }
        
        // Backup & Restore
        if (entityType === 'backup' || entityType === 'restore' || action.includes('backup') || action.includes('restore') || action.includes('import') || action.includes('export')) {
          return 'Backup & Restore';
        }
        
        // Reports
        if (entityType === 'report' || action.includes('report') || action === 'generate_report') {
          return 'Reports';
        }
        
        // Approvals
        if (entityType === 'approval' || action === 'approve' || action === 'reject' || action.includes('approval')) {
          return 'Approvals & Rejections';
        }
        
        // Default to Settings for unknown types
        return 'Settings';
      };
      
      const transformedOldLogs: ActivityLog[] = (oldLogsData || []).map((log: any) => ({
        id: log.id,
        user_id: log.user_id,
        username: profileMap.get(log.user_id) || 'Unknown User',
        module: getModuleFromEntityType(log.entity_type, log.action, log.metadata),
        action_type: log.action,
        description: `${log.action} - ${log.entity_type}`,
        record_reference: log.entity_id,
        metadata: log.metadata,
        created_at: log.created_at,
      }));

      // Normalize module names in new logs
      const normalizedNewLogs: ActivityLog[] = (newLogsData || []).map((log: any) => ({
        ...log,
        username: profileMap.get(log.user_id) || 'Unknown User',
        module: normalizeModule(log.module),
      }));

      // Combine both sources
      let combinedLogs = [...normalizedNewLogs, ...transformedOldLogs];

      // Apply filters
      if (module) {
        combinedLogs = combinedLogs.filter(log => log.module === module);
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        combinedLogs = combinedLogs.filter(log =>
          log.description?.toLowerCase().includes(query) ||
          log.action_type?.toLowerCase().includes(query) ||
          log.username?.toLowerCase().includes(query)
        );
      }

      // Sort and paginate
      combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const paginatedLogs = combinedLogs.slice((page - 1) * pageSize, page * pageSize);

      setLogs(paginatedLogs);

      // Fetch additional log sources in parallel
      const approvalQuery = supabase
        .from("approval_audit_logs")
        .select("*")
        .gte("created_at", dateFrom.toISOString());
      const importExportQuery = supabase
        .from("import_export_logs")
        .select("*")
        .gte("created_at", dateFrom.toISOString());
      const reportQuery = supabase
        .from("report_logs")
        .select("*")
        .gte("created_at", dateFrom.toISOString());
      const passwordQuery = supabase
        .from("password_change_logs")
        .select("*")
        .gte("created_at", dateFrom.toISOString());
      const projectHistoryQuery = supabase
        .from("project_allocation_history")
        .select("*")
        .gte("created_at", dateFrom.toISOString());

      if (userId) {
        approvalQuery.eq("approver_id", userId);
        importExportQuery.eq("user_id", userId);
        reportQuery.eq("generated_by", userId);
        // show changes triggered for a specific user or by a specific user
        passwordQuery.or(`user_id.eq.${userId},changed_by_id.eq.${userId}`);
        projectHistoryQuery.or(`changed_by.eq.${userId},user_id.eq.${userId}`);
      }

      const [
        { data: approvalData, error: approvalError },
        { data: importExportData, error: importExportError },
        { data: reportData, error: reportError },
        { data: passwordData, error: passwordError },
        { data: projectHistoryData, error: projectHistoryError },
      ] = await Promise.all([
        approvalQuery,
        importExportQuery,
        reportQuery,
        passwordQuery,
        projectHistoryQuery,
      ]);

      if (approvalError) throw approvalError;
      if (importExportError) throw importExportError;
      if (reportError) throw reportError;
      if (passwordError) throw passwordError;
      if (projectHistoryError) throw projectHistoryError;

      const mapName = (uid: string) => profileMap.get(uid) || "Unknown User";

      const approvalLogs: ActivityLog[] = (approvalData || []).map((a: any) => ({
        id: a.id,
        user_id: a.approver_id,
        username: mapName(a.approver_id),
        module: "Approvals & Rejections",
        action_type: a.action,
        description: `Status ${a.previous_status} → ${a.new_status}${a.approver_comment ? ` — ${a.approver_comment}` : ""}`,
        record_reference: a.rating_id,
        metadata: { ...a.metadata, previous_status: a.previous_status, new_status: a.new_status, approver_comment: a.approver_comment, employee_comment: a.employee_comment },
        created_at: a.created_at,
      }));

      const importExportLogs: ActivityLog[] = (importExportData || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        username: mapName(e.user_id),
        module: "Backup & Restore",
        action_type: e.action,
        description: `${e.operation_type} ${e.entity_type}${e.entity_name ? ` — ${e.entity_name}` : ""}${e.log_level ? ` [${e.log_level}]` : ""}`,
        record_reference: e.entity_name,
        metadata: { ...e.details, operation_type: e.operation_type, entity_type: e.entity_type, log_level: e.log_level },
        created_at: e.created_at,
      }));

      const reportLogs: ActivityLog[] = (reportData || []).map((r: any) => ({
        id: r.id,
        user_id: r.generated_by,
        username: mapName(r.generated_by),
        module: "Reports",
        action_type: r.report_type || r.status,
        description: `${r.report_name} — ${r.status}${r.records_processed ? `, ${r.records_processed} recs` : ""}${r.error_message ? `, error: ${r.error_message}` : ""}`,
        record_reference: r.file_path,
        metadata: { filters: r.filters, exec_ms: r.execution_time_ms },
        created_at: r.created_at,
      }));

      const pwdLogs: ActivityLog[] = (passwordData || []).map((p: any) => ({
        id: p.id,
        user_id: p.changed_by_id,
        username: p.changed_by_username,
        module: "Profile & Password Updates",
        action_type: "password_change",
        description: `Password changed for ${p.username} by ${p.changed_by_username} (${p.trigger_type})`,
        record_reference: p.user_id,
        metadata: { trigger_type: p.trigger_type, affected_user: p.username, changed_by: p.changed_by_username },
        created_at: p.created_at,
      }));

      const projectHistoryLogs: ActivityLog[] = (projectHistoryData || []).map((h: any) => ({
        id: h.id,
        user_id: h.changed_by,
        username: mapName(h.changed_by),
        module: "Projects",
        action_type: "allocation_change",
        description: `${h.change_reason || 'Project allocation changed'}${h.user_id !== h.changed_by ? ` for ${mapName(h.user_id)}` : ''}`,
        record_reference: h.project_id,
        metadata: { change_reason: h.change_reason, affected_user: h.user_id, previous_allocation: h.previous_allocation, new_allocation: h.new_allocation },
        created_at: h.created_at,
      }));

      // Merge all
      combinedLogs = [...combinedLogs, ...approvalLogs, ...importExportLogs, ...reportLogs, ...pwdLogs, ...projectHistoryLogs];

      // Apply module filter again after merging
      if (module) {
        combinedLogs = combinedLogs.filter(log => log.module === module);
      }

      // Apply search filter again
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        combinedLogs = combinedLogs.filter(log =>
          log.description?.toLowerCase().includes(query) ||
          log.action_type?.toLowerCase().includes(query) ||
          log.username?.toLowerCase().includes(query)
        );
      }

      // Sort based on selected column
      combinedLogs.sort((a, b) => {
        let aVal: any, bVal: any;
        
        switch (sortBy) {
          case 'module':
            aVal = a.module || '';
            bVal = b.module || '';
            break;
          case 'action_type':
            aVal = a.action_type || '';
            bVal = b.action_type || '';
            break;
          case 'username':
            aVal = a.username || '';
            bVal = b.username || '';
            break;
          case 'description':
            aVal = a.description || '';
            bVal = b.description || '';
            break;
          case 'created_at':
          default:
            aVal = new Date(a.created_at).getTime();
            bVal = new Date(b.created_at).getTime();
            break;
        }

        if (typeof aVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
      });

      setTotalCount(combinedLogs.length);
      const finalPage = combinedLogs.slice((page - 1) * pageSize, page * pageSize);

      setLogs(finalPage);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      setError(error.message);
      toast.error("Failed to fetch logs: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name")
        .order("full_name");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
    }
  };

  return {
    logs,
    passwordLogs,
    isLoading,
    error,
    users,
    totalCount,
    refetch: fetchLogs,
  };
}
