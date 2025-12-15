import { supabase } from '@/integrations/supabase/client';
import type { UserRole } from '@/utils/constants';

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

export interface UpdateUserData {
  email?: string;
  full_name?: string;
  role?: UserRole;
  tech_lead_id?: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  tech_lead_id?: string;
  tech_lead?: {
    user_id: string;
    full_name: string;
    email: string;
  };
}

class UserService {
  async getUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        tech_lead:tech_lead_id (
          user_id,
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }

    return (data || []) as UserProfile[];
  }

  async createUser(userData: CreateUserData): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'create',
        userData
      }
    });

    if (error) {
      console.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user');
    }
  }

  async updateUser(userId: string, userData: UpdateUserData): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'update',
        userId,
        userData
      }
    });

    if (error) {
      console.error('Error updating user:', error);
      throw new Error(error.message || 'Failed to update user');
    }
  }

  async updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'updateRole',
        userId,
        userData: { role }
      }
    });

    if (error) {
      console.error('Error updating user role:', error);
      throw new Error(error.message || 'Failed to update user role');
    }
  }

  async resetPassword(userId: string, password: string): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'resetPassword',
        userId,
        userData: { password }
      }
    });

    if (error) {
      console.error('Error resetting password:', error);
      throw new Error(error.message || 'Failed to reset password');
    }
  }

  async toggleUserStatus(userId: string, status: string): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'toggleStatus',
        userId,
        userData: { status }
      }
    });

    if (error) {
      console.error('Error toggling user status:', error);
      throw new Error(error.message || 'Failed to update user status');
    }
  }

  async updateTechLead(userId: string, techLeadId: string | null): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ tech_lead_id: techLeadId })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating tech lead:', error);
      throw new Error('Failed to update tech lead assignment');
    }
  }

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('user-management-v2', {
      body: {
        action: 'delete',
        userId
      }
    });

    if (error) {
      console.error('Error deleting user:', error);
      throw new Error(error.message || 'Failed to delete user');
    }
  }
}

export const userService = new UserService();