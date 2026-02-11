import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ExperimentMetadataForm } from './ExperimentMetadataForm';
import { MeasurementSections } from './MeasurementSections';

const experimentSchema = z.object({
  metadata: z.object({
    experiment_name: z.string().min(1, 'Experiment name is required'),
    experiment_dt: z.string(),
    experiment_location: z.string().optional(),
    polymer_name: z.string().optional(),
    polymer_mw: z.string().optional(),
    polymer_rr: z.string().optional(),
    polymer_batch: z.string().optional(),
    polymer_company: z.string().optional(),
    solvents: z.array(z.object({
      name: z.string(),
      value: z.string(),
      mol_wt: z.string().optional(),
      smiles: z.string().optional(),
      hsp_delta_d: z.string().optional(),
      hsp_delta_p: z.string().optional(),
      hsp_delta_h: z.string().optional(),
    })).optional(),
    dopant_name: z.string().optional(),
    dopant_batch: z.string().optional(),
    dopant_company: z.string().optional(),
    loading_polymer: z.string().optional(),
    loading_dopant: z.string().optional(),
    loading_solvent: z.string().optional(),
    temperature: z.string().optional(),
    print_speed: z.string().optional(),
    print_voltage: z.string().optional(),
    print_head_diameter: z.string().optional(),
    exposure_time: z.string().optional(),
    substrate_name: z.string().optional(),
    substrate_company: z.string().optional(),
    annealing_temperature: z.string().optional(),
    annealing_duration: z.string().optional(),
    fab_box: z.string().optional(),
    fab_humidity: z.string().optional(),
    other: z.string().optional(),
  }),
});

type ExperimentFormData = z.infer<typeof experimentSchema>;

interface ExperimentFormProps {
  onSuccess?: () => void;
  experimentId?: string | null;
}

export const ExperimentForm = ({ onSuccess, experimentId: propExperimentId }: ExperimentFormProps) => {
  const { profile } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [experimentId, setExperimentId] = useState<string | null>(propExperimentId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<ExperimentFormData>({
    resolver: zodResolver(experimentSchema),
    defaultValues: {
      metadata: {
        experiment_name: '',
        experiment_dt: new Date().toISOString().split('T')[0],
        experiment_location: '',
        polymer_name: '',
        solvents: [],
        fab_box: 'Air',
      },
    },
  });

  // Prefill form if editing
  React.useEffect(() => {
    const fetchExperiment = async () => {
      if (propExperimentId) {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase
          .from('experiments')
          .select('*')
          .eq('id', propExperimentId)
          .single();
        if (error) {
          setError('Experiment not found or failed to load.');
        } else if (data && typeof data.metadata === 'object' && data.metadata !== null && !Array.isArray(data.metadata)) {
          form.reset({ metadata: data.metadata });
          setExperimentId(data.id);
        } else {
          setError('Experiment metadata is invalid or not an object.');
        }
        setLoading(false);
      }
    };
    if (propExperimentId) {
      fetchExperiment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propExperimentId]);

  const onSubmit = async (data: ExperimentFormData) => {
    if (!profile) {
      toast.error('You must be logged in to submit an experiment');
      return;
    }
    if (!profile.lab_id) {
      toast.error('You must be assigned to a lab before creating experiments. Please contact your lab administrator.');
      return;
    }
    try {
      if (experimentId) {
        // Update existing experiment
        const { error } = await supabase
          .from('experiments')
          .update({ metadata: data.metadata })
          .eq('id', experimentId);
        if (error) throw error;
        toast.success('Experiment updated successfully!');
        setCurrentStep(1); // Advance to measurement sections
      } else {
        // Create new experiment
        const experimentData = {
          metadata: data.metadata,
          scientist_id: profile.id,
          lab_id: profile.lab_id,
          status: 'draft',
        };
        const { data: experiment, error } = await supabase
          .from('experiments')
          .insert(experimentData)
          .select()
          .single();
        if (error) throw error;
        setExperimentId(experiment.id);
        setCurrentStep(1);
        toast.success('Experiment created successfully!');
      }
    } catch (error) {
      console.error('Error submitting experiment:', error);
      toast.error('Failed to submit experiment. Check console for details.');
    }
  };

  const steps = [
    { title: 'Experiment Metadata', component: 'metadata' },
    { title: 'Measurement Sections', component: 'measurements' },
  ];

  if (error) {
    return <div className="container mx-auto py-8 text-center text-destructive">{error}</div>;
  }
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {steps.map((step, index) => (
          <div
            key={index}
            className={`flex items-center space-x-2 ${
              index <= currentStep ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index + 1}
            </div>
            <span className="font-medium">{step.title}</span>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : currentStep === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{experimentId ? 'Edit Experiment' : 'Create New Experiment'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <ExperimentMetadataForm form={form} />
                <div className="flex justify-end space-x-4">
                  <Button type="submit">{experimentId ? 'Save Changes' : 'Create Experiment'}</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {currentStep === 1 && experimentId && (
        <MeasurementSections 
          experimentId={experimentId} 
          onComplete={() => {
            toast.success('Experiment completed!');
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
};