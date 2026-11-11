import { useEffect } from 'react';
import { Calendar, Call, CloseCircle as Close, DocumentText, Location, Sms, User } from 'iconsax-react';
import type { ApiRecord, ApiRow } from '../../types';

interface Props { row: ApiRow; onClose: () => void }
const display = (value: unknown) => value === null || value === undefined || value === '' || value === '—' ? '—' : String(value);
const date = (value: unknown) => {
  if (!value) return '—';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? '—' : new Intl.DateTimeFormat('fr-DZ', { dateStyle: 'long' }).format(parsed);
};

export function ClientProfile({ row, onClose }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  let detail: ApiRecord = {};
  try { detail = row._raw ? JSON.parse(row._raw) as ApiRecord : {}; } catch { /* Table data remains available. */ }
  const name = display(row.Client);
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'C';
  const phone = row.Téléphone && row.Téléphone !== '—' ? String(row.Téléphone) : '';
  const email = row.Email && row.Email !== '—' ? String(row.Email) : '';
  const blocked = row.Statut === 'Bloqué';
  const address = [detail.address, detail.city, detail.province?.name_fr || detail.province?.name].filter(Boolean).join(', ');
  return <div className="mutation-overlay technician-profile-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="mutation-drawer technician-profile-drawer" role="dialog" aria-modal="true" aria-label={`Profil de ${name}`}>
      <header className="technician-profile-top"><div><span className="technician-profile-kicker">CLIENTS / PROFIL</span><h2>Fiche client</h2></div><button type="button" className="icon-button" aria-label="Fermer" onClick={onClose}><Close size={20} /></button></header>
      <div className="technician-profile-body">
        <div className="technician-profile-hero"><div className="technician-profile-avatar">{initials}</div><div className="technician-profile-identity"><h3>{name}</h3><p>{display(row.Référence)}</p><span className={`technician-profile-status ${blocked ? 'is-blocked' : 'is-active'}`}><i />{display(row.Statut)}</span></div></div>
        <div className="technician-profile-stats client-profile-stats"><div><DocumentText size={17} /><strong>{display(row.Demandes)}</strong><span>Demandes</span></div><div><Calendar size={17} /><strong>{date(detail.created_at)}</strong><span>Inscrit le</span></div></div>
        <section className="technician-profile-section"><h4><Call size={16} /> Coordonnées</h4><div className="technician-profile-contact"><div><span>Téléphone</span>{phone ? <a href={`tel:${phone}`}>{phone}</a> : <b>—</b>}</div><div><span>Adresse e-mail</span>{email ? <a href={`mailto:${email}`}><Sms size={14} />{email}</a> : <b>—</b>}</div></div></section>
        <section className="technician-profile-section"><h4><User size={16} /> Compte</h4><div className="technician-profile-facts"><div><span>Référence</span><b>{display(row.Référence)}</b></div><div><span>Langue</span><b>{detail.language === 'ar' ? 'Arabe' : detail.language === 'fr' ? 'Français' : display(detail.language)}</b></div><div><span>Statut</span><b>{display(row.Statut)}</b></div></div></section>
        {address && <section className="technician-profile-section"><h4><Location size={16} /> Adresse</h4><div className="technician-profile-facts"><div><span>Localisation</span><b>{address}</b></div></div></section>}
      </div>
    </section>
  </div>;
}
