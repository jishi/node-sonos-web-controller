"use strict";

var Sonos = {
	currentState: {
		selectedZone: null,
		zoneInfo: null
	},
	grouping: {},
	players: {},
	groupVolume: {
		disableUpdate: false,
		disableTimer: null
	},
	currentZoneCoordinator: function () {
		return Sonos.players[Sonos.currentState.selectedZone];
	}
};
