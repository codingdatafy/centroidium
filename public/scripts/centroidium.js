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