import { userAPI } from '../services/api';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  invalidUserIds?: string[];
}

/**
 * Validates task data before submission
 */
export class TaskValidator {
  /**
   * Validate assigned users to ensure they exist and can be assigned
   */
  static async validateAssignedUsers(userIds: string[]): Promise<ValidationResult> {
    if (!userIds || userIds.length === 0) {
      return { isValid: true, errors: [] };
    }

    try {
      const validation = await userAPI.validateAssignableUsers(userIds);
      
      if (validation.valid) {
        return { isValid: true, errors: [] };
      } else {
        const errors: string[] = [];
        const invalidUserIds = validation.invalidUsers || [];
        
        if (invalidUserIds.length > 0) {
          errors.push(`The following users could not be assigned: ${invalidUserIds.join(', ')}`);
        }
        
        if (validation.inactiveUsers && validation.inactiveUsers.length > 0) {
          errors.push(`Some users are inactive and cannot be assigned: ${validation.inactiveUsers.join(', ')}`);
        }
        
        return {
          isValid: false,
          errors,
          invalidUserIds
        };
      }
    } catch (error) {
      console.warn('User validation failed, proceeding with basic validation:', error);
      
      // Fallback: basic validation
      const uniqueUserIds = [...new Set(userIds)];
      const hasInvalidIds = uniqueUserIds.some(id => !id || typeof id !== 'string' || id.length < 12);
      
      if (hasInvalidIds) {
        return {
          isValid: false,
          errors: ['Some user IDs appear to be invalid'],
          invalidUserIds: uniqueUserIds.filter(id => !id || typeof id !== 'string' || id.length < 12)
        };
      }
      
      return { isValid: true, errors: [] };
    }
  }

  /**
   * Validate complete task data
   */
  static async validateTaskData(taskData: any): Promise<ValidationResult> {
    const errors: string[] = [];
    
    // Basic field validation
    if (!taskData.title || taskData.title.trim().length === 0) {
      errors.push('Task title is required');
    }
    
    if (taskData.title && taskData.title.length > 200) {
      errors.push('Task title cannot exceed 200 characters');
    }
    
    if (taskData.description && taskData.description.length > 2000) {
      errors.push('Task description cannot exceed 2000 characters');
    }
    
    // Priority validation
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (taskData.priority && !validPriorities.includes(taskData.priority)) {
      errors.push('Invalid priority value');
    }
    
    // Date validation
    if (taskData.startDate && taskData.endDate) {
      const startDate = new Date(taskData.startDate);
      const endDate = new Date(taskData.endDate);
      
      if (startDate > endDate) {
        errors.push('Start date cannot be after end date');
      }
    }
    
    // Tags validation
    if (taskData.tags && Array.isArray(taskData.tags)) {
      const invalidTags = taskData.tags.filter((tag: any) => 
        typeof tag !== 'string' || tag.length > 50
      );
      if (invalidTags.length > 0) {
        errors.push('Tags must be strings and cannot exceed 50 characters each');
      }
      
      if (taskData.tags.length > 20) {
        errors.push('Cannot have more than 20 tags per task');
      }
    }
    
    // Validate assigned users
    if (taskData.assignedUsers && taskData.assignedUsers.length > 0) {
      const userValidation = await this.validateAssignedUsers(taskData.assignedUsers);
      if (!userValidation.isValid) {
        errors.push(...userValidation.errors);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
