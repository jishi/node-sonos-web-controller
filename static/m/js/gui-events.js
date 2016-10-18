document.getElementById('play-pause').addEventListener('click', function () {

	var action;
	// Find state of current player
	var player = Sonos.currentZoneCoordinator();
	if (player.state.playbackState == 'PLAYING' ) {
		action = 'pause';
	} else {
		action = 'play';
	}

	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.getElementById('next').addEventListener('click', function () {
	var action = "nextTrack";
	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});
document.getElementById('prev').addEventListener('click', function () {
	var action = 'previousTrack';
	Socket.socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.addEventListener('click', function (e) {

	var playerContainer = document.getElementById('player-volumes-container');
	// if click is inside this node, do nothing
	if (isChildOf(e.target, playerContainer)) {
		return;
	}


	if (playerContainer.classList.contains('show')) {
		playerContainer.classList.remove('show');
	} else if (isChildOf(e.target, document.getElementById('master-volume'))) {
		playerContainer.classList.add('show');
	}
});

function isChildOf(child, parent) {
	if (child == parent) return true;
	if (child.parentNode)
		return isChildOf(child.parentNode, parent);

	return false;
}


