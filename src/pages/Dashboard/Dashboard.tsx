import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDown2, Refresh as RefreshCw } from 'iconsax-react';
import { usePageData } from '../../hooks';
import type { ApiRecord, ApiRow } from '../../types';
import type { ScreenPageProps } from '../../types/page';
import './dashboard.css';

type Period = 'today' | 'yesterday' | 'week' | 'month' | 'custom';
type RequestItem = { row: ApiRow; date: Date; status: string; type: string; device: string; assigned: boolean };
const periodLabels: Record<Period, string> = { today: "Aujourd’hui", yesterday: 'Hier', week: '7 derniers jours', month: '30 derniers jours', custom: 'Personnalisé' };
const colors = ['#8068e8', '#54c7b0', '#ffad28', '#f14cba', '#6bc9f5', '#bdcbd5'];
const clean = (value: unknown, fallback = 'Autre') => value == null || value === '' || value === '—' ? fallback : String(value).replaceAll('_', ' ');
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function requestFromRow(row: ApiRow): RequestItem | null {
  try {
    const raw = JSON.parse(row._raw || '{}') as ApiRecord;
    const date = new Date(raw.created_at);
    if (Number.isNaN(date.getTime())) return null;
    const child = raw.domicile_request || raw.ac_request || raw.workshop_request || raw.warranty_claim_request || raw;
    return { row, date, status: clean(child.status ?? raw.status, 'Statut inconnu'), type: clean(raw.reparation_type ?? child.service_type, 'Autre service'), device: clean(raw.device_product?.name_fr ?? raw.device_type ?? child.device_model, 'Autre appareil'), assigned: Boolean(child.technician_id || child.technician?.id || (row.Technicien && row.Technicien !== 'Non assigné' && row.Technicien !== '—')) };
  } catch { return null; }
}
function group(items: RequestItem[], key: (item: RequestItem) => string) {
  const counts = new Map<string, number>();
  items.forEach(item => counts.set(key(item), (counts.get(key(item)) || 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1]);
}
function Breakdown({ title, items, empty }: { title: string; items: [string, number][]; empty: boolean }) {
  const top = items.slice(0, 5);
  const total = items.reduce((sum, [, value]) => sum + value, 0);
  const segments = top.map(([, value], index) => ({ color: colors[index], percent: total ? value / total * 100 : 0 }));
  if (items.length > 5) segments.push({ color: colors[5], percent: items.slice(5).reduce((sum, [, value]) => sum + value, 0) / total * 100 });
  let offset = 0;
  const gradient = segments.map(segment => { const start = offset; offset += segment.percent; return `${segment.color} ${start}% ${offset}%`; }).join(', ');
  return <section className="dash-panel dash-breakdown"><div className="dash-panel-head"><h2>{title}</h2><span>{total} demandes</span></div>{empty ? <p className="dash-empty">Aucune demande sur cette période.</p> : <div className="dash-breakdown-body"><div className="dash-legend">{top.map(([label, count], index) => <div key={label}><i style={{ background: colors[index] }} /><span title={label}>{label}</span><strong>{count}</strong></div>)}{items.length > 5 && <div><i style={{ background: colors[5] }} /><span>Autres</span><strong>{items.slice(5).reduce((sum, [, value]) => sum + value, 0)}</strong></div>}</div><div className="dash-donut" role="img" aria-label={`${title} : ${items.map(([label, count]) => `${label} ${count}`).join(', ')}`} style={{ background: `conic-gradient(${gradient})` }}><div><strong>{total}</strong><span>demandes</span></div></div></div>}</section>;
}

export function Dashboard(props: ScreenPageProps) {
  const { rows, meta, loading, error, refresh } = usePageData({ ...props, page: 'Vue d’ensemble' });
  const [headerTarget, setHeaderTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderTarget(document.getElementById('page-heading-create-action'));
  }, []);
  const [period, setPeriod] = useState<Period>('week');
  const [draftPeriod, setDraftPeriod] = useState<Period>('week');
  const [filterOpen, setFilterOpen] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const all = useMemo(() => rows.map(requestFromRow).filter((item): item is RequestItem => item !== null), [rows]);
  const filtered = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    if (period === 'yesterday') { start.setDate(start.getDate() - 1); const end = new Date(start); end.setDate(end.getDate() + 1); return all.filter(item => item.date >= start && item.date < end); }
    if (period === 'week') start.setDate(start.getDate() - 6);
    if (period === 'month') start.setDate(start.getDate() - 29);
    if (period === 'custom') {
      if (!range?.from || !range?.to) return [];
      const first = new Date(range.from);
      const last = new Date(range.to);
      return all.filter(item => item.date >= first && item.date <= last);
    }
    return all.filter(item => item.date >= start && item.date <= now);
  }, [all, period, range]);
  const daily = useMemo(() => group(filtered, item => dateKey(item.date)).sort((a, b) => a[0].localeCompare(b[0])), [filtered]);
  const activeDay = selectedDay && daily.some(([day]) => day === selectedDay) ? selectedDay : daily.at(-1)?.[0] || null;
  const dayRows = filtered.filter(item => dateKey(item.date) === activeDay).sort((a, b) => b.date.getTime() - a.date.getTime());
  const status = group(filtered, item => item.status);
  const services = group(filtered, item => item.type);
  const devices = group(filtered, item => item.device);
  const assigned = filtered.filter(item => item.assigned).length;
  const maxDaily = Math.max(1, ...daily.map(([, value]) => value));
  const points = daily.length === 1 ? '50,70' : daily.map(([, value], index) => `${index / Math.max(daily.length - 1, 1) * 100},${75 - value / maxDaily * 65}`).join(' ');
  const applyPeriod = () => {
    if (draftPeriod === 'custom') {
      if (!from || !to || new Date(from) > new Date(to)) return;
      setRange({ from, to });
    }
    setPeriod(draftPeriod); setSelectedDay(null); setFilterOpen(false);
  };
  if (loading) return <div className="panel api-state"><RefreshCw className="spin" size={20} /><b>Chargement du tableau de bord…</b></div>;
  if (error) return <div className="panel api-error-state"><h2>Impossible de charger le tableau de bord</h2><p>{error}</p><button className="button subtle" onClick={refresh}>Réessayer</button></div>;
  return <div className="intech-dashboard">
    {headerTarget && createPortal(<div className="dash-toolbar"><div><button type="button" className="dash-refresh" onClick={refresh} aria-label="Actualiser"><RefreshCw size={17} /></button><div className="dash-filter-wrap"><button type="button" className="dash-period-button" onClick={() => { setDraftPeriod(period); setFilterOpen(!filterOpen); }} aria-expanded={filterOpen}>{periodLabels[period]} <ArrowDown2 size={14} /></button>{filterOpen && <div className="dash-filter-popover"><span className="dash-filter-caption">PÉRIODE</span>{(Object.keys(periodLabels) as Period[]).map(option => <button type="button" key={option} className={draftPeriod === option ? 'active' : ''} onClick={() => setDraftPeriod(option)}>{periodLabels[option]}</button>)}{draftPeriod === 'custom' && <div className="dash-custom-dates"><label>Du<input type="datetime-local" value={from} onChange={event => setFrom(event.target.value)} /></label><label>Au<input type="datetime-local" value={to} onChange={event => setTo(event.target.value)} /></label></div>}<button type="button" className="dash-apply" onClick={applyPeriod} disabled={draftPeriod === 'custom' && (!from || !to || new Date(from) > new Date(to))}>Appliquer</button></div>}</div></div></div>, headerTarget)}
    <section className="dash-metrics" aria-label="Indicateurs">
      <div className="dash-stat dash-stat-violet"><span>Demandes enregistrées</span><div className="dash-stat-main"><strong>{Number(meta?.total ?? all.length).toLocaleString('fr-DZ')}</strong><svg viewBox="0 0 80 34" aria-hidden="true"><path d="M2 27 C13 13 18 20 28 18 S42 29 53 14 S67 8 78 4" /></svg></div><small>Toutes périodes</small></div>
      <div className="dash-stat dash-stat-amber"><span>À attribuer</span><div className="dash-stat-main"><strong>{Number(meta?.unassigned ?? 0).toLocaleString('fr-DZ')}</strong><svg viewBox="0 0 80 34" aria-hidden="true"><path d="M2 9 C15 5 18 18 29 15 S42 8 54 16 S68 23 78 26" /></svg></div><small>File actuelle</small></div>
      <div className="dash-stat dash-stat-teal"><span>Techniciens</span><div className="dash-stat-main"><strong>{Number(meta?.technicians ?? 0).toLocaleString('fr-DZ')}</strong><svg viewBox="0 0 80 34" aria-hidden="true"><path d="M2 27 C13 25 21 23 30 21 S45 15 54 16 S69 8 78 5" /></svg></div><small>Réseau enregistré</small></div>
      <div className="dash-stat dash-stat-rose"><span>Demandes attribuées</span><div className="dash-stat-main"><strong>{assigned}</strong><svg viewBox="0 0 80 34" aria-hidden="true"><path d="M2 26 C15 12 21 20 30 16 S43 23 53 13 S67 9 78 4" /></svg></div><small>{periodLabels[period]} · données chargées</small></div>
    </section>
    <div className="dash-chart-grid"><Breakdown title="Statuts des demandes" items={status} empty={!filtered.length} /><Breakdown title="Types de service" items={services} empty={!filtered.length} /></div>
    <section className="dash-panel dash-devices"><div className="dash-panel-head"><h2>Appareils les plus demandés</h2><span>Sur la période</span></div>{devices.length ? <div className="dash-device-list">{devices.slice(0, 5).map(([label, count], index) => <div key={label}><span>{label}</span><div className="dash-bar-track"><i style={{ width: `${count / devices[0][1] * 100}%`, background: colors[index] }} /></div><strong>{count}</strong></div>)}</div> : <p className="dash-empty">Aucune donnée sur cette période.</p>}</section>
    <section className="dash-panel dash-activity"><div className="dash-panel-head"><div><h2>Activité des demandes</h2><p>Nombre de demandes par jour</p></div><span>{filtered.length} sur la période</span></div>{daily.length ? <><div className="dash-line-chart"><div className="dash-y-axis"><span>{maxDaily}</span><span>{Math.round(maxDaily / 2)}</span><span>0</span></div><div className="dash-line-main"><svg viewBox="0 0 100 90" preserveAspectRatio="none" aria-label="Évolution des demandes"><polygon points={`${points} 100,90 0,90`} fill="#ede9fc" /><polyline points={points} fill="none" stroke="#7253d6" strokeWidth="1.7" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" /></svg><div className="dash-x-axis"><span>{daily[0][0].slice(5)}</span><span>{daily.at(-1)?.[0].slice(5)}</span></div></div></div><div className="dash-day-list">{daily.map(([day, count]) => <button type="button" key={day} className={activeDay === day ? 'active' : ''} onClick={() => setSelectedDay(day)}><span>{new Date(`${day}T12:00:00`).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}</span><strong>{count}</strong></button>)}</div><div className="dash-day-detail"><h3>{activeDay ? new Date(`${activeDay}T12:00:00`).toLocaleDateString('fr-DZ', { dateStyle: 'full' }) : ''}</h3>{dayRows.length ? dayRows.slice(0, 10).map(item => <button type="button" key={String(item.row._id)} onClick={() => props.onSelect(item.row)}><strong>{item.row.Référence}</strong><span>{item.row.Client}</span><span>{item.device}</span><em>{item.status}</em><small>{item.date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</small></button>) : <p className="dash-empty">Aucune demande correspondante.</p>}</div></> : <p className="dash-empty">Aucune activité sur cette période.</p>}</section>
  </div>;
}


