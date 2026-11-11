import type { ApiRecord, ApiRow } from '../../types';

export const technicianRecord = (row: ApiRow): ApiRecord => {
  try { return row._raw ? JSON.parse(row._raw) as ApiRecord : {}; }
  catch { return {}; }
};
export const numericMetric = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
export const metricText = (value: unknown): string => {
  const number = numericMetric(value);
  return number === null ? '—' : number.toLocaleString('fr-DZ', { maximumFractionDigits: 1 });
};
