"use strict";
var GUI = {
	masterVolume: new TouchVolumeSlider(document.getElementById('master-volume'), function (volume) {
		Socket.socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: volume});
	}),
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