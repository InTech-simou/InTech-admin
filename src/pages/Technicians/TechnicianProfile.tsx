import { useEffect, useState } from 'react';
import { CloseCircle as Close, Call, Sms, Briefcase, Star1, Wallet, Location, Setting2, Calendar, TickCircle, Refresh as RefreshCw } from 'iconsax-react';
import { apiRequest } from '../../config/api';
import type { ApiRecord, ApiRow } from '../../types';
import { metricText, technicianRecord } from './metrics';
import { TechnicianHistory } from './TechnicianHistory';

interface Props { row: ApiRow; base: string; token: string; relatedIds: (string | number)[]; onClose: () => void; onOpenRequest: (row: ApiRow) => void }

const value = (input: unknown) => input === null || input === undefined || input === '' ? '—' : String(input);
const labels: Record<string, string> = { technician: 'Technicien', workshop: 'Atelier', ac: 'Climatisation', electronic: 'Électronique', refrigeration: 'Réfrigération', washing: 'Lavage', electronics: 'Électronique', air_conditioning: 'Climatisation', appliance_fridge: 'Réfrigérateur', appliance_washer: 'Lave-linge', appliance_ac: 'Climatiseur' };
const label = (input: unknown) => labels[String(input)] || value(input).replaceAll('_', ' ');
const date = (input: unknown) => input ? new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'medium' }).format(new Date(String(input))) : '—';

export function TechnicianProfile({ row, base, token, relatedIds, onClose, onOpenRequest }: Props) {
  const [serverDetail, setServerDetail] = useState<ApiRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !document.querySelector('.overlay .detail-drawer')) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  useEffect(() => {
    if (!row._id) return;
    let active = true;
    setLoading(true);
    setDetailError('');
    void apiRequest<ApiRecord>(base, token, `/admin/technicians/${row._id}`)
      .then(result => { if (active) setServerDetail(result.technician ?? result.data ?? result); })
      .catch(error => { if (active) setDetailError(error instanceof Error ? error.message : String(error)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [base, token, row._id]);

  const detail: ApiRecord = { ...technicianRecord(row), ...serverDetail };
  const user = (detail.user && typeof detail.user === 'object' ? detail.user : {}) as ApiRecord;
  const zone = (detail.technician_zone && typeof detail.technician_zone === 'object' ? detail.technician_zone : {}) as ApiRecord;
  const name = value(row.Technicien);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('');
  const phone = row.Téléphone && row.Téléphone !== '—' ? String(row.Téléphone) : '';
  const email = row.Email && row.Email !== '—' ? String(row.Email) : '';
  const fields = Array.isArray(detail.fields) ? detail.fields : [];
  const devices = Array.isArray(detail.devices) ? detail.devices : [];
  const status = detail.is_blocked ? 'Bloqué' : value(detail.status ?? row.Statut);
  const isActive = ['eligible', 'verified', 'Actif'].includes(status);

  return <div className="mutation-overlay technician-profile-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="mutation-drawer technician-profile-drawer" role="dialog" aria-modal="true" aria-label={`Profil de ${name}`}>
      <header className="technician-profile-top"><div><span className="technician-profile-kicker">TECHNICIENS / ACTIVITÉ</span><h2>Profil et historique</h2></div><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><Close size={20} /></button></header>
      <div className="technician-profile-body">
        <div className="technician-profile-hero"><div className="technician-profile-avatar">{initials || 'T'}</div><div className="technician-profile-identity"><h3>{name}</h3><p>{label(detail.technician_type || row.Type)} · {value(user.reference_code || `#${row._id}`)}</p><span className={`technician-profile-status ${isActive ? 'is-active' : status === 'Bloqué' ? 'is-blocked' : ''}`}><i />{status}</span></div></div>
        {loading && <p className="technician-kpi-loading"><RefreshCw size={14} className="spin" /> Actualisation des indicateurs…</p>}
        {detailError && <p className="technician-kpi-error">Détail indisponible. Les données de la liste restent affichées.</p>}
        <div className="technician-profile-stats technician-profile-kpis"><div><Star1 size={17} /><strong>{metricText(detail.avg_rating ?? row.Note)}</strong><span>Note moyenne</span></div><div><Briefcase size={17} /><strong>{metricText(detail.active_requests_count)}</strong><span>Missions en cours</span></div><div><TickCircle size={17} /><strong>{metricText(detail.completed_tasks)}</strong><span>Missions terminées · ce compte</span></div><div><Wallet size={17} /><strong>{metricText(detail.points)}</strong><span>Points disponibles</span></div></div>
        {row._id && <TechnicianHistory base={base} token={token} technicianId={row._id} relatedIds={relatedIds} onOpenRequest={onOpenRequest} />}
        <section className="technician-profile-section"><h4><Call size={16} /> Coordonnées</h4><div className="technician-profile-contact"><div><span>Téléphone</span>{phone ? <a href={`tel:${phone}`}>{phone}</a> : <b>—</b>}</div><div><span>Adresse e-mail</span>{email ? <a href={`mailto:${email}`}><Sms size={14} />{email}</a> : <b>—</b>}</div></div></section>
        <section className="technician-profile-section"><h4><Briefcase size={16} /> Activité</h4><div className="technician-profile-facts"><div><span>Disponibilité</span><b>{value(row.Disponible)}</b></div><div><span>Expérience</span><b>{detail.years_of_experience ? `${detail.years_of_experience} ans` : '—'}</b></div><div><span>Mode de paiement</span><b>{detail.is_points_based ? 'Avec points' : 'Sans points'}</b></div></div></section>
        <section className="technician-profile-section"><h4><Setting2 size={16} /> Compétences</h4><span className="technician-profile-label">Domaines</span><div className="technician-profile-tags">{fields.length ? fields.map((field, index) => <span key={`${field}-${index}`}>{label(field)}</span>) : <em>Aucun domaine renseigné</em>}</div><span className="technician-profile-label">Appareils</span><div className="technician-profile-tags">{devices.length ? devices.map((device, index) => <span key={`${device}-${index}`}>{label(device)}</span>) : <em>Aucun appareil renseigné</em>}</div></section>
        <section className="technician-profile-section"><h4><Location size={16} /> Zone d’intervention</h4><div className="technician-profile-facts"><div><span>Rayon</span><b>{zone.radius ?? detail.radius ? `${value(zone.radius ?? detail.radius)} km` : '—'}</b></div><div><span>Position</span><b>{zone.latitude && zone.longitude ? `${zone.latitude}, ${zone.longitude}` : '—'}</b></div></div></section>
        <div className="technician-profile-created"><Calendar size={14} /> Inscrit le {date(detail.created_at)}</div>
      </div>
    </section>
  </div>;
}
