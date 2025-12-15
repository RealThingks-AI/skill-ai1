export interface SkillRating {
  skillId: string;
  subskillId?: string;
  rating: 'high' | 'medium' | 'low';
  type: 'skill' | 'subskill';
}

export interface PendingRating {
  type: 'skill' | 'subskill';
  id: string;
  rating: 'high' | 'medium' | 'low';
}

export interface SkillFormData {
  name: string;
  description?: string;
  categoryId: string;
}

export interface SubskillFormData {
  name: string;
  description?: string;
  skillId: string;
}

export interface CategoryFormData {
  name: string;
  description?: string;
}