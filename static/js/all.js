"use strict";

Socket.topologyChanged = function (shouldRenderVolumes) {
	if (shouldRenderVolumes) renderVolumes();

	reRenderZones();
	updateControllerState();
	updateCurrentStatus();
}

Socket.transportStateChanged = function (player) {
	reRenderZones();
	updateControllerState();
	updateCurrentStatus();
}

Socket.groupVolumeChanged = function (data) {
	if (data.uuid == Sonos.currentState.selectedZone) {
		GUI.masterVolume.setVolume(data.groupState.volume);
	}
	for (var uuid in data.playerVolumes) {
		Sonos.players[data.uuid].state.volume = data.playerVolumes[uuid];
		GUI.playerVolumes[uuid].setVolume(data.playerVolumes[uuid]);
	}
}

Socket.groupMuteChanged = function (data) {
	updateControllerState();
}

Socket.muteChanged = function (data) {
	document.getElementById("mute-" + data.uuid).src = data.state.mute ? 'svg/mute_on.svg' : 'svg/mute_off.svg';
}

Socket.favoritesChanged = function (data) {
	renderFavorites(data);
}

Socket.queueChanged = function (data) {
	if (data.uuid != Sonos.currentState.selectedZone) return;
	renderQueue(data.queue);
}

Socket.searchResultReceived = function (data) {
	renderSearchResult(data);
}

///
/// ACTIONS
///

function updateCurrentStatus() {
	var selectedZone = Sonos.currentZoneCoordinator();

	document.getElementById('page-title').textContent = selectedZone.state.currentTrack.title + ' - Sonos Web Controller';

	var prefix = (window.location.pathname != '/') ? window.location.pathname : ''
	if (selectedZone.state.currentTrack.type == 'radio') {
		// update radio
		document.getElementById("current-radio-art").src = prefix + selectedZone.state.currentTrack.albumArtURI;
		document.getElementById("station").textContent = selectedZone.state.currentTrack.title;
		document.getElementById("information").textContent = selectedZone.state.currentTrack.streamInfo;
		document.getElementById("status-container").className = "radio";

	} else {
		document.getElementById("current-track-art").src = prefix + selectedZone.state.currentTrack.albumArtURI;
		document.getElementById("track").textContent = selectedZone.state.currentTrack.title;
		document.getElementById("artist").textContent = selectedZone.state.currentTrack.artist;
		document.getElementById("album").textContent = selectedZone.state.currentTrack.album;

		if (selectedZone.state.nextTrack) {
			var nextTrack = selectedZone.state.nextTrack;
			document.getElementById("next-track").textContent = nextTrack.title + " - " + nextTrack.artist;
		}
		document.getElementById("status-container").className = "track";
	}

	console.log(selectedZone)

	var repeat = document.getElementById("repeat");
	if (selectedZone.playMode.repeat) {
		repeat.src = repeat.src.replace(/_off\.png/, "_on.png");
	} else {
		repeat.src = repeat.src.replace(/_on\.png/, "_off.png");
	}

	var shuffle = document.getElementById("shuffle");
	if (selectedZone.playMode.shuffle) {
		shuffle.src = shuffle.src.replace(/_off\.png/, "_on.png");
	} else {
		shuffle.src = shuffle.src.replace(/_on\.png/, "_off.png");
	}

	var crossfade = document.getElementById("crossfade");
	if (selectedZone.playMode.crossfade) {
		crossfade.src = crossfade.src.replace(/_off\.png/, "_on.png");
	} else {
		crossfade.src = crossfade.src.replace(/_on\.png/, "_off.png");
	}


	GUI.progress.update(selectedZone);
}

function updateControllerState() {
	var currentZone = Sonos.currentZoneCoordinator();
	var state = currentZone.state.zoneState;
	var playPause = document.getElementById('play-pause');

	if (state == 'PLAYING') {
		playPause.className = 'pause';
	} else {
		playPause.className = 'play';
	}



	// Fix volume
	GUI.masterVolume.setVolume(currentZone.groupState.volume);

	// fix mute
	var masterMute = document.getElementById('master-mute');
	if (currentZone.groupState.mute) {
		masterMute.src = "svg/mute_on.svg";
	} else {
		masterMute.src = "svg/mute_off.svg";
	}

	// fix volume container

	var allVolumes = {};
	for (var uuid in Sonos.players) {
		// is this in group?
		allVolumes[uuid] = null;
	}

	Sonos.grouping[Sonos.currentState.selectedZone].forEach(function (uuid) {
		document.getElementById("volume-" + uuid).classList.remove("hidden");
		delete allVolumes[uuid];
	});

	// now, hide the ones left
	for (var uuid in allVolumes) {
		document.getElementById("volume-" + uuid).classList.add("hidden");
	}

}

function toFormattedTime(seconds) {
		var chunks = [];
		var modulus = [60^2, 60];
		var remainingTime = seconds;
		// hours
		var hours = Math.floor(remainingTime/3600);

		if (hours > 0) {
			chunks.push(zpad(hours, 1));
			remainingTime -= hours * 3600;
		}

		// minutes
		var minutes = Math.floor(remainingTime/60);
		// If we have hours, pad minutes, otherwise not.
		var padding = chunks.length > 0 ? 2 : 1;
		chunks.push(zpad(minutes, padding));
		remainingTime -= minutes * 60;
		// seconds
		chunks.push(zpad(Math.floor(remainingTime), 2))
		return chunks.join(':');
}

function zpad(number, width) {
	var str = number + "";
	if (str.length >= width) return str;
	var padding = new Array(width - str.length + 1).join('0');
	return padding + str;
}





var zoneManagement = function() {

	var dragItem;

	function findZoneNode(currentNode) {
		// If we are at top level, abort.
		if (currentNode == this) return;
		if (currentNode.tagName == "UL") return currentNode;
		return findZoneNode(currentNode.parentNode);
	}

	function handleDragStart(e) {
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/html', e.target.innerHTML);
		dragItem = e.target;
		dragItem.classList.add('drag');
	}

	function handleDragEnd(e) {
		dragItem.classList.remove('drag');
	}

	function handleDrop(e) {
		if (e.target == this) {
			// detach
			console.log("detach");
			Socket.socket.emit('group-management', {player: dragItem.dataset.id, group: null});
			return;
		}

		var zone = findZoneNode(e.target);
		if (!zone || zone == this.parentNode) return;

		console.log(dragItem.dataset.id, zone.id);
		Socket.socket.emit('group-management', {player: dragItem.dataset.id, group: zone.id});

	}

	function handleDragOver(e) {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';

	}

	document.getElementById('zone-container').addEventListener('dragstart', handleDragStart);
	document.getElementById('zone-container').addEventListener('dragend', handleDragEnd);
	document.getElementById('zone-container').addEventListener('dragover', handleDragOver);
	document.getElementById('zone-container').addEventListener('drop', handleDrop);

}();

function renderVolumes() {
	var oldWrapper = document.getElementById('player-volumes');
	var newWrapper = oldWrapper.cloneNode(false);
	var masterVolume = document.getElementById('master-volume');
	var masterMute = document.getElementById('master-mute');

	var playerNodes = [];

	for (var i in Sonos.players) {
		var player = Sonos.players[i];
		var playerVolumeBar = masterVolume.cloneNode(true);
		var playerVolumeBarContainer = document.createElement('div');
		playerVolumeBarContainer.id = "volume-" + player.uuid;
		playerVolumeBar.id = "";
		playerVolumeBar.dataset.uuid = player.uuid;
		var playerName = document.createElement('h6');
		var playerMute = masterMute.cloneNode(true);
		playerMute.id = "mute-" + player.uuid;
		playerMute.className = "mute-button";
		playerMute.src = player.state.mute ? "/svg/mute_on.svg" : "/svg/mute_off.svg";
		playerMute.dataset.id = player.uuid;
		playerName.textContent = player.roomName;
		playerVolumeBarContainer.appendChild(playerName);
		playerVolumeBarContainer.appendChild(playerMute);
		playerVolumeBarContainer.appendChild(playerVolumeBar);
		newWrapper.appendChild(playerVolumeBarContainer);
		playerNodes.push({uuid: player.uuid, node: playerVolumeBar});
	}

	oldWrapper.parentNode.replaceChild(newWrapper, oldWrapper);

	// They need to be part of DOM before initialization
	playerNodes.forEach(function (playerPair) {
		var uuid = playerPair.uuid;
		var node = playerPair.node;
		GUI.playerVolumes[uuid] = new VolumeSlider(node, function (vol) {
			Socket.socket.emit('volume', {uuid: uuid, volume: vol});
		});

		console.log(uuid, Sonos.players[uuid].state.volume);

		GUI.playerVolumes[uuid].setVolume(Sonos.players[uuid].state.volume);
	});

	newWrapper.classList.add('hidden');
	newWrapper.classList.remove('loading');
}

function reRenderZones() {
	var oldWrapper = document.getElementById('zone-wrapper');
	var newWrapper = oldWrapper.cloneNode(false);

	for (var groupUUID in Sonos.grouping) {
		var ul = document.createElement('ul');
		ul.id = groupUUID;

		if (ul.id == Sonos.currentState.selectedZone)
			ul.className = "selected";

		Sonos.grouping[groupUUID].forEach(function (playerUUID) {
			var player = Sonos.players[playerUUID];
			var li = document.createElement('li');
			var span = document.createElement('span');
			span.textContent = player.roomName;
			li.appendChild(span);
			li.draggable = true;
			li.dataset.id = playerUUID;
			ul.appendChild(li);
		});

		newWrapper.appendChild(ul);
	}
	oldWrapper.parentNode.replaceChild(newWrapper, oldWrapper);
}

function renderFavorites(favorites) {
	var oldContainer = document.getElementById('favorites-container');
	var newContainer = oldContainer.cloneNode(false);

	var i = 0;

	favorites.forEach(function (favorite) {
		var li = document.createElement('li');
		li.dataset.title = favorite.title;
		var span = document.createElement('span');
		span.textContent = favorite.title;
		var albumArt = document.createElement('img');
		albumArt.addEventListener('error', imageErrorHandler);
		albumArt.src = favorite.albumArtURI;
		li.appendChild(albumArt);
		li.appendChild(span);
		li.tabIndex = i++;
		newContainer.appendChild(li);
	});


	oldContainer.parentNode.replaceChild(newContainer, oldContainer);
}

function imageErrorHandler() {
	this.removeEventListener('error', imageErrorHandler);
	this.src = "/images/browse_missing_album_art.png";
}

function renderQueue(queue) {
	var tempContainer = document.createDocumentFragment();
	var trackIndex = queue.startIndex + 1;
	var scrollTimeout;

	queue.items.forEach(function (q) {
		var li = document.createElement('li');
		li.dataset.title = q.uri;
		li.dataset.trackNo = trackIndex++;
		li.tabIndex = trackIndex;

		var albumArt = document.createElement('img');
		var prefix = (window.location.pathname != '/') ? window.location.pathname : ''
		albumArt.dataset.src = prefix + q.albumArtURI;
		if (trackIndex < 20) {
			albumArt.src = prefix + q.albumArtURI;
			albumArt.className = "loaded";
		}

		li.appendChild(albumArt);

		var trackInfo = document.createElement('div');
		var title = document.createElement('p');
		title.className = 'title';
		title.textContent = q.title;
		trackInfo.appendChild(title);
		var artist = document.createElement('p');
		artist.className = 'artist';
		artist.textContent = q.artist;
		trackInfo.appendChild(artist);

		li.appendChild(trackInfo);
		tempContainer.appendChild(li);
	});

	var oldContainer = document.getElementById('queue-container');
	if (queue.startIndex == 0) {
		// This is a new queue
		var newContainer = oldContainer.cloneNode(false);
		newContainer.addEventListener('scroll', function (e) {
			clearTimeout(scrollTimeout);
			var _this = this;
			scrollTimeout = setTimeout(function () {
				lazyLoadImages(_this);
			},150);

		});
		newContainer.appendChild(tempContainer);
		oldContainer.parentNode.replaceChild(newContainer, oldContainer);
	} else {
		// This should be added! we assume they come in the correct order
		oldContainer.appendChild(tempContainer);

	}
}

function lazyLoadImages(container) {
	// Find elements that are in viewport
	var containerViewport = container.getBoundingClientRect();
	// best estimate of starting point
	var trackHeight = container.firstChild.scrollHeight;

	// startIndex
	var startIndex = Math.floor(container.scrollTop / trackHeight);
	var currentNode = container.childNodes[startIndex];

	while (currentNode && currentNode.getBoundingClientRect().top < containerViewport.bottom) {
		var img = currentNode.firstChild;
		currentNode = currentNode.nextSibling;
		if (img.className == 'loaded') {
			continue;
		}

		// get image
		img.src = img.dataset.src;
		img.className = 'loaded';

	}
}

function renderSearchResult(result) {

}

