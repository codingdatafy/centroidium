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
// Analytics Tracking
(function () {
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

  function sendPageview() {
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

    if (navigator.sendBeacon) {
      navigator.sendBeacon('/lib', JSON.stringify(payload));
    } else {
      fetch('/lib', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }

  if (document.readyState === 'complete') {
    sendPageview();
  } else {
    window.addEventListener('load', sendPageview);
  }
})();
// Code Header: Language Badge & Copy Button + Analytics Tracking
(function () {
  'use strict';

  function initCodeHeaders() {
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach((pre) => {
      if (pre.querySelector('.code-header')) return;

      const codeElement = pre.querySelector('code');
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
      button.innerHTML = `
        <svg class="copy-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span class="btn-text">Copy</span>
      `;

      button.addEventListener('click', async () => {
        const textToCopy = codeElement ? codeElement.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(textToCopy);
          button.querySelector('.btn-text').innerText = 'Copied!';
          button.classList.add('copied');

          if (typeof window.trackEvent === 'function') {
            window.trackEvent('copy_code', languageName.toLowerCase());
          }

          setTimeout(() => {
            button.querySelector('.btn-text').innerText = 'Copy';
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

  const observer = new MutationObserver(() => {
    initCodeHeaders();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();
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

/////////////////////////////  Header  /////////////////////////////

/////////////////////////////  Sidebar /////////////////////////////

/////////////////////////////  Main    /////////////////////////////

/////////////////////////////  Footer  /////////////////////////////