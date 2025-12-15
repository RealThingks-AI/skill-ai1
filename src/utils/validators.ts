import { VALIDATION_RULES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email.trim()) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true };
};

// Password validation
export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters` 
    };
  }
  
  return { isValid: true };
};

// Name validation
export const validateName = (name: string, fieldName = 'Name'): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    return { 
      isValid: false, 
      error: `${fieldName} must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters` 
    };
  }
  
  if (name.length > VALIDATION_RULES.NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `${fieldName} must be less than ${VALIDATION_RULES.NAME_MAX_LENGTH} characters` 
    };
  }
  
  return { isValid: true };
};

// Skill name validation
export const validateSkillName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Skill name is required' };
  }
  
  if (name.length > VALIDATION_RULES.SKILL_NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Skill name must be less than ${VALIDATION_RULES.SKILL_NAME_MAX_LENGTH} characters` 
    };
  }
  
  return { isValid: true };
};

// Project name validation
export const validateProjectName = (name: string): ValidationResult => {
  if (!name.trim()) {
    return { isValid: false, error: 'Project name is required' };
  }
  
  if (name.length > VALIDATION_RULES.PROJECT_NAME_MAX_LENGTH) {
    return { 
      isValid: false, 
      error: `Project name must be less than ${VALIDATION_RULES.PROJECT_NAME_MAX_LENGTH} characters` 
    };
  }
  
  return { isValid: true };
};

// Required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value.trim()) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
};

// Form validation utilities
export const formValidators = {
  /**
   * Validate multiple fields and return all errors
   */
  validateFields(validations: Record<string, ValidationResult>): Record<string, string> {
    const errors: Record<string, string> = {};
    
    Object.entries(validations).forEach(([field, result]) => {
      if (!result.isValid && result.error) {
        errors[field] = result.error;
      }
    });
    
    return errors;
  },

  /**
   * Check if form has any validation errors
   */
  hasErrors(errors: Record<string, string>): boolean {
    return Object.keys(errors).length > 0;
  }
};