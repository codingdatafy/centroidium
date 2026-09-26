/* ********************************************************
* Description : JavaScript Framework For CodingDatafy Website
* URL         : www.codingdatafy.com/centroidium.js
* Version     : 1.1
* License     : Copyright © 2026 CodingDatafy
* This file contains the following sections:
*   - Root
*   - Header
*   - Sidebar
*   - Main
*   - Footer
******************************************************** */

/////////////////////////////  Root    /////////////////////////////
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
    // Prevent duplicated pageviews in single view lifecycle
    if (pageviewTracked) return;

    // Do not log views if the tab is pre-rendered in background (Firefox/Chrome pre-render)
    if (document.visibilityState === 'prerender') {
      return;
    }

    pageviewTracked = true;

    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    var ts = Date.now();
    var token = generateToken(path, ts);
    var is404 = document.querySelector('main[data-is-404="true"]') !== null;

    var payload = {
      p: path,
      r: document.referrer || '',
      type: 'init',
      is_404: is404,
      ts: ts,
      token: token
    };

    sendBeaconPayload(payload);
  }

  window.trackEvent = function (eventType, target) {
    if (!eventType) return;

    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    var ts = Date.now();
    var token = generateToken(path, ts);

    var payload = {
      p: path,
      r: document.referrer || '',
      type: 'event',
      event_type: eventType,
      target: target || '',
      ts: ts,
      token: token
    };

    sendBeaconPayload(payload);
  };

  // Visibility state handling for background pre-rendered tabs (e.g. Ctrl-Click)
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible' && !pageviewTracked) {
      sendPageview();
    }
  }

  if (document.visibilityState === 'prerender') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  } else if (document.readyState === 'complete' || document.readyState === 'interactive') {
    sendPageview();
  } else {
    window.addEventListener('DOMContentLoaded', sendPageview);
  }

  // Handle bfcache (Back/Forward navigation) & F5 Reload tracking
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      pageviewTracked = false;
      sendPageview();
    }
  });

  // Outbound Link Click Event Listener
  document.addEventListener('click', function (event) {
    var anchor = event.target.closest('a');
    if (!anchor || !anchor.href) return;

    try {
      var targetUrl = new URL(anchor.href, window.location.href);
      var currentHost = window.location.hostname.replace(/^www\./, '');
      var targetHost = targetUrl.hostname.replace(/^www\./, '');

      // Check if link is outbound
      if (targetHost && targetHost !== currentHost && /^https?:/i.test(targetUrl.protocol)) {
        window.trackEvent('outbound_click', targetUrl.href);
      }
    } catch (e) {
      // Ignore invalid URLs
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

          if (typeof window.trackEvent === 'function') {
            window.trackEvent('copy_code', languageName.toLowerCase());
          }

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

/////////////////////////////  Header  /////////////////////////////

/////////////////////////////  Sidebar /////////////////////////////

/////////////////////////////  Main    /////////////////////////////
// Handle target="_blank" for external links
(function () {
    var internal = location.host.replace("www.", "");
    internal = new RegExp(internal, "i");    
    var a = document.getElementsByTagName('a');
    for (var i = 0; i < a.length; i++) {
        var href = a[i].host;
        if( !internal.test(href) ) {
            a[i].setAttribute('target', '_blank');
        }
    }
})();
/////////////////////////////  Footer  /////////////////////////////