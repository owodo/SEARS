import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Users, 
  FlaskConical, 
  HardDrive,
  UserPlus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  MessageSquare,
  Send,
  Calendar as CalendarIcon,
  Shield,
  ShieldOff,
  FileDown
} from 'lucide-react';

interface LabStats {
  totalScientists: number;
  totalExperiments: number;
  storageUsed: number;
  pendingExperiments: number;
  approvedExperiments: number;
}

interface Experiment {
  id: string;
  metadata: any;
  status: string;
  created_at: string;
  scientist_name: string;
  scientist_id: string;
  marked_for_publication: boolean;
}

interface Scientist {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  experiments_count: number;
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_name: string;
  sender_id: string;
}

export const LabOwnerDashboard = () => {
  const currentYear = new Date().getFullYear();
  // SignOut button component
  const SignOutButton = () => {
    const { signOut } = useAuth();
    const navigate = useNavigate();
    const handleSignOut = async () => {
      await signOut();
      navigate('/auth');
    };
    return (
      <Button variant="outline" className="ml-4" onClick={handleSignOut}>
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    );
  };
  // Expose refresh function for stats
  const refreshLabStats = async () => {
    await fetchLabStats();
  };
  const { profile } = useAuth();
  const [labName, setLabName] = useState<string>("");
  const navigate = useNavigate();
  const [stats, setStats] = useState<LabStats>({
    totalScientists: 0,
    totalExperiments: 0,
    storageUsed: 0,
    pendingExperiments: 0,
    approvedExperiments: 0
  });
  
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [scientists, setScientists] = useState<Scientist[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedExperiments, setSelectedExperiments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScientist, setSelectedScientist] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  
  // Invite scientist
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  // Messaging
  const [newMessage, setNewMessage] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (profile?.role === 'lab_owner' && profile?.lab_id) {
      fetchLabStats();
      fetchExperiments();
      fetchScientists();
      fetchMessages();
      // Fetch lab name
      supabase
        .from('labs')
        .select('name')
        .eq('id', profile.lab_id)
        .single()
        .then(({ data, error }) => {
          if (!error && data?.name) setLabName(data.name);
        });
    }
  }, [profile]);

  const fetchLabStats = async () => {
    if (!profile?.lab_id) return;
    
    try {
      // Get scientists count
      const { count: scientistsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('lab_id', profile.lab_id)
        .eq('role', 'scientist');

      // Get experiments count and status breakdown
      const { data: experimentsData } = await supabase
        .from('experiments')
        .select('status, marked_for_publication')
        .eq('lab_id', profile.lab_id);

      const totalExperiments = experimentsData?.length || 0;
  // Pending Review: any experiment not published
  const pendingExperiments = experimentsData?.filter(e => !e.marked_for_publication).length || 0;
      // Approved: published
      const approvedExperiments = experimentsData?.filter(e => e.marked_for_publication && e.status === 'published').length || 0;

      // Fetch total storage used by lab from Supabase Storage
      let storageUsed = 0;
      try {
        const { data: files, error: filesError } = await supabase
          .storage
          .from('experiment-files')
          .list('', { limit: 1000 });
        if (!filesError && files) {
          // Filter files by lab_id in metadata if available
          storageUsed = files
            .filter(file => file.metadata?.lab_id === profile.lab_id)
            .reduce((acc, file) => acc + (file.size || 0), 0);
        }
      } catch (e) {
        // fallback: show 0 if error
        storageUsed = 0;
      }
      setStats({
        totalScientists: scientistsCount || 0,
        totalExperiments,
        storageUsed,
        pendingExperiments,
        approvedExperiments
      });
    } catch (error) {
      console.error('Error fetching lab stats:', error);
      toast.error('Failed to load lab statistics');
    }
  };
  // Example: Call refreshLabStats after file upload logic
  // If you have a file upload function, add: await refreshLabStats(); after successful upload

  const fetchExperiments = async () => {
    if (!profile?.lab_id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('experiments')
        .select(`
          id,
          metadata,
          status,
          created_at,
          scientist_id,
          marked_for_publication,
          profiles!scientist_id (
            first_name,
            last_name
          )
        `)
        .eq('lab_id', profile.lab_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const experimentsWithScientist = (data || []).map(exp => ({
        id: exp.id,
        metadata: exp.metadata,
        status: exp.status,
        created_at: exp.created_at,
        scientist_id: exp.scientist_id,
        scientist_name: `${exp.profiles.first_name} ${exp.profiles.last_name}`,
        marked_for_publication: exp.marked_for_publication
      }));

      setExperiments(experimentsWithScientist);
    } catch (error) {
      console.error('Error fetching experiments:', error);
      toast.error('Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const fetchScientists = async () => {
    if (!profile?.lab_id) return;
    
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
      console.error('Error fetching scientists:', error);
      toast.error('Failed to load scientists');
    }
  };

  const fetchMessages = async () => {
    if (!profile?.lab_id) return;
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          sender_id,
          profiles!inner (
            first_name,
            last_name
          )
        `)
        .eq('lab_id', profile.lab_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const messagesWithSender = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        sender_id: msg.sender_id,
        sender_name: `${msg.profiles.first_name} ${msg.profiles.last_name}`
      }));

      setMessages(messagesWithSender);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const inviteScientist = async () => {
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!profile?.lab_id) {
      toast.error('You must be assigned to a lab before inviting scientists');
      return;
    }

    setIsInviting(true);
    
    try {
      // Create user account first, then the profile will be created by trigger
      const redirectUrl = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signUp({
        email: inviteEmail,
        password: 'TempPassword123!',
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: inviteFirstName,
            last_name: inviteLastName,
            role: 'scientist',
            lab_id: profile?.lab_id
          }
        }
      });

      if (error) throw error;

      toast.success('Scientist invited successfully');
      setInviteEmail('');
      setInviteFirstName('');
      setInviteLastName('');
      fetchScientists();
      fetchLabStats();
    } catch (error: any) {
      console.error('Error inviting scientist:', error);
      toast.error(error.message || 'Failed to invite scientist');
    } finally {
      setIsInviting(false);
    }
  };

  const updateExperimentStatus = async (experimentId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('experiments')
        .update({ 
          status,
          approved_by: status === 'approved' ? profile?.id : null,
          approved_at: status === 'approved' ? new Date().toISOString() : null
        })
        .eq('id', experimentId);

      if (error) throw error;

      toast.success(`Experiment ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      fetchExperiments();
      fetchLabStats();
    } catch (error) {
      console.error('Error updating experiment:', error);
      toast.error('Failed to update experiment status');
    }
  };

  const togglePublication = async (experimentId: string, currentStatus: boolean) => {
    try {
      const updateObj: { marked_for_publication: boolean; status?: string } = { marked_for_publication: !currentStatus };
      if (!currentStatus) {
        updateObj.status = 'published';
      } else {
        updateObj.status = 'draft';
      }
      const { error } = await supabase
        .from('experiments')
        .update(updateObj)
        .eq('id', experimentId);

      if (error) throw error;

  toast.success(`Experiment ${!currentStatus ? 'marked' : 'unmarked'} for publication`);
  await fetchExperiments();
  await fetchLabStats();
    } catch (error) {
      console.error('Error toggling publication:', error);
      toast.error('Failed to update publication status');
    }
  };

  const toggleScientistStatus = async (scientistId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('id', scientistId);

      if (error) throw error;

      toast.success(`Scientist ${!currentStatus ? 'activated' : 'blocked'} successfully`);
      fetchScientists();
    } catch (error) {
      console.error('Error updating scientist status:', error);
      toast.error('Failed to update scientist status');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !profile?.lab_id) return;

    setIsSendingMessage(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage.trim(),
          lab_id: profile.lab_id,
          sender_id: profile.id
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages();
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const downloadSelectedExperiments = async () => {
    if (selectedExperiments.length === 0) {
      toast.error('Please select experiments to download');
      return;
    }

    // In a real implementation, this would create a zip file with experiment data and files
    toast.success(`Preparing download for ${selectedExperiments.length} experiments`);
  };

  const filteredExperiments = experiments.filter(exp => {
    const matchesSearch = exp.metadata?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exp.scientist_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScientist = selectedScientist === 'all' || exp.scientist_id === selectedScientist;
    
    const expDate = new Date(exp.created_at);
    const matchesDateRange = (!dateRange.from || expDate >= dateRange.from) &&
                            (!dateRange.to || expDate <= dateRange.to);
    
    return matchesSearch && matchesScientist && matchesDateRange;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes * 1024 * 1024) / Math.log(k));
    return parseFloat(((bytes * 1024 * 1024) / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      pending_review: 'secondary',
      approved: 'default',
      published: 'default',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'} className={status === 'published' ? 'bg-green-500 text-white' : ''}>
        {status === 'published' ? 'Published' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  if (profile?.role !== 'lab_owner') {
    return <div>Access denied. Lab Owner privileges required.</div>;
  }

  return (
    <div className="space-y-6 px-4 py-8 max-w-7xl mx-auto">
      {/* Settings + SignOut buttons at the very top */}
      <div className="w-full flex justify-end mb-2 gap-2">
        <Button variant="outline" onClick={() => navigate('/profile')}>
          <Settings className="w-4 h-4 mr-2" /> Settings
        </Button>
        <SignOutButton />
      </div>
      {/* Header */}
      <div className="flex items-center justify-center mb-6">
        <h1 className="text-3xl font-bold text-scientific-navy mb-2 text-center">Lab Owner Dashboard</h1>
      </div>
      <div className="mb-6 text-center">
        {labName && (
          <div className="text-xl font-semibold text-primary mb-1">Lab: {labName}</div>
        )}
        <p className="text-muted-foreground">
          Manage your laboratory, scientists, and experiments.
        </p>
      </div>

      {/* Lab Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scientists</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalScientists}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Experiments</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.totalExperiments}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.pendingExperiments}</div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.approvedExperiments}</div>
          </CardContent>
        </Card>

      </div>

      {/* Invite Scientist */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Invite Scientist</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="scientistEmail">Email</Label>
              <Input
                id="scientistEmail"
                type="email"
                placeholder="scientist@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scientistFirstName">First Name</Label>
              <Input
                id="scientistFirstName"
                placeholder="Jane"
                value={inviteFirstName}
                onChange={(e) => setInviteFirstName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scientistLastName">Last Name</Label>
              <Input
                id="scientistLastName"
                placeholder="Smith"
                value={inviteLastName}
                onChange={(e) => setInviteLastName(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={inviteScientist} 
                disabled={isInviting}
                className="w-full"
              >
                {isInviting ? 'Inviting...' : 'Invite Scientist'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

  {/* Study Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <span>Study Management</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={downloadSelectedExperiments}
                disabled={selectedExperiments.length === 0}
                variant="outline"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Selected ({selectedExperiments.length})
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search experiments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="scientist">Filter by Scientist</Label>
              <Select value={selectedScientist} onValueChange={setSelectedScientist}>
                <SelectTrigger>
                  <SelectValue placeholder="All scientists" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scientists</SelectItem>
                  {scientists.map((scientist) => (
                    <SelectItem key={scientist.id} value={scientist.id}>
                      {scientist.first_name} {scientist.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal" onClick={() => navigate('/lab-members')}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Date To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, 'PP') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Experiments Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedExperiments.length === filteredExperiments.length && filteredExperiments.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedExperiments(filteredExperiments.map(e => e.id));
                        } else {
                          setSelectedExperiments([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Experiment</TableHead>
                  <TableHead>Scientist</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Publication</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExperiments.map((experiment) => (
                  <TableRow key={experiment.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedExperiments.includes(experiment.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedExperiments(prev => [...prev, experiment.id]);
                          } else {
                            setSelectedExperiments(prev => prev.filter(id => id !== experiment.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {experiment.metadata?.experiment_name || experiment.metadata?.name || 'Untitled'}
                      </div>
                      {experiment.metadata?.description && (
                        <div className="text-sm text-muted-foreground">
                          {experiment.metadata.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{experiment.scientist_name}</TableCell>
                    <TableCell>{getStatusBadge(experiment.status)}</TableCell>
                    <TableCell>{new Date(experiment.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button
                        variant={experiment.marked_for_publication ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePublication(experiment.id, experiment.marked_for_publication)}
                      >
                        {experiment.marked_for_publication ? 'Published' : 'Mark for Pub'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/experiments/${experiment.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {experiment.status === 'pending_review' && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => updateExperimentStatus(experiment.id, 'approved')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => updateExperimentStatus(experiment.id, 'rejected')}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Scientists Management */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <span>Scientists Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Experiments</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scientists.map((scientist) => (
                <TableRow key={scientist.id}>
                  <TableCell>
                    <div className="font-medium">
                      {scientist.first_name} {scientist.last_name}
                    </div>
                  </TableCell>
                  <TableCell>{scientist.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{scientist.experiments_count}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={scientist.is_active ? "default" : "destructive"}>
                      {scientist.is_active ? 'Active' : 'Blocked'}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(scientist.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleScientistStatus(scientist.id, scientist.is_active)}
                    >
                      {scientist.is_active ? (
                        <>
                          <ShieldOff className="w-4 h-4 mr-1" />
                          Block
                        </>
                      ) : (
                        <>
                          <Shield className="w-4 h-4 mr-1" />
                          Activate
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Message Board */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span>Lab Message Board</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Send Message */}
            <div className="flex space-x-2">
              <Textarea
                placeholder="Type your message to the lab..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
                rows={3}
              />
              <Button
                onClick={sendMessage}
                disabled={isSendingMessage || !newMessage.trim()}
                className="px-6"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            <Separator />

            {/* Messages */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{message.sender_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm">{message.content}</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Footer */}
      <footer className="w-full text-center py-4 text-muted-foreground text-sm border-t mt-8">
        <img src="/watermark-logo.png" alt="SEARSv2 Logo" className="mx-auto mb-2 h-16 opacity-90" />
        &copy; Iowa State University {currentYear}
      </footer>
    </div>
  );
};
