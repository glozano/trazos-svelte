<script>
    import { afterNavigate } from '$app/navigation';
    import { initAnalytics, trackPageview } from '$lib/analytics';

    // Boot gtag once and send a page_view on the initial load and every
    // client-side navigation. initAnalytics() is idempotent.
    afterNavigate((navigation) => {
        initAnalytics();
        trackPageview(navigation?.to?.url?.pathname);
    });
</script>

<slot />
