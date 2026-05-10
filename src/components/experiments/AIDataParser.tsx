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
  file: { id: string; filename: string; file_path: string; mime_type: string };
  onMeasurementsAdded?: () => void;
}

const UNIT_HINTS: Record<string, string> = {
  thickness: 'nm', conductivity: 'S/m', mobility: 'cm2/Vs',
  ftir: 'cm-1', uv_vis_nir: 'nm', iv: 'V',
  profilometry: 'um', giwaxs: 'A-1', skpm: 'mV',
};

const COL_KEYWORDS: Record<string, string[]> = {
  conductivity: ['conductivity', 's/m', 'siemens'],
  thickness: ['thickness', 'height', 'depth', 'nm'],
  mobility: ['mobility', 'cm2/v'],
  ftir: ['wavenumber', 'cm-1', 'absorbance', 'transmittance'],
  uv_vis_nir: ['wavelength', 'absorbance', 'absorb'],
  iv: ['current', 'voltage'],
  profilometry: ['profile', 'step height'],
  giwaxs: ['q-vector', 'intensity'],
  skpm: ['potential', 'skpm'],
};

const OLLAMA_URL = 'http://192.168.64.2:11434';

function parseCSV(content: string, sectionType: string): ParsedMeasurement[] | null {
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const keywords = COL_KEYWORDS[sectionType] || [];
  let col = -1;
  let unitFromHeader = '';
  for (let i = 0; i < headers.length; i++) {
    for (const kw of keywords) {
      if (headers[i].includes(kw)) {
        col = i;
        const m = headers[i].match(/\(([^)]+)\)/);
        if (m) unitFromHeader = m[1];
        break;
      }
    }
    if (col >= 0) break;
  }
  if (col < 0) {
    for (let i = headers.length - 1; i >= 0; i--) {
      const v = lines[1]?.split(',')[i]?.trim();
      if (v && !isNaN(Number(v))) {
        col = i;
        const m = headers[i].match(/\(([^)]+)\)/);
        if (m) unitFromHeader = m[1];
        break;
      }
    }
  }
  if (col < 0) return null;
  const unit = unitFromHeader || UNIT_HINTS[sectionType] || '';
  const results: ParsedMeasurement[] = [];
  const expectedCols = headers.length;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length !== expectedCols) continue;
    const val = Number(cols[col]);
    if (isNaN(val)) continue;
    results.push({
      value: parseFloat(val.toFixed(6)),
      unit,
      batch_number: 'B001',
      reading_number: `R${String(results.length + 1).padStart(3, '0')}`,
    });
  }
  return results.length > 0 ? results : null;
}

function parseJSON(content: string, sectionType: string): ParsedMeasurement[] | null {
  try {
    const data = JSON.parse(content);
    const results: ParsedMeasurement[] = [];
    const wl = data.wavelengths2 || data.wavelengths || data.x;
    const ab = data.absorb2 || data.absorb || data.y;
    if (Array.isArray(wl) && Array.isArray(ab)) {
      const peaks: { wl: number; abs: number }[] = [];
      for (let i = 1; i < ab.length - 1; i++) {
        if (ab[i] == null || isNaN(ab[i])) continue;
        if (ab[i] > ab[i - 1] && ab[i] > ab[i + 1] && ab[i] > 0.1) {
          peaks.push({ wl: wl[i], abs: ab[i] });
        }
      }
      peaks.sort((a, b) => b.abs - a.abs);
      const top = peaks.slice(0, 15).sort((a, b) => a.wl - b.wl);
      for (const p of top) {
        results.push({
          value: parseFloat(p.wl.toFixed(2)),
          unit: 'nm',
          batch_number: 'B001',
          reading_number: `R${String(results.length + 1).padStart(3, '0')}`,
        });
      }
      return results.length > 0 ? results : null;
    }
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      const keys = Object.keys(data[0]);
      const vk = keys[keys.length - 1];
      for (let i = 0; i < Math.min(data.length, 50); i++) {
        const val = Number(data[i][vk]);
        if (isNaN(val)) continue;
        results.push({
          value: parseFloat(val.toFixed(6)),
          unit: UNIT_HINTS[sectionType] || '',
          batch_number: 'B001',
          reading_number: `R${String(results.length + 1).padStart(3, '0')}`,
        });
      }
      return results.length > 0 ? results : null;
    }
    return null;
  } catch { return null; }
}

export const AIDataParser = ({ sectionId, sectionType, file, onMeasurementsAdded }: AIDataParserProps) => {
  const { profile } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedMeasurement[] | null>(null);
  const [inserting, setInserting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [method, setMethod] = useState('');

  const handleParse = async () => {
    if (!sectionId || !profile) { toast.error('Not ready'); return; }
    setParsing(true); setParseError(null); setParsedData(null); setMethod('');
    try {
      const { data: fd, error: de } = await supabase.storage.from('experiment-files').download(file.file_path);
      if (de) throw de;
      const content = await fd.text();
      const isCSV = /\.(csv|tsv)$/i.test(file.filename);
      const isJSON = /\.json$/i.test(file.filename);
      let results: ParsedMeasurement[] | null = null;
      if (isCSV) { results = parseCSV(content, sectionType); if (results) setMethod('Smart CSV parser'); }
      else if (isJSON) { results = parseJSON(content, sectionType); if (results) setMethod('Smart JSON parser'); }
      if (!results) {
        setMethod('Ollama AI');
        const unit = UNIT_HINTS[sectionType] || 'SI units';
        const prompt = `You are a scientific data parser. Extract ALL data rows from this ${sectionType} file. Return ONLY JSON: {"measurements":[{"value":number,"unit":"string","batch_number":"B001","reading_number":"R001"}]}. Read column headers for correct units. Expected: ${unit}. Extract EVERY row, not summaries. File: ${file.filename}\n\n${content.substring(0, 12000)}`;
        const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'llama3.2:1b', prompt, stream: false, format: 'json', options: { temperature: 0.1, num_predict: 8192 } }),
        });
        if (!resp.ok) throw new Error('Ollama error. Is it running?');
        const r = await resp.json();
        try {
          const p = JSON.parse((r.response || '').replace(/```json|```/g, '').trim());
          const m = p.measurements || p.data || [];
          if (Array.isArray(m) && m.length > 0) {
            results = m.filter((x: any) => x.value != null && !isNaN(Number(x.value)))
              .map((x: any, i: number) => ({ value: Number(x.value), unit: String(x.unit || unit), batch_number: String(x.batch_number || 'B001'), reading_number: String(x.reading_number || `R${String(i+1).padStart(3,'0')}`) }));
          }
        } catch { setParseError('AI returned unparseable response.'); return; }
      }
      if (!results || results.length === 0) { setParseError('No measurements extracted.'); return; }
      setParsedData(results);
      toast.success(`Extracted ${results.length} measurements`);
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch')) setParseError('Cannot connect to Ollama.');
      else setParseError(err.message || 'Parse failed');
    } finally { setParsing(false); }
  };

  const handleInsertAll = async () => {
    if (!parsedData || !sectionId || !profile) return;
    setInserting(true);
    try {
      const rows = parsedData.map(m => ({ section_id: sectionId, scientist_id: profile.id, value: m.value, unit: m.unit, batch_number: m.batch_number, reading_number: m.reading_number }));
      const { error } = await supabase.from('measurements').insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} measurements added`);
      setParsedData(null); setMethod('');
      if (onMeasurementsAdded) onMeasurementsAdded();
    } catch (err: any) { toast.error(err.message || 'Insert failed'); }
    finally { setInserting(false); }
  };

  const handleRemoveRow = (i: number) => {
    if (!parsedData) return;
    const u = parsedData.filter((_, idx) => idx !== i);
    if (u.length === 0) { setParsedData(null); setMethod(''); } else setParsedData(u);
  };

  const handleDiscard = () => { setParsedData(null); setParseError(null); setMethod(''); };

  return (
    <div className="inline-flex flex-col">
      {parsedData === null && parseError === null && (
        <Button variant="outline" size="sm" onClick={handleParse} disabled={parsing} className="text-purple-600 border-purple-200 hover:bg-purple-50">
          {parsing ? <><Loader2 className="w-4 h-4 mr-1 animate-spin"/>Parsing...</> : <><Sparkles className="w-4 h-4 mr-1"/>AI Parse</>}
        </Button>
      )}
      {parseError && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg max-w-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0"/>
            <div><p className="text-sm text-red-700">{parseError}</p>
              <Button variant="ghost" size="sm" onClick={handleDiscard} className="mt-1 text-xs">Try again</Button>
            </div>
          </div>
        </div>
      )}
      {parsedData && parsedData.length > 0 && (
        <Card className="mt-3 border-purple-200">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600"/>
                <span>Extracted {parsedData.length} measurements {method && <span className="text-muted-foreground font-normal ml-1">via {method}</span>}</span>
              </span>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInsertAll} disabled={inserting} className="bg-green-600 hover:bg-green-700">
                  {inserting ? <Loader2 className="w-4 h-4 mr-1 animate-spin"/> : <Check className="w-4 h-4 mr-1"/>}Insert All
                </Button>
                <Button size="sm" variant="outline" onClick={handleDiscard}><X className="w-4 h-4 mr-1"/>Discard</Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0"><tr>
                  <th className="text-left p-2 font-medium">Value</th>
                  <th className="text-left p-2 font-medium">Unit</th>
                  <th className="text-left p-2 font-medium">Batch</th>
                  <th className="text-left p-2 font-medium">Reading</th>
                  <th className="p-2 w-8"></th>
                </tr></thead>
                <tbody>{parsedData.map((m, i) => (
                  <tr key={i} className="border-t hover:bg-muted/20">
                    <td className="p-2">{m.value}</td>
                    <td className="p-2 text-muted-foreground">{m.unit}</td>
                    <td className="p-2">{m.batch_number}</td>
                    <td className="p-2">{m.reading_number}</td>
                    <td className="p-2"><button onClick={() => handleRemoveRow(i)} className="text-muted-foreground hover:text-red-500"><X className="w-3 h-3"/></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
