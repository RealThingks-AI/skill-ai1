export interface SkillRatingHistory {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id?: string;
  rating_type: 'self' | 'approved';
  rating: 'high' | 'medium' | 'low';
  rated_by?: string;
  rating_comment?: string;
  status: 'active' | 'superseded';
  created_at: string;
  superseded_at?: string;
}

export interface ApprovalHistory {
  id: string;
  rating_history_id: string;
  approver_id: string;
  action: 'approved' | 'rejected' | 'requested_revision';
  comment?: string;
  previous_rating?: string;
  new_rating?: string;
  created_at: string;
}

export interface TrainingParticipation {
  id: string;
  user_id: string;
  training_name: string;
  skill_category_id?: string;
  start_date?: string;
  completion_date?: string;
  cost?: number;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  created_at: string;
  updated_at: string;
}

export interface ReportLog {
  id: string;
  generated_by: string;
  report_type: string;
  report_name: string;
  filters?: Record<string, any>;
  status: 'generating' | 'completed' | 'failed';
  records_processed: number;
  file_path?: string;
  error_message?: string;
  execution_time_ms?: number;
  created_at: string;
  completed_at?: string;
}

export interface TrainingBudget {
  id: string;
  department?: string;
  fiscal_year: number;
  allocated_budget: number;
  used_budget: number;
  created_at: string;
  updated_at: string;
}

export interface ReportFilters {
  employee_ids?: string[];
  skill_category_ids?: string[];
  tech_lead_ids?: string[];
  departments?: string[];
  project_ids?: string[];
  start_date?: string;
  end_date?: string;
  rating_type?: 'self' | 'approved' | 'both';
  time_period?: 'monthly' | 'quarterly' | 'yearly';
}

export interface ReportData {
  headers: string[];
  rows: (string | number)[];
  charts?: ChartData[];
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  xAxisKey?: string;
  yAxisKey?: string;
}

export interface GeneratedReport {
  id: string;
  name: string;
  type: string;
  data: ReportData;
  filters: ReportFilters;
  generated_at: string;
  generated_by: string;
}

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  reports: ReportDefinition[];
  color: string;
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  filters: string[];
  data_source: string;
}