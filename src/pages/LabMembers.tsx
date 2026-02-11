import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Scientist {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  experiments_count: number;
  profile_image?: string | null;
}

const LabMembers = () => {
  const { user, profile, loading } = useAuth();
  const [scientists, setScientists] = useState<Scientist[]>([]);
  // DEBUG: Confirm component render
  console.log('LabMembers page rendered');

  useEffect(() => {
    if (profile?.role === 'lab_owner' && profile.lab_id) {
      fetchLabMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchLabMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, is_active, created_at')
        .eq('lab_id', profile.lab_id)
        .eq('role', 'scientist');

      if (error) throw error;

      // Get experiment counts for each scientist
      const scientistsWithCounts = await Promise.all(
        (data || []).map(async (scientist) => {
          const { count } = await supabase
            .from('experiments')
            .select('*', { count: 'exact', head: true })
            .eq('scientist_id', scientist.id);

          return {
            ...scientist,
            experiments_count: count || 0
          };
        })
      );

      setScientists(scientistsWithCounts);
    } catch (error) {
      console.error('Error fetching lab members:', error);
      toast.error('Failed to load lab members');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'lab_owner') {
    return <div className="text-center mt-20 text-lg">Access denied. Lab Owner privileges required.</div>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-scientific-navy mb-2">Lab Members</h1>
        <p className="text-muted-foreground mb-6">View and manage scientists in your lab.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scientists.length === 0 ? (
            <div className="text-muted-foreground text-center col-span-2">No lab members found.</div>
          ) : (
            scientists.map((sci) => (
              <Card key={sci.id} className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">{sci.first_name} {sci.last_name}</CardTitle>
                  <div className="text-sm text-muted-foreground">{sci.email}</div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={sci.is_active ? 'default' : 'destructive'}>
                      {sci.is_active ? 'Active' : 'Blocked'}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Experiments: {sci.experiments_count}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LabMembers;
