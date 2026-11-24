import { useCallback, useEffect, useState } from 'react';

interface NavState {
    tab: string;
    view: string | null;
}

const VALID_TABS = new Set(['home', 'mutasi', 'analytics', 'akun']);

function readFromUrl(): NavState {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    return {
        tab: tab && VALID_TABS.has(tab) ? tab : 'home',
        view: params.get('view'),
    };
}

function toUrl({ tab, view }: NavState): string {
    const params = new URLSearchParams();
    if (tab !== 'home') params.set('tab', tab);
    if (view) params.set('view', view);
    const qs = params.toString();
    return qs ? `/?${qs}` : '/';
}

/**
 * Tab + sub-layar yang tersinkron dengan riwayat browser,
 * sehingga tombol Back Android menutup sub-layar alih-alih keluar dari aplikasi.
 */
export const useAppNavigation = () => {
    const [nav, setNav] = useState<NavState>(readFromUrl);

    useEffect(() => {
        const onPop = (e: PopStateEvent) => setNav((e.state as NavState | null) ?? readFromUrl());
        window.addEventListener('popstate', onPop);
        window.history.replaceState(nav, '', toUrl(nav));
        return () => window.removeEventListener('popstate', onPop);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const go = useCallback((next: NavState) => {
        setNav(next);
        window.history.pushState(next, '', toUrl(next));
        window.scrollTo({ top: 0 });
    }, []);

    const setTab = useCallback((tab: string) => go({ tab, view: null }), [go]);
    const openView = useCallback((view: string) => go({ tab: 'home', view }), [go]);
    const back = useCallback(() => {
        if (window.history.state && (window.history.state as NavState).view) window.history.back();
        else go({ tab: nav.tab, view: null });
    }, [go, nav.tab]);

    /** Navigasi dari URL penuh (mis. dari klik notifikasi). */
    const navigateToUrl = useCallback((url: string) => {
        const u = new URL(url, window.location.origin);
        const tab = u.searchParams.get('tab');
        go({ tab: tab && VALID_TABS.has(tab) ? tab : 'home', view: u.searchParams.get('view') });
    }, [go]);

    return { tab: nav.tab, view: nav.view, setTab, openView, back, navigateToUrl };
};
