import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  FlaskConical, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

interface Experiment {
  id: string;
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
  scientist_id: string;
  approved_at: string | null;
  approved_by: string | null;
  marked_for_publication: boolean;
}

const Experiments = () => {
  const currentYear = new Date().getFullYear();
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingExperiments, setLoadingExperiments] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && profile) {
      fetchExperiments();
    }
  }, [user, profile]);

  const fetchExperiments = async () => {
    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching experiments:', error);
        toast.error('Failed to load experiments');
        return;
      }

      setExperiments(data || []);
    } catch (error) {
      console.error('Error fetching experiments:', error);
      toast.error('Failed to load experiments');
    } finally {
      setLoadingExperiments(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-success text-success-foreground">Approved</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">Pending</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'draft':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  // ...existing code...

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Experiments</h1>
            <p className="text-muted-foreground">
              Manage and track your material science experiments
            </p>
          </div>
          {(profile.role === 'scientist' || profile.role === 'lab_owner') && (
            <Button 
              onClick={() => navigate('/experiments/create')}
              className="bg-gradient-primary hover:opacity-90 transition-smooth"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Experiment
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-2">
          <input
            type="text"
            className="border rounded px-3 py-2 w-full focus:outline-none focus:ring focus:border-primary"
            placeholder="Search experiments by name or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Experiments Grid */}
        {loadingExperiments ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : experiments.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <FlaskConical className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No experiments yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first experiment to start tracking your research
              </p>
              {(profile.role === 'scientist' || profile.role === 'lab_owner') && (
                <Button 
                  onClick={() => navigate('/experiments/create')}
                  variant="outline"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Experiment
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {experiments
              .filter(experiment => {
                const name = experiment.metadata?.experiment_name?.toLowerCase() || '';
                const desc = experiment.metadata?.description?.toLowerCase() || '';
                const term = searchTerm.toLowerCase();
                return name.includes(term) || desc.includes(term);
              })
              .map((experiment) => (
                <Card key={experiment.id} className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/20 border-2 border-primary/30 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        {getStatusIcon(experiment.status)}
                        <CardTitle
                          className="text-lg font-bold truncate max-w-xs text-primary drop-shadow-sm"
                          title={experiment.metadata?.experiment_name || 'Untitled Experiment'}
                        >
                          {experiment.metadata?.experiment_name || 'Untitled Experiment'}
                        </CardTitle>
                      </div>
                      <div className="flex-shrink-0">
                        {getStatusBadge(experiment.status)}
                      </div>
                    </div>
                    <CardDescription className="truncate max-w-xs text-ellipsis text-accent font-medium">
                      {experiment.metadata?.description || 'No description provided'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 bg-white/60 rounded-lg p-4 mt-2">
                    <div className="flex items-center text-sm text-primary font-semibold">
                      <Calendar className="w-4 h-4 mr-2" />
                      Created {new Date(experiment.created_at).toLocaleDateString()}
                    </div>
                    {experiment.metadata?.experiment_type && (
                      <div className="flex items-center text-sm text-secondary font-semibold">
                        <FlaskConical className="w-4 h-4 mr-2" />
                        {experiment.metadata.experiment_type}
                      </div>
                    )}
                    {experiment.approved_at && (
                      <div className="flex items-center text-sm text-green-600 font-semibold">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approved {new Date(experiment.approved_at).toLocaleDateString()}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => navigate(`/experiments/${experiment.id}`)}
                      >
                        View Details
                      </Button>
                      {/* Download JSON icon */}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Download as JSON"
                        onClick={() => handleDownloadJSON(experiment)}
                      >
                        <FileText className="w-5 h-5" />
                      </Button>
                      {/* Download ZIP icon */}
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Download all files as ZIP"
                        onClick={() => handleDownloadZIP(experiment)}
                      >
                        <FlaskConical className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Download experiment data as JSON
function handleDownloadJSON(experiment) {
  const dataStr = JSON.stringify(experiment, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${experiment.metadata?.experiment_name || 'experiment'}-${experiment.id}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Download all experiment files as ZIP (scaffold)
async function handleDownloadZIP(experiment) {
  toast.info('Preparing ZIP download...');
  try {
    // 1. Fetch all measurement sections for the experiment
    const { data: sections, error: sectionError } = await supabase
      .from('measurement_sections')
      .select('id, section_type')
      .eq('experiment_id', experiment.id);
    if (sectionError) throw sectionError;
    if (!sections || sections.length === 0) {
      toast.error('No measurement sections found for this experiment.');
      return;
    }

    // 2. Fetch all files for those sections
    const sectionIds = sections.map(s => s.id);
    const { data: files, error: fileError } = await supabase
      .from('experiment_files')
      .select('id, filename, file_path, section_id')
      .in('section_id', sectionIds);
    if (fileError) throw fileError;
    if (!files || files.length === 0) {
      toast.error('No files found for this experiment.');
      return;
    }

    // 3. Download each file from Supabase Storage
    const zip = new JSZip();
    for (const file of files) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('experiment-files')
        .download(file.file_path);
      if (downloadError) {
        toast.error(`Failed to download file: ${file.filename}`);
        continue;
      }
      zip.file(file.filename, fileData);
    }

    // 4. Generate ZIP and trigger download
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${experiment.metadata?.experiment_name || 'experiment'}-${experiment.id}-files.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('ZIP download started!');
  } catch (err) {
    console.error('ZIP download error:', err);
    toast.error('Failed to download ZIP.');
  }
}

export default Experiments;
