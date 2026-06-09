import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MeasurementEntryForm } from './MeasurementEntryForm';
import { FileUploadSection } from './FileUploadSection';
import { MeasurementsList } from './MeasurementsList';

interface MeasurementSectionsProps {
  experimentId: string;
  onComplete?: () => void;
}

export const MeasurementSections = ({ experimentId, onComplete }: MeasurementSectionsProps) => {
  const [sections, setSections] = useState<any[]>([]);

  const measurementSections = [
    { type: 'thickness', label: 'Thickness', hasFiles: false },
    { type: 'uv_vis_nir', label: 'UV-VIS-NIR', hasFiles: true },
    { type: 'giwaxs', label: 'GIWAXS', hasFiles: true },
    { type: 'conductivity', label: 'Conductivity', hasFiles: false },
    { type: 'skpm', label: 'SKPM', hasFiles: true },
    { type: 'iv', label: 'IV', hasFiles: true },
    { type: 'profilometry', label: 'Profilometry', hasFiles: true },
    { type: 'mobility', label: 'Mobility', hasFiles: false },
  ];

  useEffect(() => {
  initializeSections();
  }, [experimentId]);

  const initializeSections = async () => {
    try {
      // First, fetch existing measurement sections for this experiment
      const { data: existingSections, error: fetchError } = await supabase
        .from('measurement_sections')
        .select('*')
        .eq('experiment_id', experimentId);

      if (fetchError) throw fetchError;

      if (existingSections && existingSections.length > 0) {
        setSections(existingSections);
        return;
      }

      // If no sections exist, create them
      const sectionsToCreate = measurementSections.map(section => ({
        experiment_id: experimentId,
        section_type: section.type,
      }));

      const { data: createdSections, error: insertError } = await supabase
        .from('measurement_sections')
        .insert(sectionsToCreate)
        .select();

      if (insertError) throw insertError;

      setSections(createdSections || []);
    } catch (error) {
      console.error('Error initializing sections:', error);
      toast.error('Failed to initialize measurement sections');
    }
  };

  const getSectionId = (sectionType: string) => {
    return sections.find(s => s.section_type === sectionType)?.id;
  };

  const [activeTab, setActiveTab] = useState(measurementSections[0].type);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Measurement Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-6">
              {measurementSections.map((section) => (
                <TabsTrigger 
                  key={section.type} 
                  value={section.type}
                  className="text-xs cursor-pointer"
                >
                  {section.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {measurementSections.map((section) => (
              <TabsContent key={section.type} value={section.type}>
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{section.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Manual entry form — only for data-entry sections */}
                      {!section.hasFiles && (
                        <MeasurementEntryForm
                          sectionId={getSectionId(section.type)}
                          sectionType={section.type}
                        />
                      )}
                      {/* File upload — only for file sections */}
                      {section.hasFiles && (
                        <FileUploadSection
                          sectionId={getSectionId(section.type)}
                          sectionType={section.type}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Measurements list — shown on ALL sections regardless of type */}
                  <MeasurementsList
                    sectionId={getSectionId(section.type)}
                    sectionType={section.type}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="flex justify-end mt-8">
            <Button onClick={onComplete}>
              Complete Experiment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
