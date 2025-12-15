import { userService } from './userService';

// Re-export userService as UserAccessService for backward compatibility
export const UserAccessService = userService;
export default UserAccessService;