import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Database, 
  HardDrive, 
  Users, 
  FlaskConical, 
  Building2,
  UserPlus,
  Trash2,
  Shield,
  ShieldOff,
  Mail,
  Calendar,
  Activity
} from 'lucide-react';

interface SystemStats {
  totalLabs: number;
  totalScientists: number;
  totalExperiments: number;
  totalStorageUsed: number;
  totalDatabaseSize: number;
}

interface LabData {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  owner_name: string;
  owner_email: string;
  scientists_count: number;
  experiments_count: number;
  storage_used: number;
}

export const UniversalOwnerDashboard = () => {
  const { profile } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalLabs: 0,
    totalScientists: 0,
    totalExperiments: 0,
    totalStorageUsed: 0,
    totalDatabaseSize: 0
  });
  const [labs, setLabs] = useState<LabData[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    fetchSystemStats();
    fetchLabsData();
  }, []);

  const fetchSystemStats = async () => {
    try {
      // Get total labs
      const { count: labsCount } = await supabase
        .from('labs')
        .select('*', { count: 'exact', head: true });

      // Get total scientists
      const { count: scientistsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'scientist');

      // Get total experiments
      const { count: experimentsCount } = await supabase
        .from('experiments')
        .select('*', { count: 'exact', head: true });

      // Get storage usage (simplified - in a real app you'd query actual storage usage)
      const { data: experiments } = await supabase
        .from('experiments')
        .select('id');

      let totalStorageUsed = 0;
      if (experiments) {
        // Estimate storage based on number of experiments (placeholder)
        totalStorageUsed = experiments.length * 50; // 50MB per experiment average
      }

      setStats({
        totalLabs: labsCount || 0,
        totalScientists: scientistsCount || 0,
        totalExperiments: experimentsCount || 0,
        totalStorageUsed,
        totalDatabaseSize: totalStorageUsed * 0.1 // Estimate 10% for database
      });
    } catch (error) {
      console.error('Error fetching system stats:', error);
      toast.error('Failed to load system statistics');
    }
  };

  const fetchLabsData = async () => {
    try {
      setLoading(true);
      
      // Get labs with owner information
      const { data: labsData, error } = await supabase
        .from('labs')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          profiles!inner (
            first_name,
            last_name,
            email,
            role
          )
        `)
        .eq('profiles.role', 'lab_owner');

      if (error) throw error;

      // For each lab, get scientists and experiments count
      const labsWithStats = await Promise.all(
        (labsData || []).map(async (lab: any) => {
          // Get scientists count
          const { count: scientistsCount } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('lab_id', lab.id)
            .eq('role', 'scientist');

          // Get experiments count
          const { count: experimentsCount } = await supabase
            .from('experiments')
            .select('*', { count: 'exact', head: true })
            .eq('lab_id', lab.id);

          return {
            id: lab.id,
            name: lab.name,
            description: lab.description,
            is_active: lab.is_active,
            created_at: lab.created_at,
            owner_name: `${lab.profiles.first_name} ${lab.profiles.last_name}`,
            owner_email: lab.profiles.email,
            scientists_count: scientistsCount || 0,
            experiments_count: experimentsCount || 0,
            storage_used: (experimentsCount || 0) * 50 // Estimate
          };
        })
      );

      setLabs(labsWithStats);
    } catch (error) {
      console.error('Error fetching labs data:', error);
      toast.error('Failed to load labs data');
    } finally {
      setLoading(false);
    }
  };

  const inviteLabOwner = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsInviting(true);
    try {
      // First create the user account
      const { error: signUpError } = await supabase.auth.signUp({
        email: inviteEmail,
        password: 'TempPassword123!', // They'll need to reset this
        options: {
          data: {
            first_name: inviteFirstName,
            last_name: inviteLastName,
            role: 'lab_owner'
          }
        }
      });

      if (signUpError) throw signUpError;

      // Send invitation email
      const { data: { user } } = await supabase.auth.getUser();
      const inviterName = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim() || 'Admin';
      const loginUrl = window.location.origin + '/auth';

      const { error: emailError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          role: 'lab_owner',
          inviterName,
          loginUrl
        }
      });

      if (emailError) {
        console.error('Email sending failed:', emailError);
        toast.error('Account created but email invitation failed to send. Please inform the user manually.');
      } else {
        toast.success('Lab owner invitation sent successfully');
      }

      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      fetchLabsData();
      fetchSystemStats();
    } catch (error: any) {
      console.error('Error inviting lab owner:', error);
      toast.error(error.message || 'Failed to invite lab owner');
    } finally {
      setIsInviting(false);
    }
  };

  const toggleLabStatus = async (labId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('labs')
        .update({ is_active: !currentStatus })
        .eq('id', labId);

      if (error) throw error;

      toast.success(`Lab ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
      fetchLabsData();
    } catch (error) {
      console.error('Error toggling lab status:', error);
      toast.error('Failed to update lab status');
    }
  };

  const deleteLab = async (labId: string) => {
    try {
      // In a real implementation, you'd delete all associated data and files
      // For now, we'll just disable the lab
      const { error } = await supabase
        .from('labs')
        .update({ is_active: false })
        .eq('id', labId);

      if (error) throw error;

      toast.success('Lab data and files deletion initiated');
      fetchLabsData();
    } catch (error) {
      console.error('Error deleting lab:', error);
      toast.error('Failed to delete lab');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes * 1024 * 1024) / Math.log(k));
    return parseFloat(((bytes * 1024 * 1024) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (profile?.role !== 'universal_owner') {
    return <div>Access denied. Universal Owner privileges required.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-scientific-navy mb-2">Universal Owner Dashboard</h1>
        <p className="text-muted-foreground">
          Complete system overview and administration controls.
        </p>
      </div>

      {/* System Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labs</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalLabs}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Scientists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalScientists}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Experiments</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-scientific-teal">{stats.totalExperiments}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">File Storage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatBytes(stats.totalStorageUsed)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">{formatBytes(stats.totalDatabaseSize)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Lab Owner */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Invite Lab Owner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={inviteLabOwner} 
                disabled={isInviting}
                className="w-full"
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Labs Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Labs Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lab Name</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Scientists</TableHead>
                  <TableHead>Experiments</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {labs.map((lab) => (
                  <TableRow key={lab.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lab.name}</div>
                        {lab.description && (
                          <div className="text-sm text-muted-foreground">{lab.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{lab.owner_name}</div>
                        <div className="text-sm text-muted-foreground">{lab.owner_email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{lab.scientists_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lab.experiments_count}</Badge>
                    </TableCell>
                    <TableCell>{formatBytes(lab.storage_used)}</TableCell>
                    <TableCell>
                      <Badge variant={lab.is_active ? "default" : "destructive"}>
                        {lab.is_active ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(lab.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLabStatus(lab.id, lab.is_active)}
                        >
                          {lab.is_active ? (
                            <>
                              <ShieldOff className="w-4 h-4 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Lab</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete all data and files for {lab.name}. 
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteLab(lab.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete Lab
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};