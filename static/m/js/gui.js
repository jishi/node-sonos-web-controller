"use strict";
var GUI = {
	updateCurrentStatus: function () {
		var selectedZone = Sonos.currentZoneCoordinator();
		document.getElementById("current-track-art").src =  selectedZone.state.currentTrack.albumArtURI;
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