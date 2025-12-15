import UserForm from './UserForm';

// Re-export UserForm as UserFormDialog for backward compatibility
export { UserForm };
export const UserFormDialog = UserForm;
export default UserFormDialog;