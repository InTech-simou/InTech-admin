import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadPageData, selectPageData, useAppDispatch, useAppSelector } from '../state';
import type { ScreenPageData } from '../types/page';
import type { AdminUser, PageName } from '../types';

interface UsePageDataArgs { base: string; token: string; user: AdminUser; page: PageName; query: string }

export function usePageData({ base, token, user, page, query }: UsePageDataArgs): ScreenPageData {
  const dispatch = useAppDispatch();
  const data = useAppSelector(state => selectPageData(state, page));
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void dispatch(loadPageData({ base, token, user, page }));
  }, [dispatch, base, token, user, page, refreshKey]);

  useEffect(() => {
    if (!['Demandes', 'Assignation', 'Vue d’ensemble'].includes(page)) return;
    let refreshing = false;
    const refreshVisible = async () => {
      if (document.visibilityState !== 'visible' || refreshing) return;
      refreshing = true;
      try { await dispatch(loadPageData({ base, token, user, page, silent: true })); }
      finally { refreshing = false; }
    };
    const interval = window.setInterval(() => { void refreshVisible(); }, 5000);
    const onFocus = () => { void refreshVisible(); };
    const onNewNotification = () => { void refreshVisible(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('intech:request-notification', onNewNotification);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', onFocus); window.removeEventListener('intech:request-notification', onNewNotification); document.removeEventListener('visibilitychange', onFocus); };
  }, [dispatch, base, token, user, page]);

  const visibleRows = useMemo(
    () => data.rows.filter(row => Object.values(row).join(' ').toLowerCase().includes(query.toLowerCase())),
    [data.rows, query],
  );
  const refresh = useCallback(() => setRefreshKey(value => value + 1), []);
  return { page, rows: data.rows, visibleRows, meta: data.meta, settings: data.settings, loading: data.loading, error: data.error, refresh };
}
