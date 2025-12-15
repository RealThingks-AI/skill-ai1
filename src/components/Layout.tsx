import { Navigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Bell, LogOut, User, Settings } from 'lucide-react';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import LoadingSpinner from '@/components/common/LoadingSpinner';
interface LayoutProps {
  children: React.ReactNode;
}
export function Layout({
  children
}: LayoutProps) {
  const {
    user,
    profile,
    loading,
    signOut
  } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>;
  }

  // Redirect to auth if no user
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user exists but no profile loaded, show loading
  if (user && profile === null && !loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>;
  }
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-gradient-to-r from-red-500 to-orange-500 text-white';
      case 'management':
        return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'tech_lead':
        return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
      default:
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    }
  };
  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };
  return <SidebarProvider>
      <div className="h-screen max-h-screen flex flex-col w-full max-w-full bg-background overflow-hidden">
        <ImpersonationBanner />
        <div className="flex-1 flex w-full max-w-full overflow-hidden">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col min-w-0 max-w-full">
            {/* Top Navigation */}
            

            {/* Main Content */}
            <main className="flex-1 min-h-0 max-h-full overflow-auto">
              <div className="h-full">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>;
}