import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface PlotViewerProps {
  file: {
    id: string;
    filename: string;
    file_path: string;
    mime_type: string;
  };
  onClose: () => void;
}

interface DataPoint {
  x: number;
  y: number;
}

export const PlotViewer = ({ file }: PlotViewerProps) => {
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAndParseFile();
  }, [file]);

  const loadAndParseFile = async () => {
    setLoading(true);
    setError(null);

    try {
      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('experiment-files')
        .download(file.file_path);

      if (downloadError) throw downloadError;

      // Convert blob to text
      const text = await fileData.text();
      
      // Parse CSV data
      const lines = text.split('\n').filter(line => line.trim() !== '');
      const parsedData: DataPoint[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines or header lines (if they contain non-numeric data)
        if (!line) continue;
        
        const values = line.split(',').map(v => v.trim());
        
        // Try to parse as numbers
        if (values.length >= 2) {
          const x = parseFloat(values[0]);
          const y = parseFloat(values[1]);
          
          // Only add if both values are valid numbers
          if (!isNaN(x) && !isNaN(y)) {
            parsedData.push({ x, y });
          }
        }
      }

      if (parsedData.length === 0) {
        throw new Error('No valid data points found in the file');
      }

      setData(parsedData);
    } catch (error) {
      console.error('Error loading file:', error);
      setError(error instanceof Error ? error.message : 'Failed to load file');
      toast.error('Failed to load and parse file');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading and parsing file...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading file</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {data.length} data points from {file.filename}
      </div>
      
      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="x" 
              type="number"
              scale="auto"
              domain={['dataMin', 'dataMax']}
            />
            <YAxis 
              dataKey="y"
              type="number"
              scale="auto"
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip 
              formatter={(value, name) => [value, name === 'y' ? 'Y Value' : 'X Value']}
              labelFormatter={(label) => `X: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey="y" 
              stroke="hsl(var(--primary))" 
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-xs text-muted-foreground">
        <p>X-axis: First column of CSV data</p>
        <p>Y-axis: Second column of CSV data</p>
      </div>
    </div>
  );
};