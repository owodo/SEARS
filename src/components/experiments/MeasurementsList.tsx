import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Measurement {
  id: string;
  value: number;
  unit: string;
  batch_number: string;
  reading_number: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

interface MeasurementsListProps {
  sectionId?: string;
  sectionType: string;
  refreshTrigger?: number; // increment this from parent to force a refresh
}

export const MeasurementsList = ({
  sectionId,
  refreshTrigger,
}: MeasurementsListProps) => {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (sectionId) loadMeasurements();
  }, [sectionId, refreshTrigger]);

  const loadMeasurements = async () => {
    if (!sectionId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('measurements')
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
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error loading measurements:', error);
      toast.error('Failed to load measurements');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Loading measurements...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (measurements.length === 0) return null;

  // For large datasets (> 100 rows e.g. full spectra) show a compact table
  // instead of individual cards to avoid overwhelming the UI
  const isLargeDataset = measurements.length > 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Recorded Measurements ({measurements.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLargeDataset ? (
          // Compact table view for full spectra
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Value</th>
                  <th className="px-3 py-2 font-medium">Unit</th>
                  <th className="px-3 py-2 font-medium">Batch</th>
                  <th className="px-3 py-2 font-medium">Reading / Position</th>
                  <th className="px-3 py-2 font-medium">Recorded by</th>
                </tr>
              </thead>
              <tbody>
                {measurements.map((m, i) => (
                  <tr
                    key={m.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-muted/20'}
                  >
                    <td className="px-3 py-1.5 font-mono">{m.value}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">{m.unit}</td>
                    <td className="px-3 py-1.5">{m.batch_number}</td>
                    <td className="px-3 py-1.5 font-mono">{m.reading_number}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">
                      {m.profiles?.first_name} {m.profiles?.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          // Card view for small datasets
          <div className="space-y-3">
            {measurements.map((measurement) => (
              <div
                key={measurement.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                  <div>
                    <p className="text-sm font-medium">Value</p>
                    <p className="text-lg">
                      {measurement.value} {measurement.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Batch</p>
                    <p>{measurement.batch_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Reading</p>
                    <p>{measurement.reading_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Recorded by</p>
                    <p>
                      {measurement.profiles?.first_name}{' '}
                      {measurement.profiles?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(measurement.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
