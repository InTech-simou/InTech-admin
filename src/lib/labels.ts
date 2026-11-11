const deviceNames: Record<string, string> = {
  appliance_fridge: 'Réfrigérateur',
  appliance_washer: 'Lave-linge',
  appliance_ac: 'Climatiseur',
};
const specialtyNames: Record<string, string> = {
  refrigeration: 'Réfrigération',
  washing: 'Lavage',
  electronics: 'Électronique',
  air_conditioning: 'Climatisation',
  ac: 'Climatisation',
};
export const deviceLabel = (value: unknown): string => deviceNames[String(value)] || String(value ?? '—').replaceAll('_', ' ');
export const specialtyLabel = (value: unknown): string => specialtyNames[String(value)] || String(value ?? '—').replaceAll('_', ' ');
