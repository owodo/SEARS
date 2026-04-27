import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const measurementSchema = z.object({
  value: z.string().min(1, 'Value is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  reading_number: z.string().min(1, 'Reading number is required'),
  unit: z.string().optional(),
});

type MeasurementFormData = z.infer<typeof measurementSchema>;

interface MeasurementEntryFormProps {
  sectionId?: string;
  sectionType: string;
}

interface Measurement {
  id: string;
  value: number;
  batch_number: string;
  reading_number: string;
  unit?: string;
  created_at: string;
  scientist_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const MeasurementEntryForm = ({ sectionId, sectionType }: MeasurementEntryFormProps) => {
  const { profile } = useAuth();
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      value: '',
      batch_number: '',
      reading_number: '',
      unit: getDefaultUnit(sectionType),
    },
  });

  useEffect(() => {
    if (sectionId) {
      loadMeasurements();
    }
  }, [sectionId]);

  function getDefaultUnit(type: string): string {
    switch (type) {
      case 'thickness':
        return 'nm';
      case 'conductivity':
        return 'S/cm';
      case 'mobility':
        return 'cm²/V·s';
      default:
        return '';
    }
  }

  const loadMeasurements = async () => {
    if (!sectionId) return;

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
    }
  };

  const onSubmit = async (data: MeasurementFormData) => {
    if (!sectionId || !profile) {
      toast.error('Section not initialized or user not logged in');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('measurements')
        .insert({
          section_id: sectionId,
          scientist_id: profile.id,
          value: parseFloat(data.value),
          batch_number: data.batch_number,
          reading_number: data.reading_number,
          unit: data.unit,
        }, { });

      if (error) throw error;

      toast.success('Measurement added successfully');
      form.reset({
        value: '',
        batch_number: '',
        reading_number: '',
        unit: getDefaultUnit(sectionType),
      });
      loadMeasurements();
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast.error('Failed to add measurement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Measurement */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Add New Measurement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="any" 
                          placeholder="Enter value" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <FormControl>
                        <Input placeholder="Unit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="batch_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., B001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="reading_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reading Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., R001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? 'Adding...' : 'Add Measurement'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Existing Measurements */}
      {measurements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recorded Measurements ({measurements.length})</CardTitle>
          </CardHeader>
          <CardContent>
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
                        {measurement.profiles?.first_name} {measurement.profiles?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(measurement.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
