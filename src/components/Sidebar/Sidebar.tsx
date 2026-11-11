import { navGroups, bottomNav, pagePermission } from '../../config/navigation';
import { HambergerMenu as Menu } from 'iconsax-react';
import { hasPermission } from '../../lib/access';
import type { AdminUser, PageName } from '../../types';
interface SidebarProps { page: PageName; user: AdminUser; mobileOpen: boolean; collapsed: boolean; onToggle: () => void; onNavigate: (page: PageName) => void; onClose: () => void }
export function Sidebar({ page, user, mobileOpen, collapsed, onToggle, onNavigate, onClose }: SidebarProps) {
  return <>
    {mobileOpen && <button className="scrim" aria-label="Fermer le menu" onClick={onClose} />}
    <aside className={`sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-open' : ''}`}>
      <button className="sidebar-toggle" type="button" aria-label={mobileOpen ? 'Fermer le menu' : collapsed ? 'Développer le menu' : 'Réduire le menu'} aria-controls="side-nav" aria-expanded={!collapsed || mobileOpen} onClick={onToggle}><Menu size={19} /></button>
      <nav className="side-nav" id="side-nav" aria-label="Navigation principale">{navGroups.map(group => <div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.filter(([label]) => hasPermission(user, pagePermission[label])).map(([label, Icon]) => <button key={label} title={collapsed && !mobileOpen ? label : undefined} aria-label={label} aria-current={page === label ? 'page' : undefined} onClick={() => onNavigate(label)} className={page === label ? 'active' : ''}><Icon size={18} /><span>{label}</span></button>)}</div>)}</nav>
      <div className="side-bottom">{bottomNav.filter(([label]) => hasPermission(user, pagePermission[label])).map(([label, Icon]) => <button key={label} title={collapsed && !mobileOpen ? label : undefined} aria-label={label} aria-current={page === label ? 'page' : undefined} onClick={() => onNavigate(label)} className={`bottom-link ${page === label ? 'active' : ''}`}><Icon size={18} /><span>{label}</span></button>)}</div>
    </aside>
  </>;
}
