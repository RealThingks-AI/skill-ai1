// Skill Matrix App Constants

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGEMENT: 'management', 
  TECH_LEAD: 'tech_lead',
  EMPLOYEE: 'employee'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// User Status
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive'
} as const;

export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];

// Skill Ratings
export const SKILL_RATINGS = {
  HIGH: 'high',
  MEDIUM: 'medium', 
  LOW: 'low'
} as const;

export type SkillRating = typeof SKILL_RATINGS[keyof typeof SKILL_RATINGS];

// Skill Status
export const SKILL_STATUS = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  APPROVED: 'approved', 
  REJECTED: 'rejected'
} as const;

export type SkillStatus = typeof SKILL_STATUS[keyof typeof SKILL_STATUS];

// Project Status
export const PROJECT_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold'
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error'
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// Role Display Names
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.MANAGEMENT]: 'Management',
  [USER_ROLES.TECH_LEAD]: 'Tech Lead',
  [USER_ROLES.EMPLOYEE]: 'Employee'
};

// Status Display Names
export const STATUS_LABELS: Record<UserStatus, string> = {
  [USER_STATUS.ACTIVE]: 'Active',
  [USER_STATUS.INACTIVE]: 'Inactive'
};

// Default pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Form validation rules
export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  SKILL_NAME_MAX_LENGTH: 100,
  PROJECT_NAME_MAX_LENGTH: 100
} as const;