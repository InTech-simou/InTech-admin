import { useEffect, useMemo, useState } from 'react';
import { Setting2 as Wrench } from 'iconsax-react';
import { CustomTable } from '../../components';
import { apiRequest } from '../../config/api';
import { useApiMutations, usePageData } from '../../hooks';
import { hasPermission } from '../../lib/access';
import { AssignTechnicianDrawer } from './components';
import { CreateRequestFlow } from './CreateRequestFlow';
import type { ApiRecord, ApiRow } from '../../types';
import type { ScreenPageProps } from '../../types/page';
export function Requests(props: ScreenPageProps) {
  const data = usePageData({ ...props, page: 'Demandes' });
  const [devices, setDevices] = useState<ApiRecord[]>([]);
  const [domains, setDomains] = useState<ApiRecord[]>([]);
  useEffect(() => {
    let active = true;
    void Promise.allSettled([
      apiRequest<ApiRecord>(props.base, props.token, '/admin/device-products'),
      apiRequest<ApiRecord>(props.base, props.token, '/admin/diagnostic-domains'),
    ]).then(([deviceResult, domainResult]) => {
      if (!active) return;
      if (deviceResult.status === 'fulfilled') {
        const result = deviceResult.value;
        setDevices(Array.isArray(result.data) ? result.data : Array.isArray(result.device_products) ? result.device_products : []);
      }
      if (domainResult.status === 'fulfilled') {
        const result = domainResult.value;
        setDomains(Array.isArray(result.data) ? result.data : Array.isArray(result.diagnostic_domains) ? result.diagnostic_domains : []);
      }
    });
    return () => { active = false; };
  }, [props.base, props.token]);
  const deviceOptions = useMemo(() => devices.filter(item => item.is_active !== false && item.device_key).map(item => ({ label: String(item.name_fr || item.name_ar || item.device_key), value: String(item.device_key) })), [devices]);
  const deviceNames = useMemo(() => new Map(deviceOptions.map(item => [item.value, item.label])), [deviceOptions]);
  const tableRows = useMemo(() => data.visibleRows.map(row => ({ ...row, Appareil: deviceNames.get(String(row.Appareil)) || row.Appareil, Type: row.Type === 'domicile' ? 'À domicile' : row.Type === 'ac' ? 'Climatisation' : row.Type })), [data.visibleRows, deviceNames]);
  const [assigningRow, setAssigningRow] = useState<ApiRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [assignNotice, setAssignNotice] = useState('');
  const canDispatch = hasPermission(props.user, 'assignments');
  const actions = useApiMutations({ base: props.base, token: props.token, title: 'demande', refresh: data.refresh,
    update: { method: 'POST', path: item => `/admin/requests/${item.id}/cancel`, fields: [{ name: 'reason', label: 'Motif d’annulation', type: 'textarea', required: true }], successMessage: 'Demande annulée.' },
  });
  const columns = [
    { key: 'Référence', label: 'RÉFÉRENCE' }, { key: 'Client', label: 'CLIENT' },
    { key: 'Téléphone', label: 'TÉLÉPHONE' }, { key: 'Appareil', label: 'APPAREIL' },
    { key: 'Type', label: 'SERVICE', pill: true }, { key: 'Statut', label: 'STATUT', status: true },
    { key: 'Technicien', label: 'TECHNICIEN' }, { key: 'Créée', label: 'CRÉÉE LE' },
  ];
  function canAssign(row: ApiRow) {
    try {
      const request = row._raw ? JSON.parse(row._raw) as ApiRecord : {};
      const child = request.ac_request || request.domicile_request;
      return Boolean(child?.id && (!child.technician_id || ['pending', 'rejected'].includes(String(child.assignment_status).toLowerCase())) && !['completed', 'cancelled'].includes(String(child.status).toLowerCase()));
    } catch { return false; }
  }
  return <>{actions.drawer}{creating && <CreateRequestFlow base={props.base} token={props.token} devices={devices} domains={domains} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); data.refresh(); }} />}{assigningRow && <AssignTechnicianDrawer base={props.base} token={props.token} row={assigningRow} onClose={() => setAssigningRow(null)} onAssigned={() => { setAssigningRow(null); setAssignNotice('Demande proposée au technicien. Il doit encore accepter.'); data.refresh(); window.setTimeout(() => setAssignNotice(''), 4500); }} />}<CustomTable columns={columns} rows={tableRows} total={data.meta?.total} loading={data.loading} error={data.error} onRefresh={data.refresh} onSelect={props.onSelect} rowClick={false} onCreate={() => setCreating(true)} onEdit={actions.edit} canEdit={row => !['Completed', 'Cancelled', 'Terminée', 'Annulée'].includes(String(row.Statut))} editLabel="Annuler la demande" editTone="danger" customActionsBeforeEdit viewLabel="Voir les détails et le statut" rowActions={row => canDispatch && canAssign(row) ? <button type="button" role="menuitem" className="request-assignment-menu-item" onClick={() => setAssigningRow(row)}><Wrench size={14} /><span>{row.Technicien && row.Technicien !== 'Non assigné' ? 'Réassigner' : 'Assigner à un technicien'}</span></button> : null} notice={actions.notice || assignNotice} emptyMessage="Aucune demande de service." /></>;
}




