"use strict";
var GUI = {
	masterVolume: new VolumeSlider(document.getElementById('master-volume'), function (volume) {
			Socket.socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: volume});
		}, function (obj) {
			// this logic controls show/hide of the individual volume controls
			var playerVolumesNode = document.getElementById('player-volumes');
			if (playerVolumesNode.classList.contains('hidden')) {
				playerVolumesNode.classList.remove('hidden');
				playerVolumesNode.classList.add('visible');
				document.addEventListener('click', function hideVolume(e) {
					// ignore the master volume
					if (e.target == obj) return;
					var playerVolumeContainer = document.getElementById('player-volumes');
					function isChildOf(child) {
						// ignore master volume elements
						if (child == obj) return true;
						// ignore player volume container
						if (child == playerVolumeContainer) return true;
						if (child == document) return false;
						return isChildOf(child.parentNode);
					}
					// and the playerVolume
					if (isChildOf(e.target)) return;

					// This is a random click, hide it and remove the container
					playerVolumesNode.classList.add('hidden');
					playerVolumesNode.classList.remove('visible');
					document.removeEventListener('click', hideVolume);

				});
				return false;
			}
			return true;
		}),
	playerVolumes: {},
	progress: new ProgressBar(document.getElementById('position-bar'), function (position) {
		// calculate new time
		var player = Sonos.currentZoneCoordinator();
		console.log(player.state)
		var desiredElapsed = Math.round(player.state.currentTrack.duration * position);
		player.state.elapsedTime = desiredElapsed;
		Socket.socket.emit('track-seek', {uuid: player.uuid, elapsed: desiredElapsed});
	})
};