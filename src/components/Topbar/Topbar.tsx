import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification as Bell, ArrowDown2 as ChevronDown, Logout as LogOut, HambergerMenu as Menu, Profile as UserRound } from 'iconsax-react';
import { initials } from '../../lib/access';
import type { AdminUser } from '../../types';
import appIcon from '../../assets/intech-app-icon.png';

interface TopbarProps {
  user: AdminUser;
  onMenu: () => void;
  onHome: () => void;
  onNotifications: () => void;
  unreadCount: number;
  onLogout: () => void;
}

export function Topbar({ user, onMenu, onHome, onNotifications, unreadCount, onLogout }: TopbarProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Administrateur';

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (event.target instanceof Node && !accountRef.current?.contains(event.target)) setAccountOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="topbar">
      <div className="top-left">
        <button className="menu-button" aria-label="Ouvrir le menu" onClick={onMenu}><Menu size={21} /></button>
        <button className="brand topbar-brand" onClick={onHome} aria-label="InTech, accueil"><span className="brand-mark brand-image-mark"><img src={appIcon} alt="" /></span><span>InTech</span></button>
      </div>
      <div className="top-right">
        <button className="icon-button bell-button" aria-label={unreadCount ? `Notifications, ${unreadCount} non lues` : 'Notifications'} onClick={onNotifications}><Bell size={19} />{unreadCount > 0 && <span className="bell-unread-badge" aria-hidden="true">{unreadCount > 9 ? '9+' : unreadCount}</span>}</button>
        <span className="top-divider profile-divider" />
        <div className="top-account" ref={accountRef}>
          <button className="top-account-trigger" aria-label="Ouvrir le menu du compte" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(open => !open)}>
            <span className="top-avatar">{initials(user)}</span><span className="top-account-label"><b>{displayName}</b><small>{user.admin_role === 'super_admin' ? 'Super admin' : user.admin_role === 'brand_owner' ? 'Boutique' : 'Admin'}</small></span><ChevronDown size={14} />
          </button>
          {accountOpen && (
            <div className="top-account-menu" role="menu" aria-label="Menu du compte">
              <div className="top-account-identity"><span className="top-avatar">{initials(user)}</span><div><b>{displayName}</b><small>{user.email || user.admin_role || 'Administrateur'}</small></div></div>
              <div className="top-account-separator" />
              <button role="menuitem" onClick={() => { setAccountOpen(false); navigate('/profile'); }}><UserRound size={16} /><span>Mon profil</span></button>
              <button className="top-account-logout" role="menuitem" onClick={() => { setAccountOpen(false); onLogout(); }}><LogOut size={16} /><span>Déconnexion</span></button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
