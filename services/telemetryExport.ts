import { supabase } from './supabase';
import { TELEMETRY_RETENTION_DAYS } from '../constants';

export type TelemetryExportRow = {
  created_at: string;
  value: number;
  variable_name: string | null;
  unit: string | null;
};

/** All readings still in the database for this widget (bounded by TELEMETRY_RETENTION_DAYS). */
export async function fetchAllTelemetryForWidget(widgetId: string): Promise<TelemetryExportRow[]> {
  const start = new Date(Date.now() - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('telemetry_readings')
    .select('created_at, value, variable_name, unit')
    .eq('widget_id', widgetId)
    .gte('created_at', start)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as TelemetryExportRow[];
}

function escapeCsvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function telemetryRowsToCsv(
  rows: TelemetryExportRow[],
  headers: { time: string; value: string; variable: string; unit: string }
): string {
  const headerLine = [headers.time, headers.value, headers.variable, headers.unit].map(escapeCsvCell).join(',');
  const lines = rows.map((r) =>
    [
      escapeCsvCell(r.created_at),
      escapeCsvCell(String(r.value)),
      escapeCsvCell(r.variable_name ?? ''),
      escapeCsvCell(r.unit ?? ''),
    ].join(',')
  );
  return `\uFEFF${headerLine}\n${lines.join('\n')}`;
}

export function triggerBrowserDownload(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function safeFileSegment(name: string): string {
  const s = name.replace(/[^\w\-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return s.slice(0, 80) || 'widget';
}
