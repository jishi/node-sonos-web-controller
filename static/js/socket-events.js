"use strict";
///
/// socket events
///
socket.on('topology-change', function (data) {
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
		socket.emit('queue', {uuid:Sonos.currentState.selectedZone});
		shouldRenderVolumes = true;
	}

	if (shouldRenderVolumes) renderVolumes();

	reRenderZones();
	updateControllerState();
	updateCurrentStatus();
});

socket.on('transport-state', function (player) {
	player.stateTime = new Date().valueOf();
	Sonos.players[player.uuid] = player;
	reRenderZones();
	var selectedZone = Sonos.currentZoneCoordinator();
	console.log(selectedZone)
	updateControllerState();
	updateCurrentStatus();

});

socket.on('group-volume', function (data) {

	Sonos.players[data.uuid].groupState.volume = data.groupState.volume;
	if (data.uuid == Sonos.currentState.selectedZone) {
		GUI.masterVolume.setVolume(data.groupState.volume);
	}
	for (var uuid in data.playerVolumes) {
		Sonos.players[data.uuid].state.volume = data.playerVolumes[uuid];
		GUI.playerVolumes[uuid].setVolume(data.playerVolumes[uuid]);
	}
});

socket.on('group-mute', function (data) {
	Sonos.players[data.uuid].groupState = data.state;
	updateControllerState();
});

socket.on('mute', function (data) {
	var player = Sonos.players[data.uuid];
	player.state.mute = data.state.mute;
	document.getElementById("mute-" + player.uuid).src = data.state.mute ? 'svg/mute_on.svg' : 'svg/mute_off.svg';
});

socket.on('favorites', function (data) {
	renderFavorites(data);
});

socket.on('queue', function (data) {
	console.log("received queue", data.uuid);
	if (data.uuid != Sonos.currentState.selectedZone) return;
	renderQueue(data.queue);
});