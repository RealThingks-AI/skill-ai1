import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { authHelpers } from '@/utils/auth';
import type { UserRole } from '@/utils/constants';

interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface UseAuthReturn {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isManagerOrAbove: boolean;
  isTechLeadOrAbove: boolean;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      const userProfile = await authHelpers.getCurrentUserProfile();
      setProfile(userProfile as UserProfile);
    } catch (error) {
      console.error('Error refreshing profile:', error);
      setProfile(null);
    }
  };

  useEffect(() => {
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear profile when user signs out
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null);
        }
        
        // Update last_login on sign in
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(async () => {
            try {
              await supabase
                .from('profiles')
                .update({ last_login: new Date().toISOString() })
                .eq('user_id', session.user.id);
            } catch (error) {
              console.error('Error updating last login:', error);
            }
          }, 0);
        }
      }
    );

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  // Refresh profile when user changes
  useEffect(() => {
    refreshProfile();
  }, [user]);

  const signOut = async () => {
    try {
      // Clear local state immediately
      setUser(null);
      setProfile(null);
      
      // Then sign out from Supabase
      await authHelpers.signOut();
      
      // Force redirect to auth page
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if signout fails, clear local state and redirect
      setUser(null);
      setProfile(null);
      window.location.href = '/auth';
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated: !!user,
    isAdmin: profile?.role === 'admin',
    isManagerOrAbove: ['admin', 'management'].includes(profile?.role || ''),
    isTechLeadOrAbove: ['admin', 'management', 'tech_lead'].includes(profile?.role || ''),
    signOut,
    signIn,
    refreshProfile
  };
}