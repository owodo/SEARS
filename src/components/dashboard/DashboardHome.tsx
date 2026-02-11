import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { UniversalOwnerDashboard } from './UniversalOwnerDashboard';
import { LabOwnerDashboard } from './LabOwnerDashboard';
import { 
  FlaskConical, 
  Users, 
  Database, 
  TrendingUp,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export const DashboardHome = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  type Activity = {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    status: string;
    user_id?: string;
    user_profile?: {
      first_name?: string;
      last_name?: string;
      profile_image?: string | null;
    };
  };
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const fetchActivities = async () => {
      // Fetch latest experiments with user_id
      const { data: experiments } = await supabase
        .from('experiments')
        .select('id, status, created_at, metadata, scientist_id')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch latest measurements with user_id
      const { data: measurements } = await supabase
        .from('measurements')
        .select('id, value, unit, batch_number, reading_number, created_at, scientist_id')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch latest messages with sender_id
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, created_at, sender_id')
        .order('created_at', { ascending: false })
        .limit(3);

      // Collect all user_ids
      const userIds = [
        ...(experiments?.map(e => e.scientist_id) || []),
        ...(measurements?.map(m => m.scientist_id) || []),
        ...(messages?.map(msg => msg.sender_id) || [])
      ].filter(Boolean);

      // Fetch profiles for these userIds
      let profilesMap: Record<string, { first_name?: string; last_name?: string; profile_image?: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_image')
          .in('id', userIds);
        profiles?.forEach((p) => {
          profilesMap[p.id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            profile_image: p.profile_image
          };
        });
      }

      const activities: Activity[] = [];

      experiments?.forEach(exp => {
        let expTitle = 'Experiment update';
        if (exp.metadata && typeof exp.metadata === 'object' && 'title' in exp.metadata) {
          expTitle = (exp.metadata as any).title;
        }
        activities.push({
          id: exp.id,
          type: 'experiment',
          title: `Experiment ${exp.status}`,
          description: expTitle,
          timestamp: new Date(exp.created_at).toLocaleString(),
          status: exp.status,
          user_id: exp.scientist_id,
          user_profile: profilesMap[exp.scientist_id] || undefined
        });
      });

      measurements?.forEach(meas => {
        activities.push({
          id: meas.id,
          type: 'measurement',
          title: `Measurement: ${meas.value} ${meas.unit || ''}`,
          description: `Batch ${meas.batch_number}, Reading ${meas.reading_number}`,
          timestamp: new Date(meas.created_at).toLocaleString(),
          status: 'completed',
          user_id: meas.scientist_id,
          user_profile: profilesMap[meas.scientist_id] || undefined
        });
      });

      messages?.forEach(msg => {
        activities.push({
          id: msg.id,
          type: 'message',
          title: 'Lab Message',
          description: msg.content,
          timestamp: new Date(msg.created_at).toLocaleString(),
          status: 'info',
          user_id: msg.sender_id,
          user_profile: profilesMap[msg.sender_id] || undefined
        });
      });

      // Sort by timestamp descending
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivities(activities.slice(0, 5));
    };
    fetchActivities();
  }, []);

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour >= 5 && hour < 12) {
      greeting = 'Good morning';
    } else if (hour >= 12 && hour < 17) {
      greeting = 'Good afternoon';
    } else if (hour >= 17 && hour < 21) {
      greeting = 'Good evening';
    } else {
      greeting = 'Good night';
    }
    return `${greeting}, ${profile?.first_name}!`;
  };

  // Dashboard stats state
  const [stats, setStats] = useState({
    experiments: 0,
    activeExperiments: 0,
    pendingApprovals: 0,
    labMembers: 0,
    storageUsed: '0 GB',
    storageLimit: '50 GB',
  });

  useEffect(() => {
    const fetchStats = async () => {
      // Total experiments
      const { count: experimentsCount } = await supabase
        .from('experiments')
        .select('id', { count: 'exact', head: true });

      // Active experiments (status = 'pending' or 'draft')
      const { count: activeCount } = await supabase
        .from('experiments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['pending', 'draft']);

      // Pending approvals (status = 'pending')
      const { count: pendingCount } = await supabase
        .from('experiments')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Lab members
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });

      // Storage used (sum of experiment_files.file_size)
      const { data: files } = await supabase
        .from('experiment_files')
        .select('file_size');
      const totalBytes = files?.reduce((sum, f) => sum + (f.file_size || 0), 0) || 0;
      const storageUsed = totalBytes > 0 ? `${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB` : '0 GB';

      setStats({
        experiments: experimentsCount || 0,
        activeExperiments: activeCount || 0,
        pendingApprovals: pendingCount || 0,
        labMembers: membersCount || 0,
        storageUsed,
        storageLimit: '50 GB',
      });
    };
    fetchStats();
  }, []);

  const quickActions = [
    {
      title: 'Create New Experiment',
      description: 'Start a new material science experiment',
      icon: Plus,
      action: 'create-experiment',
      variant: 'default' as const,
      to: '/experiments/create',
    },
    {
      title: 'View All Experiments',
      description: 'Browse and manage your experiments',
      icon: FlaskConical,
      action: 'view-experiments',
      variant: 'outline' as const,
      to: '/experiments',
    },
    {
      title: 'Lab Messages',
      description: 'Communicate with your team',
      icon: Users,
      action: 'view-messages',
      variant: 'outline' as const,
      to: '/messages',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-primary rounded-xl p-6 text-primary-foreground">
        <h2 className="text-2xl font-bold mb-2">{getWelcomeMessage()}</h2>
        <p className="text-primary-foreground/90">
          Welcome to your SEARSv2 dashboard. Manage your experiments and collaborate with your team.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card hover:shadow-elegant transition-smooth">
          <CardHeader className="flex flex-col items-start space-y-1 pb-2">
            <FlaskConical className="h-6 w-6 text-scientific-blue mb-1" />
            <CardTitle className="text-base font-semibold">Total Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-scientific-blue">{stats.experiments}</div>
            <p className="text-xs text-muted-foreground mt-1">All experiments in the system</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-smooth">
          <CardHeader className="flex flex-col items-start space-y-1 pb-2">
            <TrendingUp className="h-6 w-6 text-scientific-teal mb-1" />
            <CardTitle className="text-base font-semibold">Active Experiments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-scientific-teal">{stats.activeExperiments}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-smooth">
          <CardHeader className="flex flex-col items-start space-y-1 pb-2">
            <AlertCircle className="h-6 w-6 text-warning mb-1" />
            <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
          </CardContent>
        </Card>

        <Card className="shadow-card hover:shadow-elegant transition-smooth">
          <CardHeader className="flex flex-col items-start space-y-1 pb-2">
            <Database className="h-6 w-6 text-scientific-navy mb-1" />
            <CardTitle className="text-base font-semibold">Storage Used</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-scientific-navy">{stats.storageUsed}</div>
            <p className="text-xs text-muted-foreground mt-1">of {stats.storageLimit} limit</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your workflow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action) => (
              <Button
                key={action.action}
                variant="ghost"
                className="w-full justify-start h-auto p-4 hover:shadow-glow transition-bounce"
                onClick={() => navigate(action.to)}
              >
                <action.icon className="w-5 h-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your lab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <Avatar>
                    {activity.user_profile?.profile_image ? (
                      <AvatarImage src={activity.user_profile.profile_image} alt="Profile" />
                    ) : (
                      <AvatarFallback>
                        {activity.user_profile?.first_name?.[0] || ''}{activity.user_profile?.last_name?.[0] || ''}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {activity.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.timestamp}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};