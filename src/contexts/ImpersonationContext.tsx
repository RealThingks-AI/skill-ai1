import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ImpersonatedUser {
  userId: string;
  fullName: string;
  role: string;
  email: string;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  originalAdminId: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [originalAdminId, setOriginalAdminId] = useState<string | null>(null);

  // Load impersonation state from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('impersonation');
    if (stored) {
      const data = JSON.parse(stored);
      setImpersonatedUser(data.impersonatedUser);
      setOriginalAdminId(data.originalAdminId);
    }
  }, []);

  const startImpersonation = async (user: ImpersonatedUser) => {
    // Get current admin user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return;

    const impersonationData = {
      impersonatedUser: user,
      originalAdminId: currentUser.id
    };

    setImpersonatedUser(user);
    setOriginalAdminId(currentUser.id);
    sessionStorage.setItem('impersonation', JSON.stringify(impersonationData));
    
    // Trigger a custom event to notify other components
    window.dispatchEvent(new Event('impersonation-change'));
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    setOriginalAdminId(null);
    sessionStorage.removeItem('impersonation');
    window.dispatchEvent(new Event('impersonation-change'));
    window.location.href = '/admin';
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUser,
        isImpersonating: !!impersonatedUser,
        startImpersonation,
        stopImpersonation,
        originalAdminId
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error('useImpersonation must be used within ImpersonationProvider');
  }
  return context;
}
