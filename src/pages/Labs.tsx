import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Building, Users, Settings, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LabDetail {
  id: string;
  name: string;
  ownerEmail: string;
  hasOwner: boolean;
  status: string;
  experimentCount: number;
  scientistCount: number;
}

const Labs = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const [labOwnerCount, setLabOwnerCount] = useState<number | null>(null);
  const [experimentCount, setExperimentCount] = useState<number | null>(null);
  const [labDetails, setLabDetails] = useState<LabDetail[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newLabName, setNewLabName] = useState('');
  const [newLabDescription, setNewLabDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteLabId, setInviteLabId] = useState('');
  const [isInviting, setIsInviting] = useState(false);

  // Redirect non-universal-owners away.
  // IMPORTANT: wait until BOTH loading is done AND the profile has loaded.
  // On a fresh refresh, `loading` flips to false a moment before the profile
  // fetch resolves; without the `profile` check we would wrongly redirect a
  // universal owner to /dashboard during that gap.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!profile) return; // profile still loading — wait, don't redirect yet
    if (profile.role !== 'universal_owner') {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  const fetchAll = useCallback(async () => {
    const { count: ownerCount } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'lab_owner');
    setLabOwnerCount(ownerCount ?? 0);

    const { count: expCount } = await supabase
      .from('experiments')
      .select('id', { count: 'exact', head: true });
    setExperimentCount(expCount ?? 0);

    const { data: labs, error: labsError } = await supabase
      .from('labs')
      .select('id, name, is_active')
      .order('created_at', { ascending: false });

    if (labsError || !labs) {
      setLabDetails([]);
      return;
    }

    const details = await Promise.all(
      labs.map(async (lab: any) => {
        const { data: owners } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'lab_owner')
          .eq('lab_id', lab.id)
          .limit(1);

        const { count: labExpCount } = await supabase
          .from('experiments')
          .select('id', { count: 'exact', head: true })
          .eq('lab_id', lab.id);

        const { count: sciCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'scientist')
          .eq('lab_id', lab.id);

        const hasOwner = !!(owners && owners.length > 0);
        return {
          id: lab.id,
          name: lab.name,
          ownerEmail: hasOwner ? owners![0].email : '-',
          hasOwner,
          status: lab.is_active ? 'Active' : 'Inactive',
          experimentCount: labExpCount ?? 0,
          scientistCount: sciCount ?? 0,
        };
      })
    );
    setLabDetails(details);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const labsWithoutOwner = labDetails.filter((l) => !l.hasOwner);

  const handleCreateLab = async () => {
    if (!newLabName.trim()) {
      toast.error('Lab name is required');
      return;
    }
    setIsCreating(true);
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
      setCreateOpen(false);
      await fetchAll();
    } catch (err: any) {
      console.error('Error creating lab:', err);
      toast.error(err.message || 'Failed to create lab');
    } finally {
      setIsCreating(false);
    }
  };

  const handleInviteLabOwner = async () => {
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
      await fetchAll();
    } catch (err: any) {
      console.error('Error inviting lab owner:', err);
      toast.error(err.message || 'Failed to invite lab owner');
    } finally {
      setIsInviting(false);
    }
  };

  // Show spinner while auth OR profile is still loading (prevents a blank
  // flash on refresh before the profile resolves).
  if (loading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || profile?.role !== 'universal_owner') {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-scientific-navy mb-2">Lab Management</h1>
            <p className="text-muted-foreground">
              Create and manage laboratories across the platform.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:bg-primary/90 text-primary-foreground shadow-elegant">
                <Plus className="w-4 h-4 mr-2" />
                Create New Lab
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
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateLab} disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create Lab'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-primary" />
                <span>Total Lab Owners</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-scientific-navy">
                {labOwnerCount !== null ? labOwnerCount : '-'}
              </div>
              <p className="text-sm text-muted-foreground">Lab owners registered</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-primary" />
                <span>Total Experiments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-scientific-navy">
                {experimentCount !== null ? experimentCount : '-'}
              </div>
              <p className="text-sm text-muted-foreground">Experiments created</p>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-primary" />
                <span>System Status</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                Operational
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">All systems running</p>
            </CardContent>
          </Card>
        </div>

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
                {labDetails.length === 0
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
                  <Button onClick={handleInviteLabOwner} disabled={isInviting} className="w-full">
                    {isInviting ? 'Inviting...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-scientific-navy">All Labs</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded shadow">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Lab Name</th>
                  <th className="py-2 px-4 border-b text-left">Lab Owner Email</th>
                  <th className="py-2 px-4 border-b text-left">Lab Status</th>
                  <th className="py-2 px-4 border-b text-left">Total Experiments</th>
                  <th className="py-2 px-4 border-b text-left">Total Scientists</th>
                  <th className="py-2 px-4 border-b text-left">Bill</th>
                </tr>
              </thead>
              <tbody>
                {labDetails.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-4 px-4 text-center text-muted-foreground">
                      No labs found. Click "Create New Lab" to add one.
                    </td>
                  </tr>
                ) : (
                  labDetails.map((lab) => (
                    <tr key={lab.id} className="border-b">
                      <td className="py-2 px-4">{lab.name}</td>
                      <td className="py-2 px-4">{lab.ownerEmail}</td>
                      <td className="py-2 px-4">{lab.status}</td>
                      <td className="py-2 px-4">{lab.experimentCount}</td>
                      <td className="py-2 px-4">{lab.scientistCount}</td>
                      <td className="py-2 px-4">
                        <BillDialogButton labName={lab.name} experimentCount={lab.experimentCount} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Labs;

function BillDialogButton({ labName, experimentCount }: { labName: string; experimentCount: number }) {
  const [open, setOpen] = useState(false);
  const ratePerExperiment = 10;
  const total = experimentCount * ratePerExperiment;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Bill</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Billing Calculator</DialogTitle>
          <DialogDescription>
            Estimated billing for <strong>{labName}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2 text-sm">
          <div className="flex justify-between">
            <span>Experiments</span>
            <span>{experimentCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Rate per experiment</span>
            <span>${ratePerExperiment.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold border-t pt-2">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="default">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
