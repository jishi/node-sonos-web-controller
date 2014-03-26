"use strict";
///
/// socket events
///

var Socket = Socket || {};

Socket.socket = io.connect('/');

Socket.socket.on('topology-change', function (data) {
	Sonos.grouping = {};
	var stateTime = new Date().valueOf();
	var shouldRenderVolumes = false;
	data.forEach(function (player) {
		player.stateTime = stateTime;
		Sonos.players[player.uuid] = player;
		if (!Sonos.grouping[player.coordinator]) Sonos.grouping[player.coordinator] = [];
		Sonos.grouping[player.coordinator].push(player.uuid);
	});

	console.log("topology-change", Sonos.grouping, Sonos.players);

	// If the selected group dissappeared, select a new one.
	if (!Sonos.grouping[Sonos.currentState.selectedZone]) {
		// just get first zone available
		for (var uuid in Sonos.grouping) {
			Sonos.currentState.selectedZone = uuid;
			break;
		}
		// we need queue as well!
		Socket.socket.emit('queue', {uuid:Sonos.currentState.selectedZone});
		shouldRenderVolumes = true;
	}

	if (Socket.topologyChanged instanceof Function) Socket.topologyChanged(shouldRenderVolumes);
});

Socket.socket.on('transport-state', function (player) {
	player.stateTime = new Date().valueOf();
	Sonos.players[player.uuid] = player;

	if (Socket.transportStateChanged instanceof Function) Socket.transportStateChanged(player);

});

Socket.socket.on('group-volume', function (data) {

	Sonos.players[data.uuid].groupState.volume = data.groupState.volume;

	if (Socket.groupVolumeChanged instanceof Function) Socket.groupVolumeChanged(data);
});

Socket.socket.on('group-mute', function (data) {
	Sonos.players[data.uuid].groupState = data.state;
	if (Socket.groupMuteChanged instanceof Function) Socket.groupMuteChanged(data);
});

Socket.socket.on('mute', function (data) {
	var player = Sonos.players[data.uuid];
	player.state.mute = data.state.mute;
	if (Socket.muteChanged instanceof Function) Socket.muteChanged(data);
});

Socket.socket.on('favorites', function (data) {
	if (Socket.favoritesChanged instanceof Function) Socket.favoritesChanged(data);
});

Socket.socket.on('queue', function (data) {
	if (Socket.queueChanged instanceof Function) Socket.queueChanged(data);
});