export interface User {
  id: string;
  email: string;
  name: string;
  role: 'Employee' | 'Tech Lead' | 'Management' | 'Admin';
  status: 'Active' | 'Inactive' | 'Pending';
  lastLogin?: string;
  createdAt: string;
}

export interface SystemSetting {
  key: string;
  value: string | number | boolean;
  description: string;
  category: 'General' | 'Security' | 'Notifications' | 'Performance';
}

export interface SecurityAuditItem {
  id: string;
  severity: 'High' | 'Medium' | 'Low';
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  systemHealth: 'Good' | 'Warning' | 'Critical';
}

export type UserRole = 'Employee' | 'Tech Lead' | 'Management' | 'Admin';
export type UserStatus = 'Active' | 'Inactive' | 'Pending';