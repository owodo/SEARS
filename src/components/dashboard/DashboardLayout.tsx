import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  LogOut, 
  Beaker, 
  Users, 
  FlaskConical, 
  Settings,
  Database,
  MessageSquare,
  Activity,
  Plus
} from 'lucide-react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'universal_owner':
        return 'Universal Owner';
      case 'lab_owner':
        return 'Lab Owner';
      case 'scientist':
        return 'Scientist';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'universal_owner':
        return 'destructive';
      case 'lab_owner':
        return 'default';
      case 'scientist':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getNavigationItems = () => {
    const baseItems = [
      { icon: Activity, label: 'Dashboard', href: '/dashboard' },
      { icon: FlaskConical, label: 'Experiments', href: '/experiments' },
      { icon: MessageSquare, label: 'Messages', href: '/messages' },
    ];

    if (profile?.role === 'scientist' || profile?.role === 'lab_owner') {
      baseItems.splice(1, 0, { icon: Plus, label: 'Create Experiment', href: '/experiments/create' });
    }

    if (profile?.role === 'universal_owner') {
      return [
        ...baseItems,
        { icon: Database, label: 'System Admin', href: '/admin' },
        { icon: Users, label: 'Lab Management', href: '/labs' },
      ];
    }

    if (profile?.role === 'lab_owner') {
      return [
        ...baseItems,
        { icon: Users, label: 'Lab Members', href: '/lab-members' },
        { icon: Settings, label: 'Lab Settings', href: '/settings' },
      ];
    }

    return baseItems;
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <img
                  src="/searsv2-logo.svg"
                  alt="SEARSv2 Logo"
                  className="w-10 h-10 mr-2"
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                <span className="text-xl font-bold text-scientific-navy align-middle">SEARS</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {profile && (
                <div className="flex items-center space-x-3">
                  <Avatar>
                    {profile.profile_image ? (
                      <AvatarImage src={profile.profile_image} alt="Profile" />
                    ) : (
                      <AvatarFallback>
                        {profile.first_name?.[0] || ''}{profile.last_name?.[0] || ''}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Badge variant={getRoleBadgeVariant(profile.role)}>
                        {getRoleDisplayName(profile.role)}
                      </Badge>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={async () => {
                      await signOut();
                      navigate('/auth');
                    }}
                    className="hover:bg-destructive hover:text-destructive-foreground transition-smooth"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation - hidden for universal owner */}
          {profile?.role !== 'universal_owner' && (
            <div className="lg:col-span-1">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Navigation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {getNavigationItems().map((item) => (
                    <Button
                      key={item.href}
                      variant={location.pathname === item.href ? "default" : "ghost"}
                      className="w-full justify-start hover:bg-primary/10 hover:text-primary transition-smooth"
                      onClick={() => navigate(item.href)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
          {/* Main Content */}
          <div className={profile?.role === 'universal_owner' ? 'lg:col-span-4' : 'lg:col-span-3'}>
            {children}
          </div>
        </div>
      </div>
      {/* Footer */}
      <footer className="w-full text-center py-4 text-muted-foreground text-sm border-t mt-8">
  <img src="/watermark-logo.png" alt="SEARSv2 Logo (SEARSv2)" className="mx-auto mb-2 h-16 opacity-90" />
  &copy; Iowa State University {currentYear}
      </footer>
    </div>
  );
};