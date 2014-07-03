function TouchVolumeSlider(containerObj, callback) {
	var state = {
		cursorX: 0,
		originalX: 0,
		maxX: 0,
		currentX: 0,
		slider: null,
		tooltip: null,
		volume: 0,
		disableUpdate: false,
		numberOfTouches: 0,
		disableTimer: null
	};

	function setVolume(volume) {
		// calculate a pixel offset based on percentage
		if (state.volume == volume) return;
		setScrubberPosition(volume);
		if (typeof callback == "function")
			callback(volume);
	}

	function setScrubberPosition(volume) {
		var offset = Math.round(state.maxX * volume / 100);
		state.currentX = offset;
		state.slider.style.marginLeft = offset + 'px';
		state.tooltip.style.marginLeft = offset + 'px';
		state.tooltip.textContent = volume;
		state.volume = volume;
	}

	function handleVolumeWheel(e) {
		var newVolume;
		if(e.deltaY > 0) {
			// volume down
			newVolume = state.volume - 2;
		} else {
			// volume up
			newVolume = state.volume + 2;
		}
		if (newVolume < 0) newVolume = 0;
		if (newVolume > 100) newVolume = 100;

		setVolume( newVolume );
		clearTimeout(state.disableTimer);
		state.disableUpdate = true;
		state.disableTimer = setTimeout(function () {state.disableUpdate = false}, 800);

		//socket.emit('group-volume', {uuid: Sonos.currentState.selectedZone, volume: newVolume});
		//newVolume = Sonos.currentZoneCoordinator().groupState.volume = newVolume;


	}

	function handleClick(e) {
		// Be able to cancel this from a callback if necessary
		if (typeof clickCallback == "function" && clickCallback(this) == false) return;

		if (e.target.tagName == "IMG") return;

		var newVolume;
		if(e.layerX < state.currentX) {
			// volume down
			newVolume = state.volume - 2;
		} else {
			// volume up
			newVolume = state.volume + 2;
		}

		if (newVolume < 0) newVolume = 0;
		if (newVolume > 100) newVolume = 100;

		setVolume(newVolume);
		clearTimeout(state.disableTimer);
		state.disableUpdate = true;
		state.disableTimer = setTimeout(function () {state.disableUpdate = false}, 800);
	}

	function onDrag(multi) {
		var e = multi.touches[0];
		var deltaX = (e.clientX - state.cursorX) * 0.25;
		var nextX = state.originalX + deltaX;

		if ( nextX > state.maxX ) nextX = state.maxX;
		else if ( nextX < 1) nextX = 1;

		// calculate percentage
		var volume = Math.floor(nextX / state.maxX * 100);
		setVolume(volume);
	}

	var sliderWidth = containerObj.clientWidth;
	state.maxX = sliderWidth - 21;
	state.slider = containerObj.querySelector('.scrubber');
	state.tooltip = containerObj.querySelector('.tooltip');

	containerObj.addEventListener('touchstart', function (multi) {
		state.numberOfTouches++;
		var e = multi.touches[0];
		state.cursorX = e.clientX;
		state.originalX = state.currentX;
		clearTimeout(state.disableTimer);
		state.disableUpdate = true;
		state.tooltip.classList.add("show");
		document.addEventListener('touchmove', onDrag);
		multi.preventDefault();
	});

	document.addEventListener('touchend', function () {
		state.numberOfTouches--;
		if (state.numberOfTouches > 0) return;
		state.tooltip.classList.remove("show");
		document.removeEventListener('touchmove', onDrag);
		state.currentX = state.slider.offsetLeft;
		state.disableTimer = setTimeout(function () { state.disableUpdate = false }, 800);
	});

	// Since Chrome 31 wheel event is also supported
	//containerObj.addEventListener("wheel", handleVolumeWheel);

	// For click-to-adjust
	//containerObj.addEventListener("click", handleClick);



	// Add some functions to go
	this.setVolume = function (volume) {
		if (state.disableUpdate) return;
		setScrubberPosition(volume);
	}

	return this;
}