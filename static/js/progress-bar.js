function ProgressBar(containerObj, callback) {
	var state = {
		cursorX: 0,
		originalX: 0,
		maxX: 0,
		currentX: 0,
		slider: null,
		progress: 0,
		slideInProgress: false,
		elapsed: 0,
		duration: 0,
		lastUpdate: 0,
		zoneState: "STOPPED",
		hasBeenDragged: false
	};

	var progressAdjustTimer, tickerInterval;

	// Update position
	this.setPosition = function (position) {
		if (state.slideInProgress) return;
		setPosition(position);
	}

	this.update = function (selectedZone) {

		state.elapsed = selectedZone.state.elapsedTime;
		state.duration = selectedZone.state.currentTrack.duration;
		state.lastUpdate = selectedZone.stateTime;
		state.zoneState = selectedZone.state.zoneState;

		clearInterval(tickerInterval);

		console.log(state)

		if (state.zoneState == "PLAYING")
			tickerInterval = setInterval(updatePosition, 500);

		updatePosition();
	}

	function updatePosition(force) {
		if (state.slideInProgress && !force) return;
		var elapsedMillis, realElapsed;

		if (state.zoneState == "PLAYING") {
			elapsedMillis = state.elapsed*1000 + (Date.now() - state.lastUpdate);
			realElapsed = Math.floor(elapsedMillis/1000);
		} else {
			realElapsed = state.elapsed;
			elapsedMillis = realElapsed * 1000;
		}

		document.getElementById("countup").textContent = toFormattedTime(realElapsed);
		var remaining = state.duration - realElapsed;
		document.getElementById("countdown").textContent = "-" + toFormattedTime(remaining);
		var position = elapsedMillis / (state.duration*1000);
		setPosition(position);
	}

	function setPosition(position) {
		// calculate offset
		var offset = Math.round(state.maxX * position);
		state.slider.style.marginLeft = offset + "px";
		state.currentX = offset;
		state.progress = position;
	}

	function handleMouseWheel(e) {
		console.log(state)
		var newProgress;
		state.elapsed = state.elapsed + (Date.now() - state.lastUpdate)/1000;
		state.lastUpdate = Date.now();

		if(e.deltaY < 0) {
			// wheel down
			state.elapsed += 2;
		} else {
			// wheel up
			state.elapsed -= 2;
		}

		state.slideInProgress = true;
		setPosition( state.elapsed / state.duration );
		updatePosition(true);
		console.log("clearing", progressAdjustTimer)
		clearTimeout(progressAdjustTimer);
		progressAdjustTimer = setTimeout(function () { callback(state.elapsed / state.duration); state.slideInProgress = false}, 800);

	}

	function handleClick(e) {
		if (e.target.tagName == "IMG") return;

		state.elapsed = state.elapsed + (Date.now() - state.lastUpdate)/1000;
		state.lastUpdate = Date.now();

		console.log(e.layerX, state.currentX)
		if(e.layerX > state.currentX) {
			// volume down
			state.elapsed += 2;
		} else {
			// volume up
			state.elapsed -= 2;
		}

		state.slideInProgress = true;
		setPosition( state.elapsed / state.duration );
		updatePosition(true);
		console.log("clearing", progressAdjustTimer)
		clearTimeout(progressAdjustTimer);
		progressAdjustTimer = setTimeout(function () { callback(state.elapsed / state.duration); state.slideInProgress = false}, 2000);
	}

	function onDrag(e) {
		var deltaX = e.clientX - state.cursorX;
		var nextX = state.originalX + deltaX;
		// calculate time
		if (nextX < 1) nextX = 1;
		if (nextX > state.maxX) nextX = state.maxX;
		var progress = nextX / state.maxX;
		setPosition(progress);
		state.hasBeenDragged = true;
	}


	var sliderWidth = containerObj.clientWidth;
	state.maxX = sliderWidth - 5;
	state.slider = containerObj.querySelector('div');
	state.currentX = state.slider.offsetLeft;

	console.log(state)

	state.slider.addEventListener('mousedown', function (e) {
		state.slideInProgress = true;
		state.cursorX = e.clientX;
		state.originalX = state.currentX;
		console.log(e, state)
		state.slider.classList.add('sliding');
		document.addEventListener('mousemove', onDrag);
		e.preventDefault();
	});

	document.addEventListener('mouseup', function () {
		if (!state.slideInProgress || !state.hasBeenDragged ) return;
		document.removeEventListener('mousemove', onDrag);
		if (typeof callback == "function") {
			callback(state.currentX / state.maxX);
		}
		state.slider.classList.remove('sliding');
		state.slideInProgress = false;
		state.hasBeenDragged = false;
	});

	// Since Chrome 31 wheel event is also supported
	console.log(containerObj)
	containerObj.addEventListener("wheel", handleMouseWheel);

	// For click-to-adjust
	containerObj.addEventListener("click", handleClick);
}