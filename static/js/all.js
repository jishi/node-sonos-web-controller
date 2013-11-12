"use strict";

var Sonos = {
	currentState: {
		selectedZone: null,
		zoneInfo: null
	},
	grouping: {},
	players: {},
	positionInterval: null,
	groupVolume: {
		disableUpdate: false,
		disableTimer: null
	},
	currentZoneCoordinator: function () {
		return Sonos.players[Sonos.currentState.selectedZone];
	}
};

///
/// GUI Init
///

var GUI = {
	masterVolume: new VolumeSlider(document.getElementById('master-volume'), function (volume) {
			socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: volume});
		})
};

///
/// socket events
///
socket.on('topology-change', function (data) {
	Sonos.grouping = {};
	var stateTime = new Date().valueOf();
	data.forEach(function (player) {
		player.stateTime = stateTime;
		Sonos.players[player.uuid] = player;
		if (!Sonos.grouping[player.coordinator]) Sonos.grouping[player.coordinator] = [];
		Sonos.grouping[player.coordinator].push(player.uuid);

		// pre select a group
		if (!Sonos.currentState.selectedZone) {
			Sonos.currentState.selectedZone = player.coordinator;
		}
	});

	console.log(Sonos.grouping, Sonos.players);

	reRenderZones();
	updateControllerState();
	updateCurrentStatus();
});

socket.on('transport-state', function (player) {
	console.log(player);
	player.stateTime = new Date().valueOf();
	Sonos.players[player.uuid] = player;
	reRenderZones();
	var selectedZone = Sonos.currentZoneCoordinator();
	console.log(selectedZone)
	updateControllerState();
	updateCurrentStatus();

});

socket.on('group-volume', function (data) {
	if (Sonos.groupVolume.disableUpdate) return;
	Sonos.players[data.uuid].groupState.volume = data.state.volume;
	if (data.uuid != Sonos.currentState.selectedZone) return;
	GUI.masterVolume.setVolume(data.state.volume);
});

///
/// GUI events
///

document.getElementById('zone-container').addEventListener('click', function (e) {
	// Find the actual UL
	function findZoneNode(currentNode) {
		// If we are at top level, abort.
		if (currentNode == this) return;
		if (currentNode.tagName == "UL") return currentNode;
		return findZoneNode(currentNode.parentNode);
	}

	var zone = findZoneNode(e.target);

	if (!zone) return;

	var previousZone = document.getElementById(Sonos.currentState.selectedZone);
	if (previousZone) previousZone.classList.remove('selected');

	Sonos.currentState.selectedZone = zone.id;
	zone.classList.add('selected');
	// Update controls with status

	updateControllerState();
	updateCurrentStatus();



}, true);

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
	socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});

document.getElementById('next').addEventListener('click', function () {
	var action = "nextTrack";
	console.log(action, Sonos.currentState)
	socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});
document.getElementById('prev').addEventListener('click', function () {
	var action = "previousTrack";
	console.log(action, Sonos.currentState)
	socket.emit('transport-state', { uuid: Sonos.currentState.selectedZone, state: action });
});



function updateCurrentStatus() {
	var selectedZone = Sonos.currentZoneCoordinator();
	console.log("updating current", selectedZone)
	document.getElementById("track").textContent = selectedZone.state.currentTrack.title;
	document.getElementById("artist").textContent = selectedZone.state.currentTrack.artist;
	document.getElementById("album").textContent = selectedZone.state.currentTrack.album;

	if (selectedZone.state.nextTrack) {
		var nextTrack = selectedZone.state.nextTrack;
		document.getElementById("next-track").textContent = nextTrack.title + " - " + nextTrack.artist;
	}

	console.log(selectedZone)

	var repeat = document.getElementById("repeat");
	if (selectedZone.playMode == 1 || selectedZone.playMode == 3) {
		repeat.src = repeat.src.replace("off", "on");
	} else {
		repeat.src = repeat.src.replace("on", "off");
	}

	var shuffle = document.getElementById("shuffle");
	if (selectedZone.playMode == 2 || selectedZone.playMode == 3) {
		shuffle.src = shuffle.src.replace("off", "on");
	} else {
		shuffle.src = shuffle.src.replace("on", "off");
	}

	var crossfade = document.getElementById("crossfade");
	if (selectedZone.crossfade == "1") {
		crossfade.src = crossfade.src.replace("off", "on");
	} else {
		crossfade.src = crossfade.src.replace("on", "off");
	}


	clearInterval(Sonos.positionInterval);

	if (selectedZone.state.zoneState == "PLAYING")
		Sonos.positionInterval = setInterval(updatePosition, 500);

	updatePosition();
}

function updatePosition() {
	var selectedZone = Sonos.currentZoneCoordinator();
	var elapsedMillis = selectedZone.state.elapsedTime*1000 + (new Date().valueOf() - selectedZone.stateTime);

	var elapsed = Math.floor(elapsedMillis/1000);
	document.getElementById("countup").textContent = toFormattedTime(elapsed);
	var remaining = selectedZone.state.currentTrack.duration - elapsed;
	document.getElementById("countdown").textContent = "-" + toFormattedTime(remaining);
	var positionPercent = elapsedMillis / (selectedZone.state.currentTrack.duration*1000)*100;
	setPositionPercent(positionPercent);
}

function updateControllerState() {
	var currentZone = Sonos.currentZoneCoordinator();
	var state = currentZone.state.zoneState;
	var playPauseButton = document.getElementById('play-pause');

	if (state == "PLAYING") {
		playPauseButton.src = '/images/pause_normal.png';
	} else {
		playPauseButton.src = '/images/play_normal.png';
	}

	// Fix volume
	GUI.masterVolume.setVolume(currentZone.groupState.volume);
}

// Update position
function setPositionPercent(percent) {
	// 0-100
	var positionBar = document.getElementById("position-bar");
	var positionScrubber = document.getElementById("position-bar-scrubber");

	// total width
	var allowedWidth = positionBar.clientWidth - 5;

	// calculate offset
	var offset = Math.round(allowedWidth * percent / 100);

	positionScrubber.style.marginLeft = offset + "px";

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
		chunks.push(zpad(minutes, 1));
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

function VolumeSlider(containerObj, callback) {
	var state = {
		originalX: 0,
		maxX: 0,
		currentX: 0,
		slider: null,
		volume: 0,
		disableUpdate: false,
		disableTimer: null
	};

	function setVolume(volume) {
		// calculate a pixel offset based on percentage
		var offset = Math.round(state.maxX * volume / 100);
		state.currentX = offset;
		state.slider.style.marginLeft = offset + 'px';
	}

	function handleVolumeWheel(e) {
		var newVolume;
		if(e.deltaY > 0) {
			// volume down
			newVolume = Sonos.currentZoneCoordinator().groupState.volume - 2;
		} else {
			// volume up
			newVolume = Sonos.currentZoneCoordinator().groupState.volume + 2;
		}
		clearTimeout(Sonos.groupVolume.disableTimer);
		Sonos.groupVolume.disableUpdate = true;
		Sonos.groupVolume.disableTimer = setTimeout(function () {Sonos.groupVolume.disableUpdate = false}, 800);
		socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: newVolume});
		newVolume = Sonos.currentZoneCoordinator().groupState.volume = newVolume;
		GUI.masterVolume.setVolume( newVolume );

	}

	function handleClick(e) {
		if (e.target.tagName == "IMG") return;

		var newVolume;
		if(e.layerX < state.currentX) {
			// volume down
			newVolume = Sonos.currentZoneCoordinator().groupState.volume - 2;
		} else {
			// volume up
			newVolume = Sonos.currentZoneCoordinator().groupState.volume + 2;
		}
		clearTimeout(state.disableTimer);
		setVolume(newVolume);
		Sonos.currentZoneCoordinator().groupState.volume = newVolume;
		state.disableUpdate = true;
		callback(newVolume);
		state.disableTimer = setTimeout(function () { state.disableUpdate = false }, 1500);

	}

	function onDrag(e) {
		var deltaX = e.clientX - state.originalX;
		var nextX = state.currentX + deltaX;

		if ( nextX > state.maxX ) nextX = state.maxX;
		else if ( nextX < 1) nextX = 1;

		state.slider.style.marginLeft = nextX + 'px';

		// calculate percentage
		var volume = Math.floor(nextX / state.maxX * 100);
		if (volume != state.volume && callback) {
			callback(state.volume);
		}
		state.volume = volume;
	}

	var sliderWidth = containerObj.clientWidth;
	state.maxX = sliderWidth - 21;
	state.slider = containerObj.querySelector('img');
	state.currentX = state.slider.offsetLeft;

	state.slider.addEventListener('mousedown', function (e) {
		state.originalX = e.clientX;
		clearTimeout(state.disableTimer);
		state.disableUpdate = true;
		document.addEventListener('mousemove', onDrag);
		e.preventDefault();
	});

	document.addEventListener('mouseup', function () {
		document.removeEventListener('mousemove', onDrag);
		state.currentX = state.slider.offsetLeft;
		state.disableTimer = setTimeout(function () { state.disableUpdate = false }, 800);
	});

	// For chrome
	containerObj.addEventListener("mousewheel", handleVolumeWheel);

	// For Firefox
	containerObj.addEventListener("wheel", handleVolumeWheel);

	// For click-to-adjust
	containerObj.addEventListener("click", handleClick);



	// Add some functions to go
	this.setVolume = function (volume) {
		if (state.disableUpdate) return;
		setVolume(volume);
	}

	return this;
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
			socket.emit('group-management', {player: dragItem.dataset.id, group: null});
			return;
		}

		var zone = findZoneNode(e.target);
		if (!zone || zone == this.parentNode) return;

		console.log(dragItem.dataset.id, zone.id);
		socket.emit('group-management', {player: dragItem.dataset.id, group: zone.id});

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