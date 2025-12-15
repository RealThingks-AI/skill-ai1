export interface ApprovalRequest {
  id: string;
  type: string;
  requester: string;
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  submitDate: string;
  dueDate: string;
}

export interface RecentAction {
  id: string;
  action: 'Approved' | 'Rejected';
  title: string;
  approver: string;
  date: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type Priority = 'High' | 'Medium' | 'Low';