import { useEffect, useMemo, useState } from 'react';
import { ArrowRight2, DocumentText, Refresh as RefreshCw } from 'iconsax-react';
import { apiRequest, normalizeRow } from '../../config/api';
import type { ApiRecord, ApiRow } from '../../types';

type Filter = 'all' | 'active' | 'completed' | 'cancelled';
interface Props { base: string; token: string; technicianId: string | number; relatedIds: (string | number)[]; onOpenRequest: (row: ApiRow) => void }
const finished = new Set(['completed', 'terminée', 'terminee', 'done']);
const cancelled = new Set(['cancelled', 'canceled', 'annulée', 'annulee']);
const childOf = (request: ApiRecord): ApiRecord => request.domicile_request || request.ac_request || request.workshop_request || request.warranty_claim_request || request;
const childrenOf = (request: ApiRecord): ApiRecord[] => [request, request.domicile_request, request.ac_request, request.workshop_request, request.warranty_claim_request].filter((item): item is ApiRecord => Boolean(item && typeof item === 'object'));
const associatedIds = (request: ApiRecord): string[] => childrenOf(request).flatMap(item => [item.technician_id, item.technician?.id, item.assigned_technician_id, item.assigned_technician?.id].filter((id): id is string | number => id !== null && id !== undefined && id !== '').map(String));
const belongsTo = (request: ApiRecord, id: string | number) => {
  return associatedIds(request).includes(String(id));
};
const stateOf = (request: ApiRecord): Filter => {
  const status = String(childOf(request).status ?? request.status ?? '').toLowerCase().trim();
  return finished.has(status) ? 'completed' : cancelled.has(status) ? 'cancelled' : 'active';
};
const dateOf = (request: ApiRecord) => {
  const parsed = new Date(request.created_at);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' });
};

export function TechnicianHistory({ base, token, technicianId, relatedIds, onOpenRequest }: Props) {
  const relatedKey = relatedIds.map(String).sort().join(',');
  const [requests, setRequests] = useState<ApiRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partial, setPartial] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setPartial(false); setRequests([]);
    const load = async () => {
      const matched: ApiRecord[] = [];
      try {
        for (let current = 1; current <= 100; current++) {
          const response = await apiRequest<ApiRecord>(base, token, `/admin/requests?per_page=100&page=${current}`);
          if (!active) return;
          const batch = Array.isArray(response.requests) ? response.requests as ApiRecord[] : [];
          const resolved: ApiRecord[] = [];
          for (let index = 0; index < batch.length; index += 6) {
            const group = await Promise.all(batch.slice(index, index + 6).map(async request => {
              if (belongsTo(request, technicianId) || relatedKey.split(',').filter(Boolean).some(id => belongsTo(request, id)) || associatedIds(request).length || !request.id) return request;
              try {
                const detail = await apiRequest<ApiRecord>(base, token, `/admin/requests/${request.id}`);
                return (detail.request ?? detail.data ?? detail) as ApiRecord;
              } catch { setPartial(true); return request; }
            }));
            if (!active) return;
            resolved.push(...group);
          }
          if (!active) return;
          matched.push(...resolved.filter(request => belongsTo(request, technicianId) || relatedKey.split(',').filter(Boolean).some(id => belongsTo(request, id))));
          setRequests([...matched]);
          const lastPage = Number(response.meta?.last_page);
          if (Number.isFinite(lastPage) && lastPage > 0 ? current >= lastPage : batch.length < 100) return;
          if (current === 100) setPartial(true);
        }
      } catch (cause) {
        if (active) { setPartial(matched.length > 0); setError(cause instanceof Error ? cause.message : String(cause)); }
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [base, token, technicianId, relatedKey, reload]);
  const counts = useMemo(() => ({ all: requests.length, active: requests.filter(item => stateOf(item) === 'active').length, completed: requests.filter(item => stateOf(item) === 'completed').length, cancelled: requests.filter(item => stateOf(item) === 'cancelled').length }), [requests]);
  const visible = requests.filter(item => filter === 'all' || stateOf(item) === filter).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const pages = Math.max(1, Math.ceil(visible.length / 8));
  const shown = visible.slice((Math.min(page, pages) - 1) * 8, Math.min(page, pages) * 8);
  const labels: Record<Filter, string> = { all: 'Toutes', active: 'En cours', completed: 'Terminées', cancelled: 'Annulées' };
  return <section className="technician-history"><div className="technician-history-head"><div><h4><DocumentText size={17} /> Historique des demandes</h4><p>Demandes associées à ce compte{relatedIds.length ? ' et aux anciens comptes bloqués portant le même nom' : ''}.</p></div><button type="button" className="technician-history-refresh" onClick={() => setReload(value => value + 1)} aria-label="Actualiser l’historique"><RefreshCw size={16} /></button></div>
    <div className="technician-history-filters">{(Object.keys(labels) as Filter[]).map(key => <button type="button" key={key} className={filter === key ? 'active' : ''} onClick={() => { setFilter(key); setPage(1); }}>{labels[key]} <strong>{loading ? '…' : counts[key]}</strong></button>)}</div>
    {loading && <p className="technician-history-state"><RefreshCw className="spin" size={15} /> Chargement de l’historique…</p>}
    {error && <p className="technician-history-state error">Historique incomplet : {error}</p>}
    {partial && !error && <p className="technician-history-state">Historique partiel : limite de pagination atteinte.</p>}
    {!loading && !error && requests.length === 0 && <p className="technician-history-state">Aucune demande associée à ce technicien.</p>}
    {!loading && requests.length > 0 && shown.length === 0 && <p className="technician-history-state">Aucune demande dans cette catégorie.</p>}
    {shown.length > 0 && <div className="technician-history-list">{shown.map(request => { const row: ApiRow = { ...normalizeRow('Demandes', request), _raw: JSON.stringify(request) }; const olderAccount = !belongsTo(request, technicianId); return <button type="button" key={String(request.id)} onClick={() => onOpenRequest(row)}><div><strong>{row.Référence}</strong><span>{dateOf(request)}</span></div><div><b>{row.Appareil}</b><span>{row.Client}</span></div><div>{olderAccount && <span className="technician-history-older">Ancien compte</span>}<span className={`technician-history-status ${stateOf(request)}`}>{row.Statut}</span><ArrowRight2 size={15} /></div></button>; })}</div>}
    {pages > 1 && <div className="technician-history-pages"><button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Précédent</button><span>{page} / {pages}</span><button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Suivant</button></div>}
  </section>;
}
