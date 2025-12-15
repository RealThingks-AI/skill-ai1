export interface Report {
  id: string;
  name: string;
  type: string;
  description?: string;
  generatedBy: string;
  generatedAt: string;
  status: 'Ready' | 'Processing' | 'Failed';
  fileUrl?: string;
}

export interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  reports: string[];
  color: string;
}

export interface ReportFilter {
  type?: string;
  status?: 'Ready' | 'Processing' | 'Failed';
  dateFrom?: string;
  dateTo?: string;
}

export type ReportStatus = 'Ready' | 'Processing' | 'Failed';
export type ReportType = 'Skills Analytics' | 'Team Performance' | 'Project Reports' | 'Compliance';