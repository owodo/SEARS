import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

interface Solvent {
  name: string;
  value: string;
  mol_wt?: string;
  smiles?: string;
  hsp_delta_d?: string;
  hsp_delta_p?: string;
  hsp_delta_h?: string;
}

interface ExperimentMetadataFormProps {
  form: UseFormReturn<any>;
}

export const ExperimentMetadataForm = ({ form }: ExperimentMetadataFormProps) => {
  const solvents = form.watch('metadata.solvents') || [];

  const addSolvent = () => {
    const currentSolvents = form.getValues('metadata.solvents') || [];
    form.setValue('metadata.solvents', [
      ...currentSolvents,
      { name: '', value: '', mol_wt: '', smiles: '', hsp_delta_d: '', hsp_delta_p: '', hsp_delta_h: '' }
    ]);
  };

  const removeSolvent = (index: number) => {
    const currentSolvents = form.getValues('metadata.solvents') || [];
    form.setValue('metadata.solvents', currentSolvents.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="metadata.experiment_name"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>Experiment Name *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Spring24_SolvTemp_JPM_120" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.experiment_dt"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Experiment Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.experiment_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Amassian" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Polymer Information */}
      <Card>
        <CardHeader>
          <CardTitle>Polymer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="metadata.polymer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Polymer Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., PBTTT" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.polymer_mw"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Molecular Weight</FormLabel>
                <FormControl>
                  <Input placeholder="Molecular weight" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.polymer_rr"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Regioregularity</FormLabel>
                <FormControl>
                  <Input placeholder="RR value" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.polymer_batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Number</FormLabel>
                <FormControl>
                  <Input placeholder="Batch number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.polymer_company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Solvents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Solvents</CardTitle>
          <Button type="button" onClick={addSolvent} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Solvent
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {solvents.map((_, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Solvent {index + 1}</h4>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeSolvent(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`metadata.solvents.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., CB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`metadata.solvents.${index}.value`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 40" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`metadata.solvents.${index}.mol_wt`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Molecular Weight</FormLabel>
                      <FormControl>
                        <Input placeholder="Molecular weight" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`metadata.solvents.${index}.smiles`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMILES</FormLabel>
                      <FormControl>
                        <Input placeholder="SMILES notation" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-2">
                  <FormField
                    control={form.control}
                    name={`metadata.solvents.${index}.hsp_delta_d`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>δD</FormLabel>
                        <FormControl>
                          <Input placeholder="HSP δD" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`metadata.solvents.${index}.hsp_delta_p`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>δP</FormLabel>
                        <FormControl>
                          <Input placeholder="HSP δP" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`metadata.solvents.${index}.hsp_delta_h`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>δH</FormLabel>
                        <FormControl>
                          <Input placeholder="HSP δH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Dopant Information */}
      <Card>
        <CardHeader>
          <CardTitle>Dopant Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="metadata.dopant_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dopant Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., F4TCNQ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.dopant_batch"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch Number</FormLabel>
                <FormControl>
                  <Input placeholder="Batch number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.dopant_company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Process Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Process Parameters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="metadata.loading_polymer"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loading Polymer</FormLabel>
                <FormControl>
                  <Input placeholder="Loading polymer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.loading_dopant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loading Dopant</FormLabel>
                <FormControl>
                  <Input placeholder="Loading dopant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.loading_solvent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Loading Solvent</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., nBA" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 60" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.annealing_temperature"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annealing Temperature (°C)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 30" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.annealing_duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annealing Duration (min)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., 60" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Fabrication Details */}
      <Card>
        <CardHeader>
          <CardTitle>Fabrication Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="metadata.substrate_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Substrate Name</FormLabel>
                <FormControl>
                  <Input placeholder="Substrate name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.substrate_company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Substrate Company</FormLabel>
                <FormControl>
                  <Input placeholder="Company name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.fab_box"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fabrication Box</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Air" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="metadata.fab_humidity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Humidity (%)</FormLabel>
                <FormControl>
                  <Input placeholder="Humidity percentage" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="metadata.other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Other Information</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Any additional notes or information about the experiment..."
                    rows={4}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
};