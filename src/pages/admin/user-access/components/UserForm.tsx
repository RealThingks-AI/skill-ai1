import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import FormInput from '@/components/common/FormInput';
import FormSelect from '@/components/common/FormSelect';
import { useToast } from '@/hooks/use-toast';
import { userService, type UserProfile, type CreateUserData, type UpdateUserData } from '../services/userService';
import { USER_ROLES, ROLE_LABELS, type UserRole } from '@/utils/constants';
import { validateEmail, validateName, validatePassword, formValidators } from '@/utils/validators';

interface UserFormProps {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function UserForm({ user, open, onOpenChange, onSuccess }: UserFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: USER_ROLES.EMPLOYEE as UserRole,
    password: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const isEditing = !!user;

  useEffect(() => {
    if (user && open) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        password: ''
      });
    } else if (!open) {
      setFormData({
        email: '',
        full_name: '',
        role: USER_ROLES.EMPLOYEE,
        password: ''
      });
      setErrors({});
    }
  }, [user, open]);

  const validateForm = () => {
    const validations = {
      email: validateEmail(formData.email),
      full_name: validateName(formData.full_name, 'Full name'),
      ...(isEditing ? {} : { password: validatePassword(formData.password) })
    };

    const newErrors = formValidators.validateFields(validations);
    setErrors(newErrors);
    return !formValidators.hasErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);

      if (isEditing) {
        const updateData: UpdateUserData = {
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role
        };
        await userService.updateUser(user.user_id, updateData);
        toast({
          title: "Success",
          description: "User updated successfully"
        });
      } else {
        const createData: CreateUserData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          role: formData.role
        };
        await userService.createUser(createData);
        toast({
          title: "Success", 
          description: "User created successfully"
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? 'update' : 'create'} user`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(425px,90vw)] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit User' : 'Add New User'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update user information and permissions.'
              : 'Create a new user account with role assignment.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="email"
            label="Email"
            type="email"
            value={formData.email}
            onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
            error={errors.email}
            required
          />

          <FormInput
            id="full_name"
            label="Full Name"
            value={formData.full_name}
            onChange={(value) => setFormData(prev => ({ ...prev, full_name: value }))}
            error={errors.full_name}
            required
          />

          <FormSelect
            id="role"
            label="Role"
            value={formData.role}
            onChange={(value) => setFormData(prev => ({ ...prev, role: value as UserRole }))}
            options={roleOptions}
            required
          />

          {!isEditing && (
            <FormInput
              id="password"
              label="Password"
              type="password"
              value={formData.password}
              onChange={(value) => setFormData(prev => ({ ...prev, password: value }))}
              error={errors.password}
              placeholder="Minimum 8 characters"
              required
            />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : (isEditing ? "Update User" : "Create User")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}