import { dateFormatters } from '@/utils/formatters';

export const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'High':
      return 'bg-emerald-500 text-white';
    case 'Medium':
      return 'bg-blue-500 text-white';
    case 'Low':
      return 'bg-amber-500 text-white';
    default:
      return 'bg-slate-500 text-white';
  }
};

export const getActionColor = (action: string): string => {
  switch (action) {
    case 'Approved':
      return 'bg-green-100 text-green-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatDate = (dateString: string): string => {
  return dateFormatters.formatDate(dateString);
};

export const isOverdue = (dueDate: string): boolean => {
  return new Date(dueDate) < new Date();
};