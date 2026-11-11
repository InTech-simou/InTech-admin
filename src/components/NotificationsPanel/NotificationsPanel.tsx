import { useEffect, useState } from 'react';
import { Notification as Bell, Refresh as RefreshCw, CloseCircle as X, DocumentText, Warning2, ProfileAdd, Setting2, Bag2, Wallet } from 'iconsax-react';
import { apiRequest } from '../../config/api';
import { pagePermission } from '../../config/navigation';
import { hasPermission } from '../../lib/access';
import type { AdminUser, NotificationItem, PageName } from '../../types';
const notificationIcons = {
  new_request: { icon: DocumentText, tone: 'request' },
  urgent_unassigned: { icon: Warning2, tone: 'urgent' },
  new_client: { icon: ProfileAdd, tone: 'account' },
  new_technician: { icon: Setting2, tone: 'technician' },
  package_purchase: { icon: Wallet, tone: 'purchase' },
  shop_order: { icon: Bag2, tone: 'order' },
};
function NotificationGlyph({ type }: { type?: string }) {
  const visual = type ? notificationIcons[type as keyof typeof notificationIcons] : undefined;
  const Icon = visual?.icon || Bell;
  return <span className={`notification-icon ${visual?.tone || 'default'}`}><Icon size={16} /></span>;
}
interface NotificationsPanelProps { base: string; token: string; user: AdminUser; onClose: () => void; onNavigate: (page: PageName) => void; onUnreadCountChange: (count: number) => void }
export function NotificationsPanel({ base, token, user, onClose, onNavigate, onUnreadCountChange }: NotificationsPanelProps) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function refresh(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try { const result = await apiRequest<{ notifications?: NotificationItem[]; unread_count?: number }>(base, token, '/admin/notifications'); const count = result.unread_count ?? (result.notifications || []).filter(item => !item.is_read).length; setItems(result.notifications || []); setUnreadCount(count); onUnreadCountChange(count); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setLoading(false); }
  }
  async function markOneRead(item: NotificationItem) {
    if (!item.is_read) {
      try {
        await apiRequest(base, token, `/admin/notifications/${item.id}/read`, { method: 'POST' });
        setItems(current => current.map(notification => notification.id === item.id ? { ...notification, is_read: true } : notification));
        setUnreadCount(count => { const next = Math.max(0, count - 1); onUnreadCountChange(next); return next; });
      } catch (err) { setError(err instanceof Error ? err.message : String(err)); return; }
    }
    const routes: Record<string, PageName> = { new_request: 'Demandes', urgent_unassigned: 'Assignation', new_client: 'Clients', new_technician: 'Techniciens', package_purchase: 'Demandes forfaits', shop_order: 'Commandes' };
    const route = item.type ? routes[item.type] : undefined;
    if (route && hasPermission(user, pagePermission[route])) onNavigate(route);
  }
  async function markAllRead() {
    try {
      await apiRequest(base, token, '/admin/notifications/read-all', { method: 'POST' });
      setItems(current => current.map(item => ({ ...item, is_read: true })));
      setUnreadCount(0);
      onUnreadCountChange(0);
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
  }
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh(true); }, 15000);
    const onNewNotification = () => { void refresh(true); };
    window.addEventListener('intech:notifications-updated', onNewNotification);
    return () => { window.clearInterval(interval); window.removeEventListener('intech:notifications-updated', onNewNotification); };
  }, [base, token]);
  return <div className="notification-layer"><button className="notification-backdrop" onClick={onClose} aria-label="Fermer les notifications" /><section className="notification-panel" aria-label="Notifications"><div className="notification-head"><div><h2>Notifications</h2><p>{unreadCount ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Tout est à jour'}</p></div><div><button className="notification-refresh" aria-label="Actualiser" onClick={() => void refresh()}><RefreshCw size={15} /></button><button className="notification-refresh" aria-label="Fermer" onClick={onClose}><X size={17} /></button></div></div>{unreadCount > 0 && <button className="mark-all-read" onClick={markAllRead}>Tout marquer comme lu</button>}{error && <div className="notification-error" role="alert">{error}</div>}<div className="notification-list">{loading ? <div className="notification-empty"><RefreshCw size={17} className="spin" />Chargement des notifications…</div> : items.length ? items.map(item => <button className={`notification-item ${item.is_read ? 'is-read' : 'is-unread'}`} key={item.id} onClick={() => markOneRead(item)}><NotificationGlyph type={item.type} /><span className="notification-copy"><b>{item.title || 'Notification InTech'}</b><span>{item.body || '—'}</span><small>{item.created_at ? new Date(item.created_at).toLocaleString('fr-DZ', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Algiers' }) : ''}</small></span>{!item.is_read && <i className="notification-unread-dot" />}</button>) : <div className="notification-empty"><Bell size={19} /><b>Aucune notification</b><span>Les nouvelles demandes et événements apparaîtront ici.</span></div>}</div><div className="notification-foot">Source : API InTech · /admin/notifications</div></section></div>;
}
