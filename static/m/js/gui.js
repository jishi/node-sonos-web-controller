"use strict";
var GUI = {
	masterVolume: new TouchVolumeSlider(document.getElementById('master-volume'), function (volume) {
		Socket.socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: volume});
	}),
	playerVolumes: {},
	updateCurrentStatus: function () {
		var selectedZone = Sonos.currentZoneCoordinator();

		// Try and fetch high-res coverart.
		var currentTrackArt = document.getElementById("current-track-art");

		if (/^x-sonos-spotify:spotify%3atrack%3a(.+)\?/.test(selectedZone.state.currentTrack.uri)) {
			var spotifyUri = RegExp.$1;
			if (currentTrackArt.dataset.spotifyUri != spotifyUri) {
				HTTP.request("https://api.spotify.com/v1/tracks/" + RegExp.$1, function (res) {
					// new coverart
					var url = res.album.images[0].url;
					console.log(url);
					currentTrackArt.src = url;
					// to identify if this is already loaded
					currentTrackArt.dataset.spotifyUri = spotifyUri;
				});
			}
		} else {
			currentTrackArt.src =  selectedZone.state.currentTrack.albumArtURI;
		}
		//document.getElementById('page-title').textContent = selectedZone.state.currentTrack.title + ' - Sonos Web Controller';
		document.getElementById("track").textContent = selectedZone.state.currentTrack.title;
		document.getElementById("artist").textContent = selectedZone.state.currentTrack.artist;
		document.getElementById("album").textContent = selectedZone.state.currentTrack.album;

		if (selectedZone.state.nextTrack) {
			var nextTrack = selectedZone.state.nextTrack;
			document.getElementById("next-track").textContent = nextTrack.title + " - " + nextTrack.artist;
		}

		var state = selectedZone.state.zoneState;
		var playPauseButton = document.getElementById('play-pause');

		if (state == "PLAYING") {
			playPauseButton.src = '/svg/pause.svg';
		} else {
			playPauseButton.src = '/svg/play.svg';
		}

		GUI.masterVolume.setVolume(selectedZone.groupState.volume);

		//var repeat = document.getElementById("repeat");
		//if (selectedZone.playMode.repeat) {
		//	repeat.src = repeat.src.replace(/_off\.png/, "_on.png");
		//} else {
		//	repeat.src = repeat.src.replace(/_on\.png/, "_off.png");
		//}
//
//		//var shuffle = document.getElementById("shuffle");
//		//if (selectedZone.playMode.shuffle) {
//		//	shuffle.src = shuffle.src.replace(/_off\.png/, "_on.png");
//		//} else {
//		//	shuffle.src = shuffle.src.replace(/_on\.png/, "_off.png");
//		//}
//
//		//var crossfade = document.getElementById("crossfade");
//		//if (selectedZone.playMode.crossfade) {
//		//	crossfade.src = crossfade.src.replace(/_off\.png/, "_on.png");
//		//} else {
//		//	crossfade.src = crossfade.src.replace(/_on\.png/, "_off.png");
		//}


		// GUI.progress.update(selectedZone);
	},
	renderVolumes: function () {
		var oldWrapper = document.getElementById('player-volumes');
		var newWrapper = oldWrapper.cloneNode(false);
		var masterVolume = document.getElementById('master-volume');
		//var masterMute = document.getElementById('master-mute');

		var playerNodes = [];

		for (var i in Sonos.players) {
			var player = Sonos.players[i];
			var playerVolumeBar = masterVolume.cloneNode(true);
			var playerVolumeBarContainer = document.createElement('div');
			playerVolumeBarContainer.id = "volume-" + player.uuid;
			playerVolumeBar.id = "";
			playerVolumeBar.dataset.uuid = player.uuid;
			var playerName = document.createElement('h6');
			//var playerMute = masterMute.cloneNode(true);
			//playerMute.id = "mute-" + player.uuid;
			//playerMute.className = "mute-button";
			//playerMute.src = player.state.mute ? "/svg/mute_on.svg" : "/svg/mute_off.svg";
			//playerMute.dataset.id = player.uuid;
			playerName.textContent = player.roomName;
			playerVolumeBarContainer.appendChild(playerName);
			//playerVolumeBarContainer.appendChild(playerMute);
			playerVolumeBarContainer.appendChild(playerVolumeBar);
			newWrapper.appendChild(playerVolumeBarContainer);
			playerNodes.push({uuid: player.uuid, node: playerVolumeBar});
		}

		oldWrapper.parentNode.replaceChild(newWrapper, oldWrapper);

		// They need to be part of DOM before initialization
		playerNodes.forEach(function (playerPair) {
			var uuid = playerPair.uuid;
			var node = playerPair.node;
			GUI.playerVolumes[uuid] = new TouchVolumeSlider(node, function (vol) {
				Socket.socket.emit('volume', {uuid: uuid, volume: vol});
			});

			console.log(uuid, Sonos.players[uuid].state.volume);

			GUI.playerVolumes[uuid].setVolume(Sonos.players[uuid].state.volume);
		});
	}
};

var HTTP = {
	request: function (url, callback) {
		var httpRequest = new XMLHttpRequest();
		httpRequest.onreadystatechange = function () {
			if (httpRequest.readyState !== 4) return;
			if (httpRequest.status === 200) {
				// success
				var responseJSON = JSON.parse(httpRequest.responseText);
				callback(responseJSON);
				return;
			}

			throw "Error";
		}
		httpRequest.open("GET", url);
		httpRequest.send(null);
	}
}