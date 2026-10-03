interface ServerMetrics {
  cacheStatus: string;
  executionTimeMs: number;
}

interface BeaconPayload {
  p: string;
  r: string;
  type: string;
  is_404: boolean;
  cache_status: string;
  execution_time_ms: number;
  ts: number;
  token: string;
}

// 1. Analytics & Pageview Beacon Engine
((): void => {
  'use strict';

  let pageviewTracked = false;

  function generateToken(path: string, timestamp: number): string {
    const str = `${path}-${timestamp}-CodingDatafyToken`;
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    const hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return hashVal.toString(16).padStart(24, '0').substring(0, 24);
  }

  function getServerMetrics(): ServerMetrics {
    let cacheStatus = 'BYPASS';
    let executionTimeMs = 0;

    const execMeta = document.querySelector<HTMLMetaElement>('meta[name="server-execution-time"]');
    const cacheMeta = document.querySelector<HTMLMetaElement>('meta[name="server-cache-status"]');

    if (cacheMeta) {
      const content = cacheMeta.getAttribute('content');
      if (content) {
        cacheStatus = content;
      }
    }

    if (execMeta) {
      const content = execMeta.getAttribute('content');
      if (content) {
        executionTimeMs = parseFloat(content) || 0;
      }
    }

    if (executionTimeMs === 0) {
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries && navEntries.length > 0) {
          const nav = navEntries[0];
          if (nav && nav.responseEnd && nav.requestStart) {
            executionTimeMs = parseFloat((nav.responseEnd - nav.requestStart).toFixed(2));
          } else if (nav && nav.duration) {
            executionTimeMs = parseFloat(nav.duration.toFixed(2));
          }
        }
      } catch {
        // Fallback for browsers without Performance Navigation API
      }
    }

    return {
      cacheStatus,
      executionTimeMs,
    };
  }

  function sendBeaconPayload(payload: BeaconPayload): void {
    const jsonString = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      const blob = new Blob([jsonString], { type: 'application/json' });
      navigator.sendBeacon('/lib', blob);
    } else {
      fetch('/lib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
        keepalive: true,
      }).catch((err: unknown) => {
        console.error('[Analytics Error] Transmission failed:', err);
      });
    }
  }

  function sendPageview(): void {
    if (pageviewTracked) return;

    if (document.visibilityState !== 'visible') {
      return;
    }

    pageviewTracked = true;

    const rawPath = window.location.pathname.split('?')[0] || '/';
    const path = rawPath.replace(/\/+$/, '') || '/';
    const ts = Date.now();
    const token = generateToken(path, ts);
    const is404 = document.querySelector('main[data-is-404="true"]') !== null;
    const metrics = getServerMetrics();

    const payload: BeaconPayload = {
      p: path,
      r: document.referrer || '',
      type: 'init',
      is_404: is404,
      cache_status: metrics.cacheStatus,
      execution_time_ms: metrics.executionTimeMs,
      ts,
      token,
    };

    sendBeaconPayload(payload);
  }

  function handleVisibilityChange(): void {
    if (document.visibilityState === 'visible' && !pageviewTracked) {
      sendPageview();
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);

  if (document.visibilityState === 'visible') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      sendPageview();
    } else {
      window.addEventListener('DOMContentLoaded', sendPageview);
    }
  }

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) {
      pageviewTracked = false;
      sendPageview();
    }
  });
})();

// 2. Code Snippet Headers & Copy Button Handler
((): void => {
  'use strict';

  function initCodeHeaders(): void {
    const codeBlocks = document.querySelectorAll<HTMLPreElement>('pre');

    codeBlocks.forEach((pre: HTMLPreElement) => {
      if (pre.querySelector('.code-header')) return;

      const codeElement = pre.querySelector<HTMLElement>('code');
      let languageName = 'Code';

      if (codeElement) {
        const classList = Array.from(codeElement.classList);
        const langClass = classList.find((c) => c.startsWith('language-') || c.startsWith('lang-'));
        if (langClass) {
          languageName = langClass.replace(/^(language-|lang-)/, '').toUpperCase();
        }
      }

      const headerDiv = document.createElement('div');
      headerDiv.className = 'code-header';

      const langSpan = document.createElement('span');
      langSpan.className = 'code-language-label';
      langSpan.innerText = languageName;

      const button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.type = 'button';
      button.setAttribute('aria-label', 'Copy code snippet');
      button.innerHTML =
        '<svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
        '<span class="btn-text">Copy</span>';

      button.addEventListener('click', async () => {
        const textToCopy = codeElement ? codeElement.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(textToCopy);
          const textSpan = button.querySelector<HTMLSpanElement>('.btn-text');
          if (textSpan) textSpan.innerText = 'Copied!';
          button.classList.add('copied');

          setTimeout(() => {
            if (textSpan) textSpan.innerText = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err: unknown) {
          console.error('Failed to copy code snippet:', err);
        }
      });

      headerDiv.appendChild(langSpan);
      headerDiv.appendChild(button);

      pre.prepend(headerDiv);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCodeHeaders);
  } else {
    initCodeHeaders();
  }

  const observer = new MutationObserver(() => {
    initCodeHeaders();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();