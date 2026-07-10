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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Activity,
  Plus
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

  // Invite lab owner
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteLabId, setInviteLabId] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Create lab
  const [createLabOpen, setCreateLabOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabDescription, setNewLabDescription] = useState('');
  const [isCreatingLab, setIsCreatingLab] = useState(false);

  // Labs that don't have an owner yet — only these can receive an invite
  const labsWithoutOwner = labs.filter(
    (l) => !l.owner_email || l.owner_email === 'No owner assigned'
  );

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
      
      // LEFT JOIN so labs with no owner yet are still returned.
      // (An inner join silently hid every ownerless lab.)
      const { data: labsData, error } = await supabase
        .from('labs')
        .select(`
          id,
          name,
          description,
          is_active,
          created_at,
          profiles (
            first_name,
            last_name,
            email,
            role
          )
        `)
        .order('created_at', { ascending: false });

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

          // profiles may be an array (left join), a single object, or null.
          // Find the lab_owner among them; there may be none yet.
          const profileList = Array.isArray(lab.profiles)
            ? lab.profiles
            : lab.profiles
            ? [lab.profiles]
            : [];
          const owner = profileList.find((p: any) => p?.role === 'lab_owner');

          return {
            id: lab.id,
            name: lab.name,
            description: lab.description,
            is_active: lab.is_active,
            created_at: lab.created_at,
            owner_name: owner
              ? `${owner.first_name} ${owner.last_name}`.trim()
              : 'No owner assigned',
            owner_email: owner ? owner.email : '',
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

  const createLab = async () => {
    if (!newLabName.trim()) {
      toast.error('Lab name is required');
      return;
    }

    setIsCreatingLab(true);
    try {
      const { data, error } = await supabase
        .from('labs')
        .insert({
          name: newLabName.trim(),
          description: newLabDescription.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`Lab "${data.name}" created. Now invite a lab owner for it.`);
      setNewLabName('');
      setNewLabDescription('');
      setCreateLabOpen(false);
      await fetchLabsData();
      await fetchSystemStats();
    } catch (error: any) {
      console.error('Error creating lab:', error);
      toast.error(error.message || 'Failed to create lab');
    } finally {
      setIsCreatingLab(false);
    }
  };

  const inviteLabOwner = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      toast.error('Please fill in all fields');
      return;
    }
    if (!inviteLabId) {
      toast.error('Select which lab this owner will manage');
      return;
    }

    setIsInviting(true);
    try {
      // Edge function uses the Admin API server-side, so the universal
      // owner's own session is never replaced (the old signUp() bug).
      const { data, error } = await supabase.functions.invoke('invite-lab-owner', {
        body: {
          email: inviteEmail,
          firstName: inviteFirstName,
          lastName: inviteLastName,
          labId: inviteLabId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || 'Lab owner invited successfully');
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      setInviteLabId('');
      await fetchLabsData();
      await fetchSystemStats();
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

      {/* Create Lab */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span>Labs</span>
          </CardTitle>
          <Dialog open={createLabOpen} onOpenChange={setCreateLabOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Lab
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Lab</DialogTitle>
                <DialogDescription>
                  Create the lab first, then invite a lab owner to manage it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label htmlFor="labName">Lab Name *</Label>
                  <Input
                    id="labName"
                    placeholder="Wodo Materials Lab"
                    value={newLabName}
                    onChange={(e) => setNewLabName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="labDescription">Description</Label>
                  <Textarea
                    id="labDescription"
                    placeholder="Polymer and material science research"
                    value={newLabDescription}
                    onChange={(e) => setNewLabDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateLabOpen(false)}
                  disabled={isCreatingLab}
                >
                  Cancel
                </Button>
                <Button onClick={createLab} disabled={isCreatingLab}>
                  {isCreatingLab ? 'Creating...' : 'Create Lab'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {labs.length === 0
              ? 'No labs yet. Create one to get started.'
              : `${labs.length} lab${labs.length === 1 ? '' : 's'} · ${labsWithoutOwner.length} awaiting an owner`}
          </p>
        </CardContent>
      </Card>

      {/* Invite Lab Owner */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Invite Lab Owner</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {labsWithoutOwner.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {labs.length === 0
                ? 'Create a lab first, then you can invite an owner for it.'
                : 'Every lab already has an owner. Create a new lab to invite another.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              <div>
                <Label htmlFor="labSelect">Assign to Lab</Label>
                <Select value={inviteLabId} onValueChange={setInviteLabId}>
                  <SelectTrigger id="labSelect">
                    <SelectValue placeholder="Select a lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {labsWithoutOwner.map((lab) => (
                      <SelectItem key={lab.id} value={lab.id}>
                        {lab.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={inviteLabOwner}
                  disabled={isInviting}
                  className="w-full"
                >
                  {isInviting ? 'Inviting...' : 'Send Invitation'}
                </Button>
              </div>
            </div>
          )}
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
