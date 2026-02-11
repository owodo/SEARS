import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Building, Users, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Labs = () => {
  const currentYear = new Date().getFullYear();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [labOwnerCount, setLabOwnerCount] = useState<number | null>(null);
  const [experimentCount, setExperimentCount] = useState<number | null>(null);
  const [labDetails, setLabDetails] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== 'universal_owner')) {
      navigate('/dashboard');
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    // Fetch total lab owners
    const fetchLabOwners = async () => {
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'lab_owner');
      if (!error) setLabOwnerCount(count ?? 0);
    };
    // Fetch total experiments
    const fetchExperiments = async () => {
      const { data, error, count } = await supabase
        .from('experiments')
        .select('id', { count: 'exact', head: true });
      if (!error) setExperimentCount(count ?? 0);
    };
    // Fetch lab details
    const fetchLabDetails = async () => {
      const { data: labs, error: labsError } = await supabase
        .from('labs')
        .select('id, name, is_active');
      if (labsError || !labs) return;
      const details = await Promise.all(labs.map(async (lab: any) => {
        const { data: owners } = await supabase
          .from('profiles')
          .select('email')
          .eq('role', 'lab_owner')
          .eq('lab_id', lab.id)
          .limit(1);
        const { count: experimentCount } = await supabase
          .from('experiments')
          .select('id', { count: 'exact', head: true })
          .eq('lab_id', lab.id);
        const { count: scientistCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'scientist')
          .eq('lab_id', lab.id);
        return {
          name: lab.name,
          ownerEmail: owners && owners.length > 0 ? owners[0].email : '-',
          status: lab.is_active ? 'Active' : 'Inactive',
          experimentCount: experimentCount ?? 0,
          scientistCount: scientistCount ?? 0,
        };
      }));
      setLabDetails(details);
    };
    fetchLabOwners();
    fetchExperiments();
    fetchLabDetails();
  }, []);

  if (loading) {
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
          <Button className="bg-gradient-primary hover:bg-primary/90 text-primary-foreground shadow-elegant">
            <Plus className="w-4 h-4 mr-2" />
            Create New Lab
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-primary" />
                  <span>Total Lab Owners</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-scientific-navy">{labOwnerCount !== null ? labOwnerCount : '-'}</div>
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
                <div className="text-2xl font-bold text-scientific-navy">{experimentCount !== null ? experimentCount : '-'}</div>
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
        </div>
        {/* Lab Details Table */}
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
                    <td colSpan={5} className="py-4 px-4 text-center text-muted-foreground">No labs found.</td>
                  </tr>
                ) : (
                  labDetails.map((lab, idx) => (
                    <tr key={idx} className="border-b">
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
}

// Billing Dialog Button Component
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';

function BillDialogButton({ labName, experimentCount }: { labName: string; experimentCount: number }) {
  const [open, setOpen] = useState(false);
  const [subscriptionCostRaw, setSubscriptionCostRaw] = useState('5.00');
  const [perExperimentCostRaw, setPerExperimentCostRaw] = useState('0.01');
  const month = new Date().toLocaleString('default', { month: 'long' });
  const year = new Date().getFullYear();
  const subscriptionCost = parseFloat(subscriptionCostRaw) || 0;
  const perExperimentCost = parseFloat(perExperimentCostRaw) || 0;
  const total = (subscriptionCost + experimentCount * perExperimentCost).toFixed(2);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Bill</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Billing Calculator</DialogTitle>
          <DialogDescription>
            Calculate charges for <span className="font-semibold">{labName}</span> for {month} {year}.
          </DialogDescription>
        </DialogHeader>
        <div className="my-4 space-y-4">
          <div className="flex justify-between items-center">
            <span>Subscription Cost:</span>
            <input
              type="text"
              value={subscriptionCostRaw}
              onChange={e => setSubscriptionCostRaw(e.target.value)}
              className="w-24 px-2 py-1 border rounded text-right font-bold"
              inputMode="decimal"
            />
          </div>
          <div className="flex justify-between items-center">
            <span>Experiments this month:</span>
            <span className="font-bold">{experimentCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Rate per experiment:</span>
            <input
              type="text"
              value={perExperimentCostRaw}
              onChange={e => setPerExperimentCostRaw(e.target.value)}
              className="w-24 px-2 py-1 border rounded text-right font-bold"
              inputMode="decimal"
            />
          </div>
          <div className="flex justify-between border-t pt-2">
            <span>Total Due:</span>
            <span className="font-bold text-primary">${total}</span>
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

export default Labs;