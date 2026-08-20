/* ********************************************************
* Description : Javascript Framework For CodingDatafy Website
* URL         : www.codingdatafy.com/centroidium.js
* Version     : 1.0
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
// Copy Code Snippets & Analytics Tracking
(function () {
  'use strict';

  function initCopyCodeButtons() {
    const codeBlocks = document.querySelectorAll('pre');

    codeBlocks.forEach((pre) => {
      if (pre.querySelector('.copy-code-btn')) return;

      pre.style.position = 'relative';

      const button = document.createElement('button');
      button.className = 'copy-code-btn';
      button.type = 'button';
      button.innerText = 'Copy';
      button.setAttribute('aria-label', 'Copy code snippet');

      button.addEventListener('click', async () => {
        const codeElement = pre.querySelector('code');
        const textToCopy = codeElement ? codeElement.innerText : pre.innerText;

        try {
          await navigator.clipboard.writeText(textToCopy);
          button.innerText = 'Copied!';
          button.classList.add('copied');

          if (typeof window.trackEvent === 'function') {
            window.trackEvent('copy_code', textToCopy.substring(0, 100));
          }

          setTimeout(() => {
            button.innerText = 'Copy';
            button.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy code snippet:', err);
        }
      });

      pre.appendChild(button);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCopyCodeButtons);
  } else {
    initCopyCodeButtons();
  }

  // Handle dynamic DOM content updates for Next.js routing
  const observer = new MutationObserver(() => {
    initCopyCodeButtons();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

/////////////////////////////  Footer  /////////////////////////////