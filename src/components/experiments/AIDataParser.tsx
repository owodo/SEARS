import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Check, X, Loader2, AlertCircle } from 'lucide-react';

interface ParsedMeasurement {
  value: number;
  unit: string;
  batch_number: string;
  reading_number: string;
}

interface AIDataParserProps {
  sectionId?: string;
  sectionType: string;
  file: {
    id: string;
    filename: string;
    file_path: string;
    mime_type: string;
  };
  onMeasurementsAdded?: () => void;
}

const UNIT_HINTS: Record<string, string> = {
  thickness: 'nm (nanometers)',
  conductivity: 'S/cm (siemens per centimeter)',
  mobility: 'cm²/V·s',
  ftir: 'cm⁻¹ (wavenumber) for position, % or a.u. for intensity',
  uv_vis_nir: 'nm for wavelength, a.u. for absorbance',
  iv: 'V for voltage, mA or A for current',
  profilometry: 'µm or nm for height/depth',
  giwaxs: 'Å⁻¹ for q-vector, a.u. for intensity',
  skpm: 'mV for surface potential',
};

// Ollama runs locally on your VM — no API key needed
const OLLAMA_URL = 'http://localhost:11434';

export const AIDataParser = ({ sectionId, sectionType, file, onMeasurementsAdded }: AIDataParserProps) => {
  const { profile } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMeasurement[] | null>(null);
  const [inserting, setInserting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleParse = async () => {
    if (!sectionId || !profile) {
      toast.error('Section not ready or not logged in');
      return;
    }

    setParsing(true);
    setParseError(null);
    setParsedData(null);

    try {
      // Step 1: Download the file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('experiment-files')
        .download(file.file_path);

      if (downloadError) throw downloadError;

      const fileContent = await fileData.text();

      // Step 2: Build the prompt
      const unitHint = UNIT_HINTS[sectionType] || 'use appropriate SI units';

      const prompt = `You are a scientific data parser. Extract measurement data from this instrument file and return ONLY valid JSON — no markdown, no backticks, no explanation.

Return format:
{"measurements": [{"value": 123.4, "unit": "nm", "batch_number": "B001", "reading_number": "R001"}]}

Rules:
- For spectral data with many points, extract only KEY FEATURES: peaks, band edges, max/min values. Maximum 20 measurements.
- For tabular data, extract each row.
- Expected units for ${sectionType}: ${unitHint}
- If you find sample/batch identifiers in the file, use them as batch_number.
- Number readings sequentially: R001, R002, etc.
- Return ONLY the JSON object, nothing else.

File name: ${file.filename}
Section type: ${sectionType}

File contents (first 10000 chars):
${fileContent.substring(0, 10000)}`;

      // Step 3: Call Ollama API locally
      const ollamaResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: 0.1,
            num_predict: 4096,
          },
        }),
      });

      if (!ollamaResponse.ok) {
        const status = ollamaResponse.status;
        throw new Error(`Ollama returned status ${status}. Is the model pulled? Run: ollama pull llama3.2`);
      }

      const ollamaResult = await ollamaResponse.json();
      const responseText = ollamaResult.response || '';

      // Step 4: Parse the JSON response
      let parsed;
      try {
        const cleaned = responseText.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error('Failed to parse Ollama response:', responseText);
        setParseError('AI returned unparseable response. Try a smaller or cleaner file.');
        return;
      }

      const measurements = parsed.measurements || parsed.data || [];

      if (!Array.isArray(measurements) || measurements.length === 0) {
        setParseError('No measurements could be extracted from this file.');
        return;
      }

      // Validate and clean each measurement
      const valid = measurements
        .filter((m: any) => m.value !== undefined && m.value !== null && !isNaN(Number(m.value)))
        .map((m: any, i: number) => ({
          value: Number(m.value),
          unit: String(m.unit || ''),
          batch_number: String(m.batch_number || 'B001'),
          reading_number: String(m.reading_number || `R${String(i + 1).padStart(3, '0')}`),
        }));

      if (valid.length === 0) {
        setParseError('AI extracted data but no valid numeric measurements were found.');
        return;
      }

      setParsedData(valid);
      toast.success(`AI extracted ${valid.length} measurements`);
    } catch (error: any) {
      console.error('Error parsing file:', error);
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        setParseError('Cannot connect to Ollama. Make sure it is running: ollama serve');
      } else {
        setParseError(error.message || 'Failed to parse file');
      }
      toast.error('AI parsing failed');
    } finally {
      setParsing(false);
    }
  };

  const handleInsertAll = async () => {
    if (!parsedData || !sectionId || !profile) return;

    setInserting(true);
    try {
      const rows = parsedData.map((m) => ({
        section_id: sectionId,
        scientist_id: profile.id,
        value: m.value,
        unit: m.unit,
        batch_number: m.batch_number,
        reading_number: m.reading_number,
      }));

      const { error } = await supabase.from('measurements').insert(rows);

      if (error) throw error;

      toast.success(`${rows.length} measurements added successfully`);
      setParsedData(null);
      if (onMeasurementsAdded) onMeasurementsAdded();
    } catch (error: any) {
      console.error('Error inserting measurements:', error);
      toast.error(error.message || 'Failed to insert measurements');
    } finally {
      setInserting(false);
    }
  };

  const handleRemoveRow = (index: number) => {
    if (!parsedData) return;
    setParsedData(parsedData.filter((_, i) => i !== index));
  };

  const handleDiscard = () => {
    setParsedData(null);
    setParseError(null);
  };

  return (
    <div className="inline-flex flex-col">
      {!parsedData && !parseError && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleParse}
          disabled={parsing}
          className="text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          {parsing ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              AI Parsing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              AI Parse
            </>
          )}
        </Button>
      )}

      {parseError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm text-red-700">{parseError}</p>
              <Button variant="ghost" size="sm" onClick={handleDiscard} className="mt-1 text-xs">
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {parsedData && parsedData.length > 0 && (
        <Card className="mt-3 border-purple-200">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                AI Extracted {parsedData.length} Measurements — Review & Confirm
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleInsertAll}
                  disabled={inserting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {inserting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-1" />
                  )}
                  Insert All
                </Button>
                <Button size="sm" variant="outline" onClick={handleDiscard}>
                  <X className="w-4 h-4 mr-1" />
                  Discard
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Value</th>
                    <th className="text-left p-2 font-medium">Unit</th>
                    <th className="text-left p-2 font-medium">Batch</th>
                    <th className="text-left p-2 font-medium">Reading</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((m, i) => (
                    <tr key={i} className="border-t hover:bg-muted/20">
                      <td className="p-2">{m.value}</td>
                      <td className="p-2 text-muted-foreground">{m.unit}</td>
                      <td className="p-2">{m.batch_number}</td>
                      <td className="p-2">{m.reading_number}</td>
                      <td className="p-2">
                        <button
                          onClick={() => handleRemoveRow(i)}
                          className="text-muted-foreground hover:text-red-500"
                          title="Remove this row"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
