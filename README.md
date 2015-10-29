Sonos Web Controller
====================

NOTE! THIS IS A WORK IN PROGRESS! This is a really early alpha. Things might break from time to time, until I settle a final release that I consider stable for daily use. Until then only master branch will exist.

As a subtitute for the perl-based controller (www.purple.org) this project is aimed at giving similar controller as the native one, but in a browser.

Using node.js as backend, that will keep track of the state of the players, and WebSockets (socket.io) for a native feel (where the state of the players will be updated as soon as it changes).

Main focus will be to support the following:

 * Zone management
 * Volume control
 * Transport control (play/pause, rwd, fwd, seek)
 * Queue listing
 * Browsing favorites

Main target is to be able to run this on a raspberry pi, but any node.js compatible platform should work. I will only focus on supporting the following browsers:

* Chrome latest version (31 as of today)
* Firefox latest version (25 as of today)

For a screenshot of current progress, see: http://upload.grabbarna.se/files/sonos-web-controller-201412.png
For a video demo: http://www.youtube.com/watch?v=_7Dke5LsTF0

Currently, prev, next, play/pause and the progress bar works. Volume (player and group) work as well. Track info, player state and progress bar updates instantly when controlled from another device, which was one of the main goals with this project. You can group and ungroup via drag n' drop, and you can change music source using your favorites (no browsing atm). Also, different playmode options can be toggled: repeat, random, crossfade.

settings.json
=============

To persist settings between updates, you can create a file called settings.json in the root folder (same level as server.js). Today this can take two arguments:

{
	"port": 8080,
	"cacheDir": "./cache"
}

The above are the defaults. Change them as you like and it will take precedence over the default ones.

Installation
============

Easiest way to install this today would be to use git. Make sure and install node.js and npm (node package manager) for your platform. Make sure that the node and npm command works. If not, you will fail miserably. Install git for your platform. Make sure the git command works as well.

Create a folder on your computer where you want the files to reside (for example, c:\node\sonos-web-controller or /opt/node/sonos-web-controller). Now, using a command prompt/terminal, stand in that directory, and do the following:

	git clone https://github.com/jishi/node-sonos-web-controller.git .
	npm install
	node server.js

Now, visit http://localhost:8080.

For running this as a service under linux, I suggest using pm2 (https://github.com/Unitech/pm2). You must use fork mode (-x) otherwise it will use 100% CPU (cluster mode is the default, if you want to switch you need to delete the old app from pm2 with "pm2 delete appname"). For windows, you may try Winser (http://jfromaniello.github.io/winser/), but haven't tested it.



This software is in no way affiliated nor endorsed by Sonos inc.

Change log
==========
 * 0.13.0 Merged mobile branch with simplified mobile view (/m)
 * 0.12.1 Attempted to fix Safari rendering bug for play/pause icon
 * 0.12.0 Support household filtering. Requires sonos-discovery 0.12.0 or higher
 * 0.7.0 Refactoring attempt
 * 0.6.2 Now handles startup from different working directory (like, node /opt/sonos-web-server/server.js)
 * 0.6.1 Fixed the mute state problem
 * 0.6.0 Progressbar, mouse wheel and incremental click. Styled scrollbars (Chrome only). Fixed wonky player volumes (when dragging)
 * 0.5.7 Working progressbar (drag and slide). Working player mute. Requires sonos-discovery 0.8.1
 * 0.5.6 Working master mute. Some minor UI improvements
 * 0.5.3 Handle switching back to queue from radio stream
 * 0.5.2 Supports settings.json for customization. Port and cacheDir to start with.
 * 0.5.0 Working player volume controls. Removed mute for the time being. Working shuffle/repeat/crossfade. requires sonos-discovery 0.7.x
 * 0.4.4 use md5 hash for cached image instead (fixes ENAMETOOLONG probably)
 * 0.4.2 Added dynamic favicon and title. Make sure to use sonos-discovery 0.6.1 or later to fix albumArtURI error
 * 0.4.1 Added cover art for now playing
 * 0.4.0 Now has working queue listing. Will tweak it for better performance later
 * 0.3.0 Lists favorites and possibility to replace queue with favorite/radio
 * 0.2.0 Now working group management (drag n' drop style)
 * 0.1.5 Master volume control now handles click for small increments
 * 0.1.4 Working master volume control (requires upgraded sonos-discovery 0.5.2)
