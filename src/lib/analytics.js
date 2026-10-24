// Lightweight Google Analytics 4 (gtag.js) wrapper.
// Enabled only when PUBLIC_GA_MEASUREMENT_ID is set, so local/dev builds
// without the variable stay analytics-free. Drawing controls are intentionally
// not tracked; only major navigation / conversion buttons call trackEvent().

import { browser } from '$app/environment';
import { env } from '$env/dynamic/public';

const MEASUREMENT_ID = (env.PUBLIC_GA_MEASUREMENT_ID || '').trim();

export const analyticsEnabled = MEASUREMENT_ID.length > 0;

let loaded = false;
let lastPageviewPath = null;

export function initAnalytics() {
    if (!browser || !analyticsEnabled || loaded) return;
    loaded = true;

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    // page_view is dispatched manually from the root layout on every SvelteKit
    // navigation (SPA), so disable the automatic one to avoid double counting.
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageview(path) {
    if (!browser || !analyticsEnabled || typeof window.gtag !== 'function') return;
    const resolvedPath = path || window.location.pathname;
    // afterNavigate can fire more than once for the same path (e.g. on the
    // initial load); skip consecutive duplicates so pageviews aren't counted twice.
    if (resolvedPath === lastPageviewPath) return;
    lastPageviewPath = resolvedPath;
    window.gtag('event', 'page_view', {
        page_path: resolvedPath,
        page_location: window.location.href,
        page_title: document.title
    });
}

export function trackEvent(action, params = {}) {
    if (!browser || !analyticsEnabled || typeof window.gtag !== 'function') return;
    window.gtag('event', action, params);
}
