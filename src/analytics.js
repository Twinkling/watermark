// Included only in the Pages build; the standalone offline app has no analytics.
(() => {
  const config = /*__ANALYTICS_CONFIG__*/ null;
  if (
    !config ||
    location.protocol !== "https:" ||
    location.hostname !== config.hostname ||
    navigator.globalPrivacyControl ||
    navigator.doNotTrack === "1"
  ) return;

  window.WatermarkAnalyticsEnabled = true;
  function start() {
    if (window.WatermarkAnalyticsStarted) return;
    window.WatermarkAnalyticsStarted = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    let referrer = "";
    try { referrer = new URL(document.referrer).origin; } catch {}
    window.gtag("js", new Date());
    window.gtag("config", config.measurementId, {
      send_page_view: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: location.origin + location.pathname,
      page_referrer: referrer,
      page_title: "留印 · 本地图片工作台",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + config.measurementId;
    document.head.appendChild(script);
  }
  function schedule() {
    if (window.requestIdleCallback) window.requestIdleCallback(start, { timeout: 1500 });
    else window.setTimeout(start, 0);
  }
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
})();
