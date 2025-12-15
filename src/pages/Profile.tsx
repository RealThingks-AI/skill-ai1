import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Mail, Shield, KeyRound, Activity, Clock } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/common/ChangePasswordDialog';
import { dateFormatters } from '@/utils/formatters';

export default function Profile() {
  const { profile } = useAuth();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!profile) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'management':
        return 'default';
      case 'tech_lead':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-12 max-w-3xl">
          {/* Profile Information Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-foreground">
              <User className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Profile Information</h2>
            </div>
            
            <div className="flex items-start gap-8">
              {/* Avatar */}
              <Avatar className="w-24 h-24 border-4 border-primary/10">
                <AvatarFallback className="text-2xl font-semibold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                  {getInitials(profile.full_name || profile.email)}
                </AvatarFallback>
              </Avatar>

              {/* Profile Details */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-2xl font-semibold text-foreground">{profile.full_name || 'No name set'}</h3>
                  <Badge variant={getRoleBadgeVariant(profile.role)} className="mt-3">
                    {formatRole(profile.role)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p className="text-muted-foreground mt-1">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Role</p>
                      <p className="text-muted-foreground mt-1">{formatRole(profile.role)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Activity Overview Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Activity Overview</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Last Login</p>
                  <p className="text-muted-foreground mt-1">
                    {profile.last_login 
                      ? dateFormatters.formatDateTime(profile.last_login)
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Account Status</p>
                  <p className="text-muted-foreground mt-1 capitalize">
                    {profile.status || 'Active'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-border"></div>

          {/* Security Settings Section */}
          <section className="space-y-6">
            <div className="flex items-center gap-2 text-foreground">
              <KeyRound className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Security Settings</h2>
            </div>

            <div className="flex items-center justify-between py-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center flex-shrink-0">
                  <KeyRound className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Password</p>
                  <p className="text-muted-foreground mt-1">
                    Update your password to keep your account secure
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setShowChangePassword(true)}
                className="flex-shrink-0"
              >
                Change Password
              </Button>
            </div>
          </section>

          {/* Bottom spacing */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <ChangePasswordDialog 
        open={showChangePassword} 
        onOpenChange={setShowChangePassword} 
      />
    </div>
  );
}