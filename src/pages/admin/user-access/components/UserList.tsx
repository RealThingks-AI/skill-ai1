import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import DataTable, { type Column } from '@/components/common/DataTable';
import { MoreHorizontal, Users, Edit, Key, Trash2, UserCheck, UserX } from 'lucide-react';
import { dateFormatters, statusFormatters } from '@/utils/formatters';
import { ROLE_LABELS, USER_STATUS } from '@/utils/constants';
import type { UserProfile } from '../services/userService';

interface UserListProps {
  users: UserProfile[];
  loading: boolean;
  onEdit: (user: UserProfile) => void;
  onResetPassword: (user: UserProfile) => void;
  onToggleStatus: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}

export default function UserList({ 
  users, 
  loading, 
  onEdit, 
  onResetPassword, 
  onToggleStatus, 
  onDelete 
}: UserListProps) {
  const columns: Column<UserProfile>[] = [
    {
      key: 'full_name',
      header: 'Name',
      render: (value, user) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      )
    },
    {
      key: 'role',
      header: 'Role',
      render: (value) => (
        <Badge variant="secondary">
          {ROLE_LABELS[value as keyof typeof ROLE_LABELS]}
        </Badge>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <Badge 
          variant={value === USER_STATUS.ACTIVE ? 'default' : 'secondary'}
          className={statusFormatters.getStatusColor(value)}
        >
          {statusFormatters.formatStatus(value)}
        </Badge>
      )
    },
    {
      key: 'last_login',
      header: 'Last Login',
      render: (value) => value ? dateFormatters.formatRelativeTime(value) : 'Never'
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value) => dateFormatters.formatDate(value)
    },
    {
      key: 'user_id',
      header: 'Actions',
      render: (_, user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(user)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResetPassword(user)}>
              <Key className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleStatus(user)}>
              {user.status === USER_STATUS.ACTIVE ? (
                <>
                  <UserX className="mr-2 h-4 w-4" />
                  Deactivate User
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Activate User
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(user)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  return (
    <DataTable
      data={users}
      columns={columns}
      loading={loading}
      searchPlaceholder="Search users..."
      emptyStateTitle="No users found"
      emptyStateDescription="No users have been created yet."
      emptyStateIcon={Users}
    />
  );
}