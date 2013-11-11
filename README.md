Sonos Web Controller
====================

NOTE! THIS IS A WORK IN PROGRESS! Things might end up completely rewritten, beware of that if you try and fork this repository.

As a subtitute for the perl-based controller (www.purple.org) this project is aimed at giving similar controller as the native one, but in a browser.

Using node.js as backend, that will keep track of the state of the players, and WebSockets (socket.io) for a native feel (where the state of the players will be updated as soon as it changes).

Main focus will be to support the following:

 * Zone management
 * Volume control
 * Transport control (play/pause, rwd, fwd, seek)
 * Queue listing
 * Browsing favorites

Main target is to be able to run this on a raspberry pi, but any node.js compatible platform should work. I will only focus on supporting the following browsers:

* Chrome latest beta version (31 as of today)
* Firefox latest version (25 as of today)

For a screenshot of current progress, see: `http://upload.grabbarna.se/files/sonos-web-controller.png`

Currently, prev, next, play/pause and the progress bar works. Group volume works as well, but not as expected (and doesn't update). Track info, player state and progress bar updates instantly when controlled from another device, which was one of the main goals with this project.

This software is in no way affiliated nor endorsed by Sonos inc.

Change log
==========

 * 0.1.5 Master volume control now handles click for small increments
 * 0.1.4 Working master volume control (requires upgraded sonos-discovery 0.5.2)