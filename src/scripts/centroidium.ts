/* ********************************************************
* Description : JavaScript Framework For CodingDatafy Website
* URL         : www.codingdatafy.com/scripts/centroidium.js
* Version     : 1.0
* License     : Copyright © 2026 CodingDatafy
* This file contains the following sections:
*   - Root
*   - Header
*   - Sidebar
*   - Main
*   - Footer
******************************************************** */

/////////////////////////////  Root    /////////////////////////////
// Automatically assign target="_blank" and rel="noopener noreferrer" to external links
((): void => {
  const internalHost = location.host.replace(/^www\./, '');
  const internalRegex = new RegExp(internalHost, 'i');
  const anchorElements = document.getElementsByTagName('a');

  for (let i = 0; i < anchorElements.length; i++) {
    const anchor = anchorElements[i];
    if (anchor && anchor.host) {
      if (!internalRegex.test(anchor.host)) {
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }
})();
/////////////////////////////  Header  /////////////////////////////

/////////////////////////////  Sidebar /////////////////////////////

/////////////////////////////  Main    /////////////////////////////

/////////////////////////////  Footer  /////////////////////////////