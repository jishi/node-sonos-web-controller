document.getElementById('play-pause').addEventListener('click', function () {

	var action;
	// Find state of current player
	var player = Sonos.currentZoneCoordinator();
	if (player.state.zoneState == "PLAYING" ) {
		action = 'pause';
	} else {
		action = 'play';
	}

	console.log(action, Sonos.currentState)
	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.getElementById('next').addEventListener('click', function () {
	var action = "nextTrack";
	console.log(action, Sonos.currentState)
	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});
document.getElementById('prev').addEventListener('click', function () {
	var action = "previousTrack";
	console.log(action, Sonos.currentState)
	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.getElementById('master-volume').addEventListener('click', function (e) {
	var playerContainer = document.getElementById("player-volumes-container");
	if (playerContainer.classList.contains('show')) {
		playerContainer.classList.remove("show");
	} else {
		playerContainer.classList.add("show");
	}

});


