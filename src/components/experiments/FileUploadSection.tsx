import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, FileText, Eye, Download, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PlotViewer } from './PlotViewer';
import { AIDataParser } from './AIDataParser';

interface FileUploadSectionProps {
  sectionId?: string;
  sectionType: string;
}

interface ExperimentFile {
  id: string;
  filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  scientist_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const FileUploadSection = ({ sectionId, sectionType }: FileUploadSectionProps) => {
  const { profile } = useAuth();
  // Dynamically import LabOwnerDashboard to access refreshLabStats
  let refreshLabStats: (() => Promise<void>) | null = null;
  try {
    // @ts-ignore
    refreshLabStats = require('@/components/dashboard/LabOwnerDashboard').refreshLabStats;
  } catch {}
  const [files, setFiles] = useState<ExperimentFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<ExperimentFile | null>(null);
  const [showPlotDialog, setShowPlotDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sectionId) {
      loadFiles();
    }
  }, [sectionId]);

  const loadFiles = async () => {
    if (!sectionId) return;

    try {
      const { data, error } = await supabase
        .from('experiment_files')
        .select(`
          *,
          profiles:scientist_id (
            first_name,
            last_name
          )
        `)
        .eq('section_id', sectionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !sectionId || !profile) {
      toast.error('Please select a file');
      return;
    }

    // Check file size (1MB limit)
    if (file.size > 1024 * 1024) {
      toast.error('File size must be less than 1MB');
      return;
    }

    setUploading(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${sectionType}/${sectionId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('experiment-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file record to database
      const { error: dbError } = await supabase
        .from('experiment_files')
        .insert({
          section_id: sectionId,
          scientist_id: profile.id,
          filename: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      toast.success('File uploaded successfully');
      loadFiles();
      // Call refreshLabStats if available
      if (refreshLabStats) await refreshLabStats();
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: ExperimentFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('experiment-files')
        .download(file.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const handleViewPlot = (file: ExperimentFile) => {
    setSelectedFile(file);
    setShowPlotDialog(true);
  };

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const isCSVFile = (mimeType: string, filename: string) => {
    return mimeType === 'text/csv' || filename.toLowerCase().endsWith('.csv');
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".csv,.txt,.xlsx,.xls,.json,.dpt,.spa"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Select File'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Maximum file size: 1MB. Supported formats: CSV, TXT, Excel, JSON, DPT, SPA
          </p>
        </CardContent>
      </Card>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Files ({files.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div 
                  key={file.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{file.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.file_size)} • 
                        Uploaded by {file.profiles?.first_name} {file.profiles?.last_name} • 
                        {new Date(file.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <AIDataParser
                      sectionId={sectionId}
                      sectionType={sectionType}
                      file={file}
                      onMeasurementsAdded={loadFiles}
                    />
                    {isCSVFile(file.mime_type, file.filename) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPlot(file)}
                      >
                        <BarChart3 className="w-4 h-4 mr-1" />
                        Plot
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(file)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plot Viewer Dialog */}
      <Dialog open={showPlotDialog} onOpenChange={setShowPlotDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              Plot Viewer - {selectedFile?.filename}
            </DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <PlotViewer 
              file={selectedFile} 
              onClose={() => setShowPlotDialog(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
