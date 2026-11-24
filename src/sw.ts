/// <reference lib="webworker" />
// Service worker Rplanner: cache offline + Web Push.
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// SPA: semua navigasi dilayani index.html (termasuk saat offline)
try {
    registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));
} catch {
    // index.html tidak ada di manifest saat dev
}

interface PushData {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
}

self.addEventListener('push', (event) => {
    let data: PushData = {};
    try {
        data = event.data?.json() ?? {};
    } catch {
        data = { body: event.data?.text() };
    }

    event.waitUntil(
        self.registration.showNotification(data.title ?? 'Rplanner', {
            body: data.body ?? '',
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            tag: data.tag,
            data: { url: data.url ?? '/' },
            lang: 'id',
        }),
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const target = new URL((event.notification.data?.url as string) ?? '/', self.location.origin).href;

    event.waitUntil((async () => {
        const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of windows) {
            if (new URL(client.url).origin === self.location.origin) {
                await client.focus();
                client.postMessage({ type: 'rplanner:navigate', url: target });
                return;
            }
        }
        await self.clients.openWindow(target);
    })());
});
