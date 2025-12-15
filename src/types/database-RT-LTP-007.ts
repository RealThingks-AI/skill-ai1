export interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: 'employee' | 'tech_lead' | 'management' | 'admin';
  department?: string;
  status?: 'active' | 'inactive';
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  created_at: string;
}

export interface Skill {
  id: string;
  category_id: string;
  name: string;
  description?: string;
  created_at: string;
  category?: SkillCategory;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  rating: 'high' | 'medium' | 'low';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  self_comment?: string;
  approver_comment?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  skill?: Skill;
  approver?: Profile;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold';
  tech_lead_id?: string;
  created_by: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
  tech_lead?: Profile;
  creator?: Profile;
}

export interface ProjectAssignment {
  id: string;
  project_id: string;
  user_id: string;
  assigned_by: string;
  created_at: string;
  project?: Project;
  user?: Profile;
  assigner?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
}