import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, Plus, Search, Filter, MoreHorizontal, Users, UserPlus, Shield, Settings, RefreshCw, Edit, Key, UserCheck, UserX, Trash2, Upload, Trash, ArrowUpDown, ArrowUp, ArrowDown, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserAccessService } from "./services/UserAccessService";
import { UserFormDialog } from "./components/UserFormDialog";
import { DeleteUserDialog } from "./components/DeleteUserDialog";
import { PasswordResetDialog } from "./components/PasswordResetDialog";
import { BulkImportDialog } from "./components/BulkImportDialog";
import { BulkDeleteDialog } from "./components/BulkDeleteDialog";
import { USER_ROLES, USER_STATUS, ROLE_LABELS, STATUS_LABELS } from "@/utils/constants";
import type { UserProfile } from "./services/userService";
import { TechLeadSelect } from "./components/TechLeadSelect";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { useNavigate } from "react-router-dom";
import { dateFormatters } from "@/utils/formatters";
interface UserAccessProps {
  onBack: () => void;
}
export default function UserAccess({
  onBack
}: UserAccessProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [showUserForm, setShowUserForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('full_name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const {
    toast
  } = useToast();
  const {
    startImpersonation
  } = useImpersonation();
  const navigate = useNavigate();
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UserAccessService.getUsers();
      console.log('Loaded users data:', data); // Debug log
      setUsers(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadUsers();
  }, []);
  const handleCreateUser = () => {
    setSelectedUser(null);
    setShowUserForm(true);
  };
  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowUserForm(true);
  };
  const handleDeleteUser = (user: UserProfile) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };
  const handlePasswordReset = (user: UserProfile) => {
    setSelectedUser(user);
    setShowPasswordDialog(true);
  };
  const handleToggleStatus = async (user: UserProfile) => {
    try {
      const newStatus = user.status === USER_STATUS.ACTIVE ? USER_STATUS.INACTIVE : USER_STATUS.ACTIVE;
      await UserAccessService.toggleUserStatus(user.user_id, newStatus);
      toast({
        title: "Success",
        description: `User ${newStatus === USER_STATUS.ACTIVE ? 'activated' : 'deactivated'} successfully`
      });
      loadUsers();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };
  const handleLoginAsUser = (user: UserProfile) => {
    startImpersonation({
      userId: user.user_id,
      fullName: user.full_name,
      role: user.role,
      email: user.email
    });
    toast({
      title: "Impersonation Started",
      description: `Now viewing as ${user.full_name}`
    });
    navigate('/');
  };
  const getRoleColor = (role: string) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'bg-destructive text-destructive-foreground';
      case USER_ROLES.MANAGEMENT:
        return 'bg-primary text-primary-foreground';
      case USER_ROLES.TECH_LEAD:
        return 'bg-success text-success-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };
  const getStatusColor = (status: string) => {
    return status === USER_STATUS.ACTIVE ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground';
  };
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };
  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };
  const handleBulkDelete = () => {
    const usersToDelete = users.filter(u => selectedUsers.has(u.id));
    if (usersToDelete.length > 0) {
      setShowBulkDelete(true);
    }
  };
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  const SortIcon = ({
    column
  }: {
    column: string;
  }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    return sortDirection === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />;
  };
  const filteredUsers = users.filter(user => user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())).sort((a, b) => {
    let aValue: any = a[sortColumn as keyof UserProfile];
    let bValue: any = b[sortColumn as keyof UserProfile];

    // Handle null/undefined values
    if (!aValue) aValue = '';
    if (!bValue) bValue = '';

    // Handle date sorting
    if (sortColumn === 'last_login' || sortColumn === 'created_at') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    }

    // Handle string sorting
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    // Handle numeric sorting
    return sortDirection === 'asc' ? aValue > bValue ? 1 : -1 : bValue > aValue ? 1 : -1;
  });
  return <div className="h-full flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">User & Access Management</h1>
        <div className="flex items-center gap-2">
          {selectedUsers.size > 0 && <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash className="mr-2 h-4 w-4" />
              Delete ({selectedUsers.size})
            </Button>}
          <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Import
          </Button>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Directory</CardTitle>
              
            </div>
            <div className="relative w-80">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search users by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6">
              <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length} onCheckedChange={handleSelectAll} />
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('full_name')}>
                    Display Name
                    <SortIcon column="full_name" />
                  </Button>
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('email')}>
                    Email
                    <SortIcon column="email" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('role')}>
                    Role
                    <SortIcon column="role" />
                  </Button>
                </TableHead>
                <TableHead>Tech Lead</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('status')}>
                    Status
                    <SortIcon column="status" />
                  </Button>
                </TableHead>
                <TableHead className="hidden lg:table-cell">
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('last_login')}>
                    Last Login
                    <SortIcon column="last_login" />
                  </Button>
                </TableHead>
                <TableHead className="hidden xl:table-cell">
                  <Button variant="ghost" size="sm" className="h-auto p-0 hover:bg-transparent font-medium" onClick={() => handleSort('created_at')}>
                    Created At
                    <SortIcon column="created_at" />
                  </Button>
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading users...
                  </TableCell>
                </TableRow> : filteredUsers.length === 0 ? <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    No users found
                  </TableCell>
                </TableRow> : filteredUsers.map(user => <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox checked={selectedUsers.has(user.id)} onCheckedChange={() => handleSelectUser(user.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{user.full_name}</p>
                        <p className="text-sm text-muted-foreground md:hidden">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <p className="text-sm">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <TechLeadSelect user={user} onUpdate={loadUsers} />
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(user.status || USER_STATUS.ACTIVE)}>
                        {STATUS_LABELS[(user.status || USER_STATUS.ACTIVE) as keyof typeof STATUS_LABELS]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {user.last_login ? dateFormatters.formatDate(user.last_login) : 'Never'}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell">
                      {dateFormatters.formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10" onClick={() => handleEditUser(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Edit User</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue/10" onClick={() => handleLoginAsUser(user)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Login as User</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-warning/10" onClick={() => handlePasswordReset(user)}>
                              <Key className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reset Password</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-success/10" onClick={() => handleToggleStatus(user)}>
                              {user.status === USER_STATUS.ACTIVE ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{user.status === USER_STATUS.ACTIVE ? 'Deactivate User' : 'Reactivate User'}</p>
                          </TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteUser(user)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete User</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>)}
            </TableBody>
          </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserFormDialog user={selectedUser} open={showUserForm} onOpenChange={setShowUserForm} onSuccess={() => {
      loadUsers();
      setShowUserForm(false);
    }} />

      <DeleteUserDialog user={selectedUser} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} onSuccess={() => {
      loadUsers();
      setShowDeleteDialog(false);
    }} />

      <PasswordResetDialog user={selectedUser} open={showPasswordDialog} onOpenChange={setShowPasswordDialog} onSuccess={() => {
      setShowPasswordDialog(false);
    }} />

      <BulkImportDialog open={showBulkImport} onOpenChange={setShowBulkImport} onSuccess={() => {
      loadUsers();
      setShowBulkImport(false);
    }} />

      <BulkDeleteDialog open={showBulkDelete} onOpenChange={setShowBulkDelete} users={users.filter(u => selectedUsers.has(u.id))} onSuccess={() => {
      loadUsers();
      setSelectedUsers(new Set());
      setShowBulkDelete(false);
    }} />
    </div>;
}