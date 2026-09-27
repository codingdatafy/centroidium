(function () {
  'use strict';

  var pageviewTracked = false;

  function generateToken(path, timestamp) {
    var str = path + '-' + timestamp + '-CodingDatafyToken';
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    var hashVal = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return hashVal.toString(16).padStart(24, '0').substring(0, 24);
  }

  function getServerMetrics() {
    var cacheStatus = 'BYPASS';
    var executionTimeMs = 0;

    var execMeta = document.querySelector('meta[name="server-execution-time"]');
    var cacheMeta = document.querySelector('meta[name="server-cache-status"]');

    if (execMeta && execMeta.getAttribute('content')) {
      executionTimeMs = parseFloat(execMeta.getAttribute('content')) || 0;
    }

    if (cacheMeta && cacheMeta.getAttribute('content')) {
      cacheStatus = cacheMeta.getAttribute('content');
    }

    if (executionTimeMs === 0) {
      try {
        var navEntries = performance.getEntriesByType('navigation');
        if (navEntries && navEntries.length > 0) {
          var nav = navEntries[0];
          if (nav.responseEnd && nav.requestStart) {
            executionTimeMs = parseFloat((nav.responseEnd - nav.requestStart).toFixed(2));
          } else if (nav.duration) {
            executionTimeMs = parseFloat(nav.duration.toFixed(2));
          }
        }
      } catch (e) {
        // Performance API fallback safety
      }
    }

    return {
      cacheStatus: cacheStatus,
      executionTimeMs: executionTimeMs
    };
  }

  function sendBeaconPayload(payload) {
    var jsonString = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      var blob = new Blob([jsonString], { type: 'application/json' });
      navigator.sendBeacon('/lib', blob);
    } else {
      fetch('/lib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonString,
        keepalive: true
      }).catch(function (err) {
        console.error('[Analytics Error] Transmission failed:', err);
      });
    }
  }

  function sendPageview() {
    if (pageviewTracked) return;

    if (document.visibilityState !== 'visible') {
      return;
    }

    pageviewTracked = true;

    var rawPath = window.location.pathname.split('?')[0];
    var path = rawPath.replace(/\/+$/, '') || '/';
    var ts = Date.now();
    var token = generateToken(path, ts);
    var is404 = document.querySelector('main[data-is-404="true"]') !== null;
    var metrics = getServerMetrics();

    var payload = {
      p: path,
      r: document.referrer || '',
      type: 'init',
      is_404: is404,
      cache_status: metrics.cacheStatus,
      execution_time_ms: metrics.executionTimeMs,
      ts: ts,
      token: token
    };

    sendBeaconPayload(payload);
  }

  function handleVisibilityChange() {
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

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      pageviewTracked = false;
      sendPageview();
    }
  });
})();

// Code Snippet Headers & Copy Event Handler
(function () {
  'use strict';

  function initCodeHeaders() {
    var codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach(function (pre) {
      if (pre.querySelector('.code-header')) return;

      var codeElement = pre.querySelector('code');
      var languageName = 'Code';

      if (codeElement) {
        var classList = Array.from(codeElement.classList);
        var langClass = classList.find(function (c) {
          return c.startsWith('language-') || c.startsWith('lang-');
        });
        if (langClass) {
          languageName = langClass.replace(/^(language-|lang-)/, '').toUpperCase();
        }
      }

      var headerDiv = document.createElement('div');
      headerDiv.className = 'code-header';

      var langSpan = document.createElement('span');
      langSpan.className = 'code-language-label';
      langSpan.innerText = languageName;

      var button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.type = 'button';
      button.setAttribute('aria-label', 'Copy code snippet');
      button.innerHTML =
        '<svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>' +
        '<span class="btn-text">Copy</span>';

      button.addEventListener('click', async function () {
        var textToCopy = codeElement ? codeElement.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(textToCopy);
          var textSpan = button.querySelector('.btn-text');
          if (textSpan) textSpan.innerText = 'Copied!';
          button.classList.add('copied');

          setTimeout(function () {
            if (textSpan) textSpan.innerText = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
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

  var observer = new MutationObserver(function () {
    initCodeHeaders();
  });

  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();