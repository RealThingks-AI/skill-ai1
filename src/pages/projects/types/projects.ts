export type ProjectStatus = 'awaiting_approval' | 'active' | 'completed' | 'on_hold' | 'rejected';
export type AllocationPercentage = 25 | 50 | 75 | 100;
export type RatingLevel = 'high' | 'medium' | 'low';

export interface ProjectMember {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  allocation_percentage: AllocationPercentage;
  current_total_allocation: number;
  available_capacity: number;
  monthly_allocations?: MemberMonthlyAllocation[];
}

export interface RequiredSkill {
  skill_id: string;
  skill_name: string;
  subskill_id: string;
  subskill_name: string;
  required_rating: RatingLevel;
}

export interface MonthlyManpower {
  month: string; // Format: "YYYY-MM"
  limit: number;
}

export interface MemberMonthlyAllocation {
  month: string; // Format: "YYYY-MM"
  allocation_percentage: AllocationPercentage | null; // null = not set yet
}

// Stores original values when Tech Lead updates need approval
export interface PendingChanges {
  name?: string;
  description?: string;
  customer_name?: string;
  tech_lead_id?: string;
  tech_lead_name?: string; // Store name for display
  start_date?: string;
  end_date?: string;
  month_wise_manpower?: MonthlyManpower[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  customer_name?: string;
  status: ProjectStatus;
  requested_status?: ProjectStatus | null;
  tech_lead_id?: string;
  created_by: string;
  start_date?: string;
  end_date?: string;
  month_wise_manpower?: MonthlyManpower[];
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  pending_changes?: PendingChanges | null;
  members: ProjectMember[];
  required_skills: RequiredSkill[];
  tech_lead?: {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
  creator?: {
    user_id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
}

export interface EmployeeMatch {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  available_capacity: number;
  current_total_allocation: number;
  matched_skills: number;
  total_required_skills: number;
  match_percentage: number;
  skill_details: {
    skill_name: string;
    subskill_name: string;
    user_rating: RatingLevel | 'none';
    required_rating: RatingLevel;
    matches: boolean;
  }[];
}

export interface AllocationHistory {
  id: string;
  project_id: string;
  user_id: string;
  full_name: string;
  previous_allocation: number | null;
  new_allocation: number;
  changed_by: string;
  changed_by_name: string;
  change_reason?: string;
  created_at: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  customer_name?: string;
  tech_lead_id?: string;
  start_date?: string;
  end_date?: string;
  month_wise_manpower?: MonthlyManpower[];
  required_skills: RequiredSkill[];
  members: {
    user_id: string;
    allocation_percentage: AllocationPercentage;
    monthly_allocations?: MemberMonthlyAllocation[];
  }[];
}
