/* ********************************************************
* Description : Javascript Framework For CodingDatafy Website
* URL     	  : www.codingdatafy.com/centroidium.js
* Version 	  : 1.0
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
/////////////////////////////  Footer  /////////////////////////////