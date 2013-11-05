Sonos Web Controller
====================

NOTE! THIS IS A WORK IN PROGRESS! Things might end up completely rewritten, beware of that i fyou try and fork this repository.

As a subtitute for the perl-based controller (www.purple.org) this project is aimed at giving similar controller as the native one, but in a browser.

Using node.js as backend, that will keep track of the state of the players, and WebSockets (socket.io) for a native feel (where the state of the players will be updated as soon as it changes).

Main focus will be to support the following:

 * Zone management
 * Volume control
 * Transport control (play/pause, rwd, fwd, seek)
 * Queue listing
 * Browsing favorites

Main target is to be able to run this on a raspberry pi, but any node.js compatible platform should work. As of today the GUI only renders correctly in Firefox 19, and I will only focus on supporting:

* Chrome latest version (30 as of today)
* Firefox latest version (25 as of today)


