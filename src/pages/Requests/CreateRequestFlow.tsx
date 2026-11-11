import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft2, ArrowRight2, CloseCircle, Gallery, Location, Profile, Refresh, TickCircle, Setting2 as Wrench } from 'iconsax-react';
import { API_BASE_URL, apiRequest, normalizeApiBase } from '../../config/api';
import { showToast } from '../../components/ToastCenter/ToastCenter';
import { deviceLabel } from '../../lib/labels';
import type { ApiRecord } from '../../types';
import './create-request.css';

interface Props {
  base: string;
  token: string;
  devices: ApiRecord[];
  domains: ApiRecord[];
  onClose: () => void;
  onCreated: () => void;
}
interface FormValues {
  clientId: string; service: 'domicile' | 'ac'; offer: 'flexible' | 'warranty' | 'ac';
  deviceKey: string; deviceModel: string; problemIds: number[]; description: string;
  contactName: string; contactPhone: string; latitude: string; longitude: string;
  province: string; city: string; availability: string; promoCode: string;
}
const initial: FormValues = { clientId: '', service: 'domicile', offer: 'flexible', deviceKey: '', deviceModel: '', problemIds: [], description: '', contactName: '', contactPhone: '', latitude: '', longitude: '', province: '', city: '', availability: '', promoCode: '' };
const steps = ['Service', 'Appareil', 'Client', 'Confirmation'];
const nameOf = (record: ApiRecord) => [record.first_name, record.last_name].filter(Boolean).join(' ') || String(record.reference_code || `Client #${record.id}`);
const deviceName = (device: ApiRecord) => String(device.name_fr || device.name_ar || deviceLabel(device.device_key));
function deviceImage(device: ApiRecord, base: string): string {
  const image = device.image_url || device.image?.url || device.image || device.icon_url || device.photo_url || device.thumbnail_url;
  if (typeof image !== 'string' || !image.trim()) return '';
  try { return new URL(image, `${normalizeApiBase(base || API_BASE_URL)}/`).toString(); } catch { return ''; }
}

export function CreateRequestFlow({ base, token, devices, domains, onClose, onCreated }: Props) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>(initial);
  const [clients, setClients] = useState<ApiRecord[]>([]);
  const [clientsError, setClientsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => setValues(current => ({ ...current, [key]: value }));
  useEffect(() => {
    let active = true;
    void apiRequest<ApiRecord>(base, token, '/admin/clients?per_page=100').then(result => {
      if (active) setClients(Array.isArray(result.clients) ? result.clients : Array.isArray(result.data) ? result.data : []);
    }).catch(() => { if (active) setClientsError(true); });
    return () => { active = false; };
  }, [base, token]);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);
  const activeDevices = useMemo(() => devices.filter(device => device.is_active !== false && device.device_key), [devices]);
  const chosenDevice = activeDevices.find(device => String(device.device_key) === values.deviceKey);
  const issues = useMemo(() => domains.filter(domain => domain.is_active !== false).flatMap(domain => (Array.isArray(domain.issues) ? domain.issues : []).filter((issue: ApiRecord) => issue.id != null && issue.is_active !== false).map((issue: ApiRecord) => ({ id: Number(issue.id), title: String(issue.name_fr || issue.title_fr || issue.name || `Panne #${issue.id}`), domain: String(domain.name_fr || 'Diagnostic') }))), [domains]);
  const selectedIssues = issues.filter(issue => values.problemIds.includes(issue.id));
  const client = clients.find(item => String(item.id) === values.clientId);
  const validCoordinates = values.latitude.trim() !== '' && values.longitude.trim() !== '' && Number.isFinite(Number(values.latitude)) && Number.isFinite(Number(values.longitude)) && Math.abs(Number(values.latitude)) <= 90 && Math.abs(Number(values.longitude)) <= 180;
  const canAdvance = step === 0 ? Boolean(values.service && values.offer) : step === 1 ? Boolean(values.deviceKey) : step === 2 ? Boolean(Number(values.clientId) > 0 && values.contactName.trim() && values.contactPhone.trim()) : validCoordinates;
  const next = () => { setError(''); if (canAdvance) setStep(current => Math.min(3, current + 1)); else setError('Complétez les champs requis avant de continuer.'); };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 3) { next(); return; }
    if (!canAdvance) { setError('Indiquez une latitude et une longitude valides.'); return; }
    setBusy(true); setError('');
    const payload: ApiRecord = {
      client_id: Number(values.clientId), reparation_type: values.service, service_type: values.offer,
      device_type: values.deviceKey, contact_name: values.contactName.trim(), contact_phone_number: values.contactPhone.trim(),
      latitude: Number(values.latitude), longitude: Number(values.longitude),
    };
    if (values.deviceModel.trim()) payload.device_model = values.deviceModel.trim();
    if (values.problemIds.length) payload.problem = values.problemIds;
    if (values.description.trim()) payload.problem_description = values.description.trim();
    if (values.province.trim()) payload.province = Number(values.province);
    if (values.city.trim()) payload.city = values.city.trim();
    if (values.availability.trim()) payload.availability = values.availability.trim();
    if (values.promoCode.trim()) payload.promo_code = values.promoCode.trim();
    try { await apiRequest(base, token, '/admin/requests', { method: 'POST', body: JSON.stringify(payload) }); showToast({ tone: 'success', title: 'Demande créée' }); onCreated(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  return <div className="mutation-overlay create-request-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section className="mutation-drawer create-request-drawer" role="dialog" aria-modal="true" aria-label="Créer une demande">
      <header className="create-request-head"><div><span>DEMANDES / NOUVELLE DEMANDE</span><h2>Créer une demande</h2></div><button type="button" className="icon-button" aria-label="Fermer et revenir aux demandes" onClick={onClose} disabled={busy}><CloseCircle size={21} /></button></header>
      <div className="create-request-progress">{steps.map((title, index) => <div key={title} className={index === step ? 'current' : index < step ? 'done' : ''}><i>{index < step ? <TickCircle size={15} /> : index + 1}</i><span>{title}</span></div>)}</div>
      <form onSubmit={submit} className="create-request-form"><div className="create-request-content">
        {step === 0 && <><div className="create-request-intro"><Wrench size={22} /><h3>Quel service faut-il réaliser ?</h3><p>Choisissez le type d’intervention avant de sélectionner l’appareil.</p></div><div className="create-request-choice-grid"><button type="button" className={values.service === 'domicile' ? 'selected' : ''} onClick={() => setValues(current => ({ ...current, service: 'domicile', offer: 'flexible' }))}><Wrench size={24} /><strong>Réparation à domicile</strong><span>Intervention chez le client</span></button><button type="button" className={values.service === 'ac' ? 'selected' : ''} onClick={() => setValues(current => ({ ...current, service: 'ac', offer: 'ac' }))}><Wrench size={24} /><strong>Climatisation</strong><span>Service de climatisation</span></button></div>{values.service === 'domicile' && <div className="create-request-field"><label htmlFor="request-offer">Offre</label><select id="request-offer" value={values.offer} onChange={event => update('offer', event.target.value as FormValues['offer'])}><option value="flexible">Flexible</option><option value="warranty">Garantie</option></select></div>}</>}
        {step === 1 && <><div className="create-request-intro"><Gallery size={22} /><h3>Sélectionnez l’appareil</h3><p>Les noms et images viennent de la configuration InTech.</p></div>{activeDevices.length ? <div className="create-request-devices">{activeDevices.map(device => { const key = String(device.device_key); const image = deviceImage(device, base); return <button type="button" key={key} className={values.deviceKey === key ? 'selected' : ''} onClick={() => update('deviceKey', key)}><span className="create-request-device-media"><Gallery size={30} />{image && <img src={image} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} />}</span><strong>{deviceName(device)}</strong></button>; })}</div> : <div className="create-request-field"><label htmlFor="request-device-key">Clé technique de l’appareil</label><input id="request-device-key" value={values.deviceKey} onChange={event => update('deviceKey', event.target.value)} placeholder="Ex. appliance_fridge" required /></div>}<div className="create-request-field"><label htmlFor="request-model">Modèle ou référence</label><input id="request-model" value={values.deviceModel} onChange={event => update('deviceModel', event.target.value)} placeholder="Modèle de l’appareil" /></div>{issues.length > 0 && <div className="create-request-issues"><h4>Pannes constatées <small>facultatif</small></h4><div>{issues.map(issue => <label key={issue.id}><input type="checkbox" checked={values.problemIds.includes(issue.id)} onChange={event => update('problemIds', event.target.checked ? [...values.problemIds, issue.id] : values.problemIds.filter(id => id !== issue.id))} /><span><strong>{issue.title}</strong><small>{issue.domain}</small></span></label>)}</div></div>}<div className="create-request-field"><label htmlFor="request-description">Décrivez le problème</label><textarea id="request-description" rows={3} value={values.description} onChange={event => update('description', event.target.value)} placeholder="Que se passe-t-il avec l’appareil ?" /></div></>}
        {step === 2 && <><div className="create-request-intro"><Profile size={22} /><h3>Pour quel client ?</h3><p>Associez la demande à un compte et confirmez ses coordonnées.</p></div><div className="create-request-field"><label htmlFor="request-client">Compte client *</label>{clients.length ? <select id="request-client" value={values.clientId} onChange={event => { const id = event.target.value; const selected = clients.find(item => String(item.id) === id); setValues(current => ({ ...current, clientId: id, contactName: selected ? nameOf(selected) : current.contactName, contactPhone: selected?.phone_number ? String(selected.phone_number) : current.contactPhone })); }}><option value="">Sélectionner un client…</option>{clients.map(item => <option key={item.id} value={item.id}>{nameOf(item)} · {item.phone_number || `#${item.id}`}</option>)}</select> : <input id="request-client" type="number" min="1" value={values.clientId} onChange={event => update('clientId', event.target.value)} placeholder="ID du client" required />}{clientsError && <small>La liste des clients est indisponible. Vous pouvez saisir son ID.</small>}</div><div className="create-request-two"><div className="create-request-field"><label htmlFor="request-contact-name">Nom du contact *</label><input id="request-contact-name" value={values.contactName} onChange={event => update('contactName', event.target.value)} required /></div><div className="create-request-field"><label htmlFor="request-contact-phone">Téléphone du contact *</label><input id="request-contact-phone" inputMode="tel" value={values.contactPhone} onChange={event => update('contactPhone', event.target.value)} required /></div></div></>}
        {step === 3 && <><div className="create-request-intro"><Location size={22} /><h3>Lieu et confirmation</h3><p>Vérifiez la localisation. Elle compte pour trouver un technicien éligible.</p></div><div className="create-request-two"><div className="create-request-field"><label htmlFor="request-lat">Latitude *</label><input id="request-lat" type="number" min="-90" max="90" step="0.000001" value={values.latitude} onChange={event => update('latitude', event.target.value)} placeholder="36.75" required /></div><div className="create-request-field"><label htmlFor="request-lng">Longitude *</label><input id="request-lng" type="number" min="-180" max="180" step="0.000001" value={values.longitude} onChange={event => update('longitude', event.target.value)} placeholder="3.05" required /></div></div><div className="create-request-two"><div className="create-request-field"><label htmlFor="request-province">ID de wilaya</label><input id="request-province" type="number" min="1" value={values.province} onChange={event => update('province', event.target.value)} /></div><div className="create-request-field"><label htmlFor="request-city">Commune</label><input id="request-city" value={values.city} onChange={event => update('city', event.target.value)} /></div></div><div className="create-request-two"><div className="create-request-field"><label htmlFor="request-availability">Disponibilités</label><input id="request-availability" value={values.availability} onChange={event => update('availability', event.target.value)} placeholder="Créneaux souhaités" /></div><div className="create-request-field"><label htmlFor="request-promo">Code promo</label><input id="request-promo" value={values.promoCode} onChange={event => update('promoCode', event.target.value)} /></div></div><div className="create-request-review"><h4>Récapitulatif</h4><div><span>Service</span><strong>{values.service === 'ac' ? 'Climatisation' : 'Réparation à domicile'}</strong></div><div><span>Appareil</span><strong>{chosenDevice ? deviceName(chosenDevice) : deviceLabel(values.deviceKey)}</strong></div><div><span>Pannes</span><strong>{selectedIssues.length ? selectedIssues.map(issue => issue.title).join(', ') : 'Non renseignées'}</strong></div><div><span>Client</span><strong>{client ? nameOf(client) : `#${values.clientId}`} · {values.contactPhone}</strong></div><div><span>Localisation</span><strong>{values.city ? `${values.city} · ` : ''}{values.latitude || '—'}, {values.longitude || '—'}</strong></div></div></>}
        {error && <div className="api-error" role="alert">{error}</div>}
      </div><footer className="create-request-actions"><button type="button" className="button subtle" onClick={() => step ? (setError(''), setStep(current => current - 1)) : onClose()} disabled={busy}><ArrowLeft2 size={16} />{step ? 'Retour' : 'Annuler'}</button><button type="submit" className="button primary" disabled={busy || !canAdvance}>{busy ? <Refresh className="spin" size={16} /> : step === 3 ? <TickCircle size={16} /> : <ArrowRight2 size={16} />}{busy ? 'Création…' : step === 3 ? 'Créer la demande' : 'Continuer'}</button></footer></form>
    </section>
  </div>;
}

