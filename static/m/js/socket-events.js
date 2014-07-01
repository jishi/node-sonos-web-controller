"use strict";
///
/// socket events
///
Socket.topologyChanged = function () {
	GUI.updateCurrentStatus();
}

Socket.transportStateChanged = function (player) {
	GUI.updateCurrentStatus();
}