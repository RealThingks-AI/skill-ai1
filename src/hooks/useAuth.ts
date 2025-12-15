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
  tech_lead_id?: string;
  department?: string;
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

  // Check for impersonation
  const getImpersonatedProfile = async (): Promise<UserProfile | null> => {
    const stored = sessionStorage.getItem('impersonation');
    if (!stored) return null;

    try {
      const { impersonatedUser } = JSON.parse(stored);
      
      console.log('Loading impersonated profile for:', impersonatedUser);
      
      // Fetch full profile data for the impersonated user
      const { data: impersonatedProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', impersonatedUser.userId)
        .single();

      if (error || !impersonatedProfile) {
        console.error('Error loading impersonated profile:', error);
        return null;
      }

      console.log('Loaded impersonated profile:', impersonatedProfile);
      return impersonatedProfile as UserProfile;
    } catch (error) {
      console.error('Error parsing impersonation data:', error);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    try {
      // First check if we're in impersonation mode
      const impersonatedProfile = await getImpersonatedProfile();
      if (impersonatedProfile) {
        console.log('Setting impersonated profile:', impersonatedProfile.full_name);
        setProfile(impersonatedProfile);
        return;
      }

      // Otherwise, get the current user's profile
      const userProfile = await authHelpers.getCurrentUserProfile();
      
      // Only set profile if we got valid data - don't sign out on errors
      if (userProfile) {
        console.log('Setting user profile:', userProfile.full_name);
        setProfile(userProfile as UserProfile);
      }
    } catch (error) {
      console.error('Error refreshing profile:', error);
      // Don't clear profile or sign out on errors - keep existing session
    }
  };

  useEffect(() => {
    let isInitialLoad = true;
    
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Update user state on all auth events except TOKEN_REFRESHED
        if (event !== 'TOKEN_REFRESHED') {
          setUser(session?.user ?? null);
          setLoading(false);
        }
        
        // Clear profile only on explicit sign out
        if (event === 'SIGNED_OUT') {
          setProfile(null);
          setUser(null);
          sessionStorage.removeItem('impersonation'); // Clear impersonation on sign out
        }
        
        // Update last_login only on actual sign in, not on token refresh or initial load
        if (event === 'SIGNED_IN' && session?.user && !isInitialLoad) {
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
        isInitialLoad = false;
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setProfile(null);
        setLoading(false);
        isInitialLoad = false;
      }
    };

    getInitialSession();

    return () => {
      subscription.unsubscribe();
    };
  }, []); // Remove user dependency to prevent infinite loop

  // Refresh profile when user changes or when impersonation state changes
  useEffect(() => {
    if (user && !profile) {
      refreshProfile();
    }
    
    // Listen for custom impersonation events
    const handleImpersonationChange = () => {
      console.log('Impersonation changed, refreshing profile');
      refreshProfile();
    };
    
    window.addEventListener('impersonation-change', handleImpersonationChange);
    
    return () => {
      window.removeEventListener('impersonation-change', handleImpersonationChange);
    };
  }, [user?.id]);

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