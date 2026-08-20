/* ********************************************************
* Description : Javascript Framework For CodingDatafy Website
* URL         : www.codingdatafy.com/centroidium.js
* Version     : 1.1
* Licence     : Copyright © 2026 CodingDatafy
* This file contains the following sections:
	- Root
	- Header
	- Sidebar
	- Main
	- Footer
******************************************************** */

/////////////////////////////  Root    /////////////////////////////
// TargetBlank
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
            window.trackEvent('copy_code', textToCopy.substring(0, 100));
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

/////////////////////////////  Footer  /////////////////////////////