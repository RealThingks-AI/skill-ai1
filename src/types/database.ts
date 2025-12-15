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

export interface Subskill {
  id: string;
  skill_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSkill {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id?: string;
  rating: 'high' | 'medium' | 'low';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  self_comment?: string;
  approver_comment?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  next_upgrade_date?: string;
  skill?: Skill;
  subskill?: Subskill;
  approver?: Profile;
}

export interface EmployeeRating {
  id: string;
  user_id: string;
  skill_id: string;
  subskill_id?: string;
  rating: 'high' | 'medium' | 'low';
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  self_comment?: string;
  approver_comment?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  next_upgrade_date?: string;
  na_status?: boolean;
  skill?: Skill;
  subskill?: Subskill;
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

export interface PersonalGoal {
  id: string;
  user_id: string;
  skill_id: string;
  target_rating: 'high' | 'medium' | 'low';
  current_rating: 'high' | 'medium' | 'low';
  target_date: string;
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  motivation_notes?: string;
  progress_percentage: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  skill?: Skill;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_type: string;
  achievement_name: string;
  description?: string;
  badge_icon?: string;
  earned_at: string;
  goal_id?: string;
  metadata?: any;
}

export interface UserGamification {
  id: string;
  user_id: string;
  total_xp: number;
  level: number;
  goals_set_count: number;
  goals_achieved_count: number;
  current_streak: number;
  best_streak: number;
  last_goal_achieved_date?: string;
  created_at: string;
  updated_at: string;
}

export interface GoalProgressHistory {
  id: string;
  goal_id: string;
  previous_rating?: string;
  new_rating: 'high' | 'medium' | 'low';
  progress_percentage: number;
  milestone_reached?: string;
  notes?: string;
  created_at: string;
}