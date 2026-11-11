import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SearchNormal as Search, CloseCircle as X } from 'iconsax-react';
import { NotificationsPanel } from "../NotificationsPanel";
import { Sidebar } from "../Sidebar";
import { Topbar } from "../Topbar";
import { ToastCenter } from '../ToastCenter/ToastCenter';
import { showToast } from '../ToastCenter/ToastCenter';
import { apiRequest } from '../../config/api';
import { RequestDetails } from "../../pages/Requests/components/RequestDetails";
import {
  pageDescriptions,
  pagePermission,
  pageRoutes,
} from "../../config/navigation";
import { hasPermission } from "../../lib/access";
import { logoutAdmin, useAppDispatch, useAppSelector } from "../../state";
import type { AdminUser, NotificationItem, PageName, RequestSummary } from "../../types";

export interface ScreenOutletContext {
  base: string;
  token: string;
  user: AdminUser;
  query: string;
  onSelect: (row: import("../../types").ApiRow) => void;
}

function currentPage(pathname: string): PageName {
  return (
    (Object.entries(pageRoutes).find(
      ([, path]) => path === pathname,
    )?.[0] as PageName) || "Vue d’ensemble"
  );
}

const searchPlaceholders: Partial<Record<PageName, string>> = {
  Demandes: "Rechercher une demande…",
  Techniciens: "Rechercher un technicien…",
  Clients: "Rechercher un client…",
  Assignation: "Rechercher une assignation…",
  Prestations: "Rechercher une prestation…",
  "Domaines de diagnostic": "Rechercher un domaine…",
  Appareils: "Rechercher un appareil…",
  Forfaits: "Rechercher un forfait…",
  "Demandes forfaits": "Rechercher une demande de forfait…",
  "Prix par wilaya": "Rechercher une wilaya…",
  Catégories: "Rechercher une catégorie…",
  Marques: "Rechercher une marque…",
  Produits: "Rechercher un produit…",
  Commandes: "Rechercher une commande…",
  "Pièces de rechange": "Rechercher une pièce…",
  "Magasins partenaires": "Rechercher un magasin…",
  "Codes promo": "Rechercher un code promo…",
  Administrateurs: "Rechercher un administrateur…",
};

export function DashboardLayout() {
  const session = useAppSelector((state) => state.auth.session);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<RequestSummary | null>(null);
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    if (!session) { setUnreadCount(0); return; }
    let active = true;
    let initialized = false;
    let inFlight = false;
    const knownIds = new Set<string>();
    const refreshUnread = async () => {
      if (document.visibilityState !== 'visible' || inFlight) return;
      inFlight = true;
      try {
        const result = await apiRequest<{ unread_count?: number; notifications?: NotificationItem[] }>(session.base, session.token, '/admin/notifications');
        if (!active) return;
        const notifications = result.notifications || [];
        setUnreadCount(result.unread_count ?? notifications.filter(item => !item.is_read).length);
        if (initialized) {
          const newItems = notifications.filter(item => !knownIds.has(String(item.id)) && !item.is_read);
          if (newItems.length) {
            const latest = newItems[0];
            showToast({ tone: latest.type === 'urgent_unassigned' ? 'warning' : 'info', title: latest.title || 'Nouvelle notification', description: latest.body });
            window.dispatchEvent(new Event('intech:notifications-updated'));
            if (newItems.some(item => item.type === 'new_request' || item.type === 'urgent_unassigned')) window.dispatchEvent(new Event('intech:request-notification'));
          }
        }
        notifications.forEach(item => knownIds.add(String(item.id)));
        initialized = true;
      } catch { /* Keep the last known count until the next check. */ }
      finally { inFlight = false; }
    };
    void refreshUnread();
    const interval = window.setInterval(() => { void refreshUnread(); }, 5000);
    const onFocus = () => { void refreshUnread(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [session?.base, session?.token]);
  if (!session) return null;
  const page = currentPage(location.pathname);
  const searchPlaceholder = searchPlaceholders[page];
  useEffect(() => { setQuery(""); }, [location.pathname]);
  const go = (name: PageName) => {
    navigate(pageRoutes[name]);
    setMobileNav(false);
    setQuery("");
    setSelected(null);
  };
  const onQueryChange = (value: string) => {
    setQuery(value);
  };
  const sessionUser = session.user;
  return (
    <div className="shell">
      <Sidebar
        page={page}
        user={sessionUser}
        mobileOpen={mobileNav}
        collapsed={sidebarCollapsed}
        onToggle={() => window.innerWidth <= 650 ? setMobileNav(false) : setSidebarCollapsed(value => !value)}
        onClose={() => setMobileNav(false)}
        onNavigate={go}
      />
      <div className={`main-column ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <Topbar
          user={sessionUser}
          onMenu={() => setMobileNav(true)}
          onHome={() => go('Vue d’ensemble')}
          onNotifications={() => setNotificationsOpen((open) => !open)}
          unreadCount={unreadCount}
          onLogout={() => {
            void dispatch(logoutAdmin()).then(() =>
              navigate("/login", { replace: true }),
            );
          }}
        />
        {notificationsOpen && (
          <NotificationsPanel
            base={session.base}
            token={session.token}
            user={sessionUser}
            onClose={() => setNotificationsOpen(false)}
            onUnreadCountChange={setUnreadCount}
            onNavigate={(name) => {
              if (hasPermission(sessionUser, pagePermission[name])) go(name);
              setNotificationsOpen(false);
            }}
          />
        )}
        <main className="content">
          <div className="page-heading">
            <div>
              <h1>
                {page === "Vue d’ensemble" ? "Tableau de bord" : page}
              </h1>
              {page !== "Vue d’ensemble" && <p>
                {pageDescriptions[page] || "Suivez et gérez cette partie de votre service InTech."}
              </p>}
            </div>
            <div className="heading-actions page-heading-tools">
              {searchPlaceholder && <label className="global-search page-search">
                <Search size={16} />
                <input aria-label={searchPlaceholder} placeholder={searchPlaceholder} value={query} onChange={event => onQueryChange(event.target.value)} />
              </label>}
              <div id="page-heading-create-action" />
            </div>
          </div>
          <Outlet
            context={
              {
                base: session.base,
                token: session.token,
                user: sessionUser,
                query,
                onSelect: (row: import("../../types").ApiRow) =>
                  setSelected({
                    id: row.Référence ?? row._id ?? "—",
                    device: row.Appareil,
                    model: row.Type,
                    kind: row.Type,
                    issue: row.Statut,
                    status: row.Statut,
                    tech: row.Technicien,
                    date: row.Créée,
                    city: "—",
                    apiId: row._id,
                  }),
              } satisfies ScreenOutletContext
            }
          />
        </main>
        <footer className="footer">
          <span>
            <b>
              intech<span className="brand-period">.</span>
            </b>{" "}
            Espace d’administration
          </span>
          <span>API InTech · mode lecture</span>
        </footer>
      </div>
      {selected && (
        <div
          className="overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <section
            className="detail-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Détail de la demande ${selected.id}`}
          >
            <div className="drawer-head">
              <div>
                <span className="eyebrow">DOSSIER SAV</span>
                <p className="request-drawer-subtitle">{selected.device} · {selected.kind}</p>
              </div>
              <button
                className="icon-button"
                aria-label="Fermer"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <RequestDetails
              base={session.base}
              token={session.token}
              id={selected.apiId}
              selected={selected}
              canAssign={hasPermission(sessionUser, "assignments")}
              onGoAssign={() => go("Assignation")}
            />
          </section>
        </div>
      )}
      <ToastCenter />
    </div>
  );
}
