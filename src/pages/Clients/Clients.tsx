import { useState } from 'react';
import { Lock, Unlock } from 'iconsax-react';
import { CustomTable } from '../../components';
import { useApiCommand, useApiMutations, usePageData } from '../../hooks';
import type { ApiRow } from '../../types';
import type { ScreenPageProps } from '../../types/page';
import { ClientProfile } from './ClientProfile';
export function Clients(props: ScreenPageProps) {
  const data = usePageData({ ...props, page: 'Clients' });
  const [selected, setSelected] = useState<ApiRow | null>(null);
  const command = useApiCommand(props.base, props.token, data.refresh);
  const actions = useApiMutations({ base: props.base, token: props.token, title: 'client', refresh: data.refresh,
    create: { method: 'POST', path: '/admin/clients', fields: [
      { name: 'first_name', label: 'Prénom', required: true }, { name: 'last_name', label: 'Nom', required: true }, { name: 'phone_number', label: 'Téléphone', required: true }, { name: 'email', label: 'Email' }, { name: 'password', label: 'Mot de passe (si email)', type: 'password', help: '8 caractères minimum si un email est renseigné.' }, { name: 'language', label: 'Langue', type: 'select', defaultValue: 'fr', options: [{ label: 'Français', value: 'fr' }, { label: 'Arabe', value: 'ar' }] },
    ] }, remove: { method: 'DELETE', path: item => `/admin/clients/${item.id}` } });
  const columns = [{ key: 'Client', label: 'CLIENT' }, { key: 'Référence', label: 'RÉFÉRENCE' }, { key: 'Téléphone', label: 'TÉLÉPHONE' }, { key: 'Email', label: 'EMAIL' }, { key: 'Demandes', label: 'DEMANDES' }, { key: 'Statut', label: 'STATUT', status: true }, { key: 'Inscrit', label: 'INSCRIT LE' }];
  return <>{actions.drawer}<CustomTable columns={columns} rows={data.visibleRows} total={data.meta?.total} loading={data.loading} error={data.error} onRefresh={data.refresh} onCreate={actions.create} onDelete={actions.remove} onSelect={setSelected} rowClick={false} viewLabel="Voir le profil" notice={actions.notice || command.notice} mutationError={command.error} rowActions={row => <button type="button" role="menuitem" className="request-assignment-menu-item" disabled={command.busy} onClick={() => void command.run(`/admin/clients/${row._id}/${row.Statut === 'Bloqué' ? 'unblock' : 'block'}`, 'POST', undefined, row.Statut === 'Bloqué' ? 'Client débloqué.' : 'Client bloqué.')}>{row.Statut === 'Bloqué' ? <Unlock size={14} /> : <Lock size={14} />}<span>{row.Statut === 'Bloqué' ? 'Débloquer' : 'Bloquer'}</span></button>} emptyMessage="Aucun client trouvé." />{selected && <ClientProfile row={selected} onClose={() => setSelected(null)} />}</>;
}




