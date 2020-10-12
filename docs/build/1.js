webpackJsonp([1],[
/* 0 */,
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

	/*!
	  * domready (c) Dustin Diaz 2014 - License MIT
	  */
	!function (name, definition) {

	  if (true) module.exports = definition()
	  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition)
	  else this[name] = definition()

	}('domready', function () {

	  var fns = [], listener
	    , doc = document
	    , hack = doc.documentElement.doScroll
	    , domContentLoaded = 'DOMContentLoaded'
	    , loaded = (hack ? /^loaded|^c/ : /^loaded|^i|^c/).test(doc.readyState)


	  if (!loaded)
	  doc.addEventListener(domContentLoaded, listener = function () {
	    doc.removeEventListener(domContentLoaded, listener)
	    loaded = 1
	    while (listener = fns.shift()) listener()
	  })

	  return function (fn) {
	    loaded ? setTimeout(fn, 0) : fns.push(fn)
	  }

	});


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(3), __webpack_require__(5), __webpack_require__(22), __webpack_require__(26)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Score, Transport, rollStyle, Scroll) {

		/**
		 *  the amount of time that notes are processed ahead of time.
		 *  This improves the performance and accuracy of scheduled notes. 
		 */
		var lookAhead = 0.05;


		var Roll = function(container){

			/**
			 *  The scroll container
			 */
			this._element = document.createElement("div");
			this._element.id = "RollContainer";
			container.appendChild(this._element);

			// The trigger line that sits in the center
			var triggerLine = document.createElement("div");
			triggerLine.id = "TriggerLine";
			this._element.appendChild(triggerLine);

			/**
			 *  The scrolling container
			 */
			this._scrollContainer = document.createElement("div");
			this._scrollContainer.id = "ScrollContainer";
			this._element.appendChild(this._scrollContainer);


			this._scrollElement = document.createElement("div");
			this._scrollElement.id = "PianoRoll";
			this._scrollContainer.appendChild(this._scrollElement);

			//THE SCORE DISPLAY
			this._score = new Score(this._element, this._scrollElement);

			//the scroll handler
			this._scroll = new Scroll(this._scrollContainer, this._score.pixelsPerSecond);
			this._scroll.scrubstart = this._scrubStarted.bind(this);
			this._scroll.scrubend = this._scrubEnd.bind(this);

			// if it's scrubbing
			this._scrubbing = false;

			this._started = false;

			//the current notes on the screen
			this._currentNotes = [];

			//if the scroll has changed, redraw
			this._currentScroll = -1;

			//the time at the beginning of the piano roll
			this._computedStartTime = 0;

			//callback when a note is triggered
			this.onnote = function(){};
			this.onstop = function(){};

			//a binding of the loop
			this._bindedLoop = this._loop.bind(this);

			//start the loop
			this._loop();

			this._width = this._scrollContainer.offsetWidth;

			window.addEventListener("resize", this._resize.bind(this));

			//set the lookahead to match the other one
			// Transport._clock.lookAhead = lookAhead;
		};

		Roll.prototype._resize = function(){
			this._width = this._scrollContainer.offsetWidth;
		};

		Roll.prototype._computeStartTime = function(){
			var width = this._scrollContainer.offsetWidth;
			this._computedStartTime = Transport.now() - (this._currentScroll - width/2) / this._score.pixelsPerSecond;
		};

		Roll.prototype._scrubStarted = function(){
			this._scrubbing = true;
			//release all the current notes
			for (var i = 0; i < this._currentNotes.length; i++){
				this._currentNotes[i].triggerRelease();
			}
			this.onstop();
		};

		Roll.prototype._scrubEnd = function(){
			this._scrubbing = false;
			this._computeStartTime();
		};

		/**
		 * Draw the currently on screen notes
		 */
		Roll.prototype._onScreenNotes  = function(){
			var width = this._width;
			// var notes = this._score.showOnScreenNotes(this._currentScroll - width/2, this._currentScroll + width/2);
			var notes = this._score.showOnScreenNotes(this._currentScroll - width, this._currentScroll);
			var triggerLineNotes = this._score.getTriggerLine(this._currentScroll - width / 2 - 1);
			if (triggerLineNotes){
				//compare it to the last one and get the note attacks and releases
				for (var i = 0; i < triggerLineNotes.length; i++){
					if (this._currentNotes.indexOf(triggerLineNotes[i]) === -1){
						var note = triggerLineNotes[i];
						if (this._scrubbing){
							this.onnote(note.note, 0.1, "+0.05", note.velocity * 0.3);
							note.triggerAttackRelease(0.1, "+0.05", note.velocity);
						} else {
							var startTime = this._computedStartTime + note.noteOn + lookAhead;
							this.onnote(note.note, note.duration, startTime, note.velocity);
							note.triggerAttackRelease(note.duration, startTime, note.velocity);
						}
					}
				}
				this._currentNotes = triggerLineNotes;
			}
		};

		Roll.prototype._loop = function(){
			requestAnimationFrame(this._bindedLoop);
			var scrollLeft = this._scrollContainer.scrollLeft;
			//loop
			if (scrollLeft + this._width >= this._score.width - 2){
				this._currentScroll = -1;
				this._scroll.restart();
				this._computeStartTime();
				this._scrollContainer.scrollLeft = 0;
			}
			if (scrollLeft !== this._currentScroll){
				this._currentScroll = scrollLeft;
				this._onScreenNotes();
			}
			//draw all of the notes
			this._score.draw(this._currentScroll - this._width);
		};

		/**
		 * set the json score
		 */
		Roll.prototype.setScore = function(json){
			Transport.bpm.value = json.header.tempo;
			Transport.timeSignature = json.header.timeSignature;
			//set the notes
			this._score.setNotes(json.notes);
			//show the first notes initially
			var width = this._scrollContainer.offsetWidth;
			this._currentScroll =  width / 2 - 3;
			this._scrollContainer.scrollLeft = this._currentScroll;
			this._onScreenNotes();
		};

		Roll.prototype.start = function(){
			this._computeStartTime();
			this._scroll.start();
		};

		Roll.prototype.stop = function(){
			this._scroll.stop();
			for (var i = 0; i < this._currentNotes.length; i++){
				this._currentNotes[i].triggerRelease();
			}
			this.onstop();
		};

		return Roll;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(4), __webpack_require__(20), __webpack_require__(22)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Note, createIntervalTree, rollStyle) {
		
		/**
		 *  Parses the score JSON into note on/off events
		 *  and orders them. Converts ticks into seconds. 
		 *  @param  {Object}  scoreJson  JSON returned from Tone.js' MidiToScore
		 */
		var Score = function(container, scrollElement){

			/**
			 *  all of the notes
			 */
			this.notes = [];

			/**
			 *  the score container
			 */
			this.element = scrollElement;

			/**
			 *  the notes that are currently displayed
			 */
			this.currentlyDisplayedNotes = [];

			/**
			 *  the notes that are currently being triggered by scrubbing
			 */
			this.currentlyTriggeredNotes = [];

			/**
			 *  the interval tree
			 */
			this.intervalTree = null;

			/**
			 * the width of the scroll container
			 */
			this.width = 0;

			/**
			 * The canvas which notes are drawn to
			 * @type {Element}
			 */
			this.canvas = document.createElement("canvas");
			this.canvas.id = "ScoreCanvas";
			container.appendChild(this.canvas);

			/**
			 * The canvas measurements
			 */
			this.canvasWidth = 0;
			this.canvasHeight = 0;

			this.context = this.canvas.getContext("2d");

			window.addEventListener("resize", this.resize.bind(this));
			this.resize();

			this._currentNotes = null;
		};

		/**
		 *  useful for drawing / scrubbing
		 */
		Score.prototype.pixelsPerSecond = 100;

		/**
		 *  Set the array of notes
		 */
		Score.prototype.setNotes = function(notes){
			this._currentNotes = notes;
			this.clearNotes();
			//get the min/max data
			var minNote = Infinity;
			var maxNote = -Infinity;
			notes.forEach(function(note){
				if (note.midiNote > maxNote){
					maxNote = note.midiNote;
				} 
				if (note.midiNote < minNote){
					minNote = note.midiNote;
				}
			});
			//some padding
			minNote -= 3;
			maxNote += 3;
			var noteHeight = this.element.offsetHeight / (maxNote - minNote);
			var displayOptions = {
				"min" : minNote,
				"max" : maxNote,
				"pixelsPerSecond" : this.pixelsPerSecond,
				"noteHeight" : Math.round(noteHeight)
			};
			this.intervalTree = new createIntervalTree();
			var duration = -Infinity;
			for (var i = 0; i < notes.length; i++){
				var note = new Note(notes[i], displayOptions);
				if (note.noteOff > duration){
					duration = note.noteOff;
				}
				this.intervalTree.insert([note.noteOn, note.noteOff, note]);
			}
			//set the width
			this.width = duration * this.pixelsPerSecond + window.innerWidth * 2;
			this.element.style.width = this.width;
		};

		/**
		 *  Resuze the drawing canvas
		 */
		Score.prototype.resize = function(){
			this.canvasWidth = this.canvas.offsetWidth * 2;
			this.canvasHeight = this.canvas.offsetHeight * 2;
			this.context.canvas.width = this.canvasWidth;
			this.context.canvas.height = this.canvasHeight;
			if (this._currentNotes){
				this.setNotes(this._currentNotes);
			}
		};
		
		/**
		 *  Returns the length of the score in seconds
		 *  @return  {Number}
		 */
		Score.prototype.getDuration = function(){
			var lastOff = 0;
			//get the last noteOff
			for (var i = 0; i < this.notes.length; i++){
				if (this.notes[i].noteOff > lastOff){
					lastOff = this.notes[i].noteOff;
				}
			}
			return lastOff;
		};

		/**
		 *  get the note attacks between 'from' and 'to' PIXELS!
		 *  @return  {Array}
		 */
		Score.prototype.showOnScreenNotes = function(from, to){
			var fromSeconds = from / this.pixelsPerSecond;
			var toSeconds = to / this.pixelsPerSecond;
			if (this.intervalTree !== null){
				var notes = [];
				this.intervalTree.queryInterval(fromSeconds, toSeconds, function(res){
					notes.push(res[2]);
				});
				this.currentlyDisplayedNotes = notes;
			}
		};

		/**
		 *  get the note attacks between 'from' and 'to' PIXELS!
		 *  @return  {Array}
		 */
		Score.prototype.getTriggerLine = function(position){
			if (this.intervalTree !== null){
				var notes = [];
				position = position / this.pixelsPerSecond;
				this.intervalTree.queryPoint(position, function(res){
					notes.push(res[2]);
				});
				return notes;
			}
		};

		/**
		 *  clear all of the children
		 */
		Score.prototype.clearNotes = function(){
			for (var i = 0; i < this.notes.length; i++){
				var notes = this.notes[i];
				notes.dispose();
			}
			this.notes = [];
		};

		/**
		 *  clean up
		 */
		Score.prototype.dispose = function(){
			this.clearNotes();
			this.element.remove();
			this.element = null;
		};

		/**
		 *  Draw all of the onscreen notes
		 */
		Score.prototype.draw = function(offset){
			this.context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
			this.context.save();
			this.context.translate(-offset * 2, 0);
			var notes = this.currentlyDisplayedNotes;
			for (var i = 0; i < notes.length; i++){
				var n = notes[i];
				n.draw(this.context);
			}
			this.context.restore();
		};

		return Score;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5), __webpack_require__(19)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Transport, Colors){

		/**
		 *  Notes manage both the visual element and trigger the synth
		 */
		var Note = function(noteDescription, displayOptions){

			/**
			 *  Note stats
			 */
			this.noteOn = Transport.toSeconds(noteDescription.time);
			this.duration = Transport.toSeconds(noteDescription.duration);
			this.noteOff = this.noteOn + this.duration;

			//parse the name from the octave, and add it as a class
			var noteName = noteDescription.note.match(/^([a-g]{1}[b|#]{0,1})[0-9]+$/i)[1];

			/**
			 * The notes color
			 */
			this.color = Colors[noteName];

			/**
			 *  the note name
			 */
			this.note = noteDescription.note;

			/**
			 *  the note velocity
			 */
			this.velocity = noteDescription.velocity;

			/**
			 *  MIDI note number
			 */
			this.midiNote = noteDescription.midiNote;

			/**
			 * If the note is triggered or not
			 */
			this._triggered = false;

			/**
			 *  place it on the screen
			 */
			var top =  (displayOptions.max - displayOptions.min) * (1 - (this.midiNote - displayOptions.min) / (displayOptions.max - displayOptions.min));
			top *=  displayOptions.noteHeight - 2;

			//dimensions
			this.top = top;
			this.left = this.noteOn * displayOptions.pixelsPerSecond;
			this.width = (this.duration * displayOptions.pixelsPerSecond) - 2;
			this.width = Math.max(this.width, 3);
			this.height = displayOptions.noteHeight - 2;
		};

		/**
		 *  trigger the attack
		 */
		Note.prototype.triggerAttack = function(time){
			this._triggered = true;
		};

		/**
		 *  trigger the release
		 */
		Note.prototype.triggerRelease = function(time){
			this._triggered = false;
		};

		Note.prototype.triggerAttackRelease = function(duration, time){
			duration = Transport.toSeconds(duration);
			this.needsUpdate = true;
			this._triggered = true;
			setTimeout(function(){
				this._triggered = false;
				this.needsUpdate = true;
			}.bind(this), duration * 1000);
		};


		/**
		 *  Display the element
		 */
		Note.prototype.draw = function(context){
			context.beginPath();
			if (this._triggered){
				context.fillStyle = "black";
			} else {
				context.fillStyle = this.color;
			}
			context.fillRect(this.left * 2, this.top * 2, this.width * 2, this.height * 2);
		};

		/**
		 *  trigger the release
		 */
		Note.prototype.dispose = function(time){
			Transport.cancel(this.noteOnId);
			Transport.cancel(this.noteOffId);
			this.element.remove();
			this.element = null;
		};

		return Note;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(7), __webpack_require__(12), __webpack_require__(15), 
		__webpack_require__(17), __webpack_require__(14), __webpack_require__(18)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Transport for timing musical events.
		 *          Supports tempo curves and time changes. Unlike browser-based timing (setInterval, requestAnimationFrame)
		 *          Tone.Transport timing events pass in the exact time of the scheduled event
		 *          in the argument of the callback function. Pass that time value to the object
		 *          you're scheduling. <br><br>
		 *          A single transport is created for you when the library is initialized. 
		 *          <br><br>
		 *          The transport emits the events: "start", "stop", "pause", and "loop" which are
		 *          called with the time of that event as the argument. 
		 *
		 *  @extends {Tone.Emitter}
		 *  @singleton
		 *  @example
		 * //repeated event every 8th note
		 * Tone.Transport.setInterval(function(time){
		 * 	//do something with the time
		 * }, "8n");
		 *  @example
		 * //one time event 1 second in the future
		 * Tone.Transport.setTimeout(function(time){
		 * 	//do something with the time
		 * }, 1);
		 *  @example
		 * //event fixed to the Transports timeline. 
		 * Tone.Transport.setTimeline(function(time){
		 * 	//do something with the time
		 * }, "16:0:0");
		 */
		Tone.Transport = function(){

			Tone.Emitter.call(this);

			///////////////////////////////////////////////////////////////////////
			//	LOOPING
			//////////////////////////////////////////////////////////////////////

			/** 
			 * 	If the transport loops or not.
			 *  @type {boolean}
			 */
			this.loop = false;

			/** 
			 * 	The loop start position in ticks
			 *  @type {Ticks}
			 *  @private
			 */
			this._loopStart = 0;

			/** 
			 * 	The loop end position in ticks
			 *  @type {Ticks}
			 *  @private
			 */
			this._loopEnd = 0;

			///////////////////////////////////////////////////////////////////////
			//	CLOCK/TEMPO
			//////////////////////////////////////////////////////////////////////

			/**
			 *  Pulses per quarter is the number of ticks per quarter note.
			 *  @private
			 *  @type  {Number}
			 */
			this._ppq = TransportConstructor.defaults.PPQ;

			/**
			 *  watches the main oscillator for timing ticks
			 *  initially starts at 120bpm
			 *  @private
			 *  @type {Tone.Clock}
			 */
			this._clock = new Tone.Clock({
				"callback" : this._processTick.bind(this), 
				"frequency" : 0,
			});
			/**
			 *  The Beats Per Minute of the Transport. 
			 *  @type {BPM}
			 *  @signal
			 *  @example
			 * Tone.Transport.bpm.value = 80;
			 * //ramp the bpm to 120 over 10 seconds
			 * Tone.Transport.bpm.rampTo(120, 10);
			 */
			this.bpm = this._clock.frequency;
			this.bpm._toUnits = this._toUnits.bind(this);
			this.bpm._fromUnits = this._fromUnits.bind(this);
			this.bpm.units = Tone.Type.BPM;
			this.bpm.value = TransportConstructor.defaults.bpm;
			this._readOnly("bpm");

			/**
			 *  The time signature, or more accurately the numerator
			 *  of the time signature over a denominator of 4. 
			 *  @type {Number}
			 *  @private
			 */
			this._timeSignature = TransportConstructor.defaults.timeSignature;

			///////////////////////////////////////////////////////////////////////
			//	TIMELINE EVENTS
			//////////////////////////////////////////////////////////////////////

			/**
			 *  All the events in an object to keep track by ID
			 *  @type {Object}
			 *  @private
			 */
			this._scheduledEvents = {};

			/**
			 *  The event ID counter
			 *  @type {Number}
			 *  @private
			 */
			this._eventID = 0;

			/**
			 * 	The scheduled events.
			 *  @type {Tone.Timeline}
			 *  @private
			 */
			this._timeline = new Tone.Timeline();

			/**
			 *  Repeated events
			 *  @type {Array}
			 *  @private
			 */
			this._repeatedEvents = new Tone.IntervalTimeline();

			/**
			 *  Events that occur once
			 *  @type {Array}
			 *  @private
			 */
			this._onceEvents = new Tone.Timeline();

			/** 
			 *  All of the synced Signals
			 *  @private 
			 *  @type {Array}
			 */
			this._syncedSignals = [];

			///////////////////////////////////////////////////////////////////////
			//	SWING
			//////////////////////////////////////////////////////////////////////

			var swingSeconds = this.notationToSeconds(TransportConstructor.defaults.swingSubdivision, TransportConstructor.defaults.bpm, TransportConstructor.defaults.timeSignature);

			/**
			 *  The subdivision of the swing
			 *  @type  {Ticks}
			 *  @private
			 */
			this._swingTicks = (swingSeconds / (60 / TransportConstructor.defaults.bpm)) * this._ppq;

			/**
			 *  The swing amount
			 *  @type {NormalRange}
			 *  @private
			 */
			this._swingAmount = 0;

		};

		Tone.extend(Tone.Transport, Tone.Emitter);

		/**
		 *  the defaults
		 *  @type {Object}
		 *  @const
		 *  @static
		 */
		Tone.Transport.defaults = {
			"bpm" : 120,
			"swing" : 0,
			"swingSubdivision" : "16n",
			"timeSignature" : 4,
			"loopStart" : 0,
			"loopEnd" : "4m",
			"PPQ" : 48
		};

		///////////////////////////////////////////////////////////////////////////////
		//	TICKS
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  called on every tick
		 *  @param   {number} tickTime clock relative tick time
		 *  @private
		 */
		Tone.Transport.prototype._processTick = function(tickTime){
			//handle swing
			if (this._swingAmount > 0 && 
				this._clock.ticks % this._ppq !== 0 && //not on a downbeat
				this._clock.ticks % this._swingTicks === 0){
				//add some swing
				tickTime += this.ticksToSeconds(this._swingTicks) * this._swingAmount;
			}
			//do the loop test
			if (this.loop){
				if (this._clock.ticks === this._loopEnd){
					this.ticks = this._loopStart;
					this.trigger("loop", tickTime);
				}
			}
			var ticks = this._clock.ticks;
			//fire the next tick events if their time has come
			this._timeline.forEachAtTime(ticks, function(event){
				event.callback(tickTime);
			});
			//process the repeated events
			this._repeatedEvents.forEachOverlap(ticks, function(event){
				if ((ticks - event.time) % event.interval === 0){
					event.callback(tickTime);
				}
			});
			//process the single occurrence events
			this._onceEvents.forEachBefore(ticks, function(event){
				event.callback(tickTime);
			});
			//and clear the single occurrence timeline
			this._onceEvents.cancelBefore(ticks);
		};

		///////////////////////////////////////////////////////////////////////////////
		//	SCHEDULABLE EVENTS
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  Schedule an event along the timeline.
		 *  @param {Function} callback The callback to be invoked at the time.
		 *  @param {Time}  time The time to invoke the callback at.
		 *  @return {Number} The id of the event which can be used for canceling the event. 
		 *  @example
		 * //trigger the callback when the Transport reaches the desired time
		 * Tone.Transport.schedule(function(time){
		 * 	envelope.triggerAttack(time);
		 * }, "128i");
		 */
		Tone.Transport.prototype.schedule = function(callback, time){
			var event = {
				"time" : this.toTicks(time),
				"callback" : callback
			};
			var id = this._eventID++;
			this._scheduledEvents[id.toString()] = {
				"event" : event,
				"timeline" : this._timeline
			};
			this._timeline.addEvent(event);
			return id;
		};

		/**
		 *  Schedule a repeated event along the timeline. The event will fire
		 *  at the `interval` starting at the `startTime` and for the specified
		 *  `duration`. 
		 *  @param  {Function}  callback   The callback to invoke.
		 *  @param  {Time}    interval   The duration between successive
		 *                               callbacks.
		 *  @param  {Time=}    startTime  When along the timeline the events should
		 *                               start being invoked.
		 *  @param {Time} [duration=Infinity] How long the event should repeat. 
		 *  @return  {Number}    The ID of the scheduled event. Use this to cancel
		 *                           the event. 
		 *  @example
		 * //a callback invoked every eighth note after the first measure
		 * Tone.Transport.scheduleRepeat(callback, "8n", "1m");
		 */
		Tone.Transport.prototype.scheduleRepeat = function(callback, interval, startTime, duration){
			if (interval <= 0){
				throw new Error("repeat events must have an interval larger than 0");
			}
			var event = {
				"time" : this.toTicks(startTime),
				"duration" : this.toTicks(this.defaultArg(duration, Infinity)),
				"interval" : this.toTicks(interval),
				"callback" : callback
			};
			var id = this._eventID++;
			this._scheduledEvents[id.toString()] = {
				"event" : event,
				"timeline" : this._repeatedEvents
			};
			this._repeatedEvents.addEvent(event);
			return id;
		};

		/**
		 *  Schedule an event that will be removed after it is invoked. 
		 *  Note that if the given time is less than the current transport time, 
		 *  the event will be invoked immediately. 
		 *  @param {Function} callback The callback to invoke once.
		 *  @param {Time} time The time the callback should be invoked.
		 *  @returns {Number} The ID of the scheduled event. 
		 */
		Tone.Transport.prototype.scheduleOnce = function(callback, time){
			var event = {
				"time" : this.toTicks(time),
				"callback" : callback
			};
			var id = this._eventID++;
			this._scheduledEvents[id.toString()] = {
				"event" : event,
				"timeline" : this._onceEvents
			};
			this._onceEvents.addEvent(event);
			return id;
		};

		/**
		 *  Clear the passed in event id from the timeline
		 *  @param {Number} eventId The id of the event.
		 *  @returns {Tone.Transport} this
		 */
		Tone.Transport.prototype.clear = function(eventId){
			if (this._scheduledEvents.hasOwnProperty(eventId)){
				var item = this._scheduledEvents[eventId.toString()];
				item.timeline.removeEvent(item.event);
				delete this._scheduledEvents[eventId.toString()];
			}
			return this;
		};

		/**
		 *  Remove scheduled events from the timeline after
		 *  the given time. Repeated events will be removed
		 *  if their startTime is after the given time
		 *  @param {Time} [after=0] Clear all events after
		 *                          this time. 
		 *  @returns {Tone.Transport} this
		 */
		Tone.Transport.prototype.cancel = function(after){
			after = this.defaultArg(after, 0);
			after = this.toTicks(after);
			this._timeline.cancel(after);
			this._onceEvents.cancel(after);
			this._repeatedEvents.cancel(after);
			return this;
		};

		///////////////////////////////////////////////////////////////////////////////
		//	QUANTIZATION
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  Returns the time closest time (equal to or after the given time) that aligns 
		 *  to the subidivision. 
		 *  @param {Time} time The time value to quantize to the given subdivision
		 *  @param  {String} [subdivision="4n"] The subdivision to quantize to.
		 *  @return {Number} 	the time in seconds until the next subdivision.
		 *  @example
		 * Tone.Transport.bpm.value = 120;
		 * Tone.Transport.quantize("3 * 4n", "1m"); //return 0.5
		 * //if the clock is started, it will return a value less than 0.5
		 */
		Tone.Transport.prototype.quantize = function(time, subdivision){
			subdivision = this.defaultArg(subdivision, "4n");
			var tickTime = this.toTicks(time);
			subdivision = this.toTicks(subdivision);
			var remainingTicks = subdivision - (tickTime % subdivision);
			if (remainingTicks === subdivision){
				remainingTicks = 0;
			}
			var now = this.now();
			if (this.state === Tone.State.Started){
				now = this._clock._nextTick;
			}
			return this.toSeconds(time, now) + this.ticksToSeconds(remainingTicks);
		};

		///////////////////////////////////////////////////////////////////////////////
		//	START/STOP/PAUSE
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  Returns the playback state of the source, either "started", "stopped", or "paused"
		 *  @type {Tone.State}
		 *  @readOnly
		 *  @memberOf Tone.Transport#
		 *  @name state
		 */
		Object.defineProperty(Tone.Transport.prototype, "state", {
			get : function(){
				return this._clock.getStateAtTime(this.now());
			}
		});

		/**
		 *  Start the transport and all sources synced to the transport.
		 *  @param  {Time} [time=now] The time when the transport should start.
		 *  @param  {Time=} offset The timeline offset to start the transport.
		 *  @returns {Tone.Transport} this
		 *  @example
		 * //start the transport in one second starting at beginning of the 5th measure. 
		 * Tone.Transport.start("+1", "4:0:0");
		 */
		Tone.Transport.prototype.start = function(time, offset){
			time = this.toSeconds(time);
			if (!this.isUndef(offset)){
				offset = this.toTicks(offset);
			} else {
				offset = this.defaultArg(offset, this._clock.ticks);
			}
			//start the clock
			this._clock.start(time, offset);
			this.trigger("start", time, this.ticksToSeconds(offset));
			return this;
		};

		/**
		 *  Stop the transport and all sources synced to the transport.
		 *  @param  {Time} [time=now] The time when the transport should stop. 
		 *  @returns {Tone.Transport} this
		 *  @example
		 * Tone.Transport.stop();
		 */
		Tone.Transport.prototype.stop = function(time){
			time = this.toSeconds(time);
			this._clock.stop(time);
			this.trigger("stop", time);
			return this;
		};

		/**
		 *  Pause the transport and all sources synced to the transport.
		 *  @param  {Time} [time=now]
		 *  @returns {Tone.Transport} this
		 */
		Tone.Transport.prototype.pause = function(time){
			time = this.toSeconds(time);
			this._clock.pause(time);
			this.trigger("pause", time);
			return this;
		};

		///////////////////////////////////////////////////////////////////////////////
		//	SETTERS/GETTERS
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  The time signature as just the numerator over 4. 
		 *  For example 4/4 would be just 4 and 6/8 would be 3.
		 *  @memberOf Tone.Transport#
		 *  @type {Number|Array}
		 *  @name timeSignature
		 *  @example
		 * //common time
		 * Tone.Transport.timeSignature = 4;
		 * // 7/8
		 * Tone.Transport.timeSignature = [7, 8];
		 * //this will be reduced to a single number
		 * Tone.Transport.timeSignature; //returns 3.5
		 */
		Object.defineProperty(Tone.Transport.prototype, "timeSignature", {
			get : function(){
				return this._timeSignature;
			},
			set : function(timeSig){
				if (this.isArray(timeSig)){
					timeSig = (timeSig[0] / timeSig[1]) * 4;
				}
				this._timeSignature = timeSig;
			}
		});


		/**
		 * When the Tone.Transport.loop = true, this is the starting position of the loop.
		 * @memberOf Tone.Transport#
		 * @type {Time}
		 * @name loopStart
		 */
		Object.defineProperty(Tone.Transport.prototype, "loopStart", {
			get : function(){
				return this.ticksToSeconds(this._loopStart);
			},
			set : function(startPosition){
				this._loopStart = this.toTicks(startPosition);
			}
		});

		/**
		 * When the Tone.Transport.loop = true, this is the ending position of the loop.
		 * @memberOf Tone.Transport#
		 * @type {Time}
		 * @name loopEnd
		 */
		Object.defineProperty(Tone.Transport.prototype, "loopEnd", {
			get : function(){
				return this.ticksToSeconds(this._loopEnd);
			},
			set : function(endPosition){
				this._loopEnd = this.toTicks(endPosition);
			}
		});

		/**
		 *  Set the loop start and stop at the same time. 
		 *  @param {Time} startPosition 
		 *  @param {Time} endPosition   
		 *  @returns {Tone.Transport} this
		 *  @example
		 * //loop over the first measure
		 * Tone.Transport.setLoopPoints(0, "1m");
		 * Tone.Transport.loop = true;
		 */
		Tone.Transport.prototype.setLoopPoints = function(startPosition, endPosition){
			this.loopStart = startPosition;
			this.loopEnd = endPosition;
			return this;
		};

		/**
		 *  The swing value. Between 0-1 where 1 equal to 
		 *  the note + half the subdivision.
		 *  @memberOf Tone.Transport#
		 *  @type {NormalRange}
		 *  @name swing
		 */
		Object.defineProperty(Tone.Transport.prototype, "swing", {
			get : function(){
				return this._swingAmount * 2;
			},
			set : function(amount){
				//scale the values to a normal range
				this._swingAmount = amount * 0.5;
			}
		});

		/**
		 *  Set the subdivision which the swing will be applied to. 
		 *  The default values is a 16th note. Value must be less 
		 *  than a quarter note.
		 *  
		 *  @memberOf Tone.Transport#
		 *  @type {Time}
		 *  @name swingSubdivision
		 */
		Object.defineProperty(Tone.Transport.prototype, "swingSubdivision", {
			get : function(){
				return this.toNotation(this._swingTicks + "i");
			},
			set : function(subdivision){
				this._swingTicks = this.toTicks(subdivision);
			}
		});

		/**
		 *  The Transport's position in MEASURES:BEATS:SIXTEENTHS.
		 *  Setting the value will jump to that position right away. 
		 *  
		 *  @memberOf Tone.Transport#
		 *  @type {TransportTime}
		 *  @name position
		 */
		Object.defineProperty(Tone.Transport.prototype, "position", {
			get : function(){
				var quarters = this.ticks / this._ppq;
				var measures = Math.floor(quarters / this._timeSignature);
				var sixteenths = ((quarters % 1) * 4);
				//if the sixteenths aren't a whole number, fix their length
				if (sixteenths % 1 > 0){
					sixteenths = sixteenths.toFixed(3);	
				}
				quarters = Math.floor(quarters) % this._timeSignature;
				var progress = [measures, quarters, sixteenths];
				return progress.join(":");
			},
			set : function(progress){
				var ticks = this.toTicks(progress);
				this.ticks = ticks;
			}
		});

		/**
		 *  The Transport's loop position as a normalized value. Always
		 *  returns 0 if the transport if loop is not true. 
		 *  @memberOf Tone.Transport#
		 *  @name progress
		 *  @type {NormalRange}
		 */
		Object.defineProperty(Tone.Transport.prototype, "progress", {
			get : function(){
				if (this.loop){
					return (this.ticks - this._loopStart) / (this._loopEnd - this._loopStart);
				} else {
					return 0;
				}
			}
		});

		/**
		 *  The transports current tick position.
		 *  
		 *  @memberOf Tone.Transport#
		 *  @type {Ticks}
		 *  @name ticks
		 */
		Object.defineProperty(Tone.Transport.prototype, "ticks", {
			get : function(){
				return this._clock.ticks;
			},
			set : function(t){
				this._clock.ticks = t;
			}
		});

		/**
		 *  Pulses Per Quarter note. This is the smallest resolution
		 *  the Transport timing supports. This should be set once
		 *  on initialization and not set again. Changing this value 
		 *  after other objects have been created can cause problems. 
		 *  
		 *  @memberOf Tone.Transport#
		 *  @type {Number}
		 *  @name PPQ
		 */
		Object.defineProperty(Tone.Transport.prototype, "PPQ", {
			get : function(){
				return this._ppq;
			},
			set : function(ppq){
				this._ppq = ppq;
				this.bpm.value = this.bpm.value;
			}
		});

		/**
		 *  Convert from BPM to frequency (factoring in PPQ)
		 *  @param  {BPM}  bpm The BPM value to convert to frequency
		 *  @return  {Frequency}  The BPM as a frequency with PPQ factored in.
		 *  @private
		 */
		Tone.Transport.prototype._fromUnits = function(bpm){
			return 1 / (60 / bpm / this.PPQ);
		};

		/**
		 *  Convert from frequency (with PPQ) into BPM
		 *  @param  {Frequency}  freq The clocks frequency to convert to BPM
		 *  @return  {BPM}  The frequency value as BPM.
		 *  @private
		 */
		Tone.Transport.prototype._toUnits = function(freq){
			return (freq / this.PPQ) * 60;
		};

		///////////////////////////////////////////////////////////////////////////////
		//	SYNCING
		///////////////////////////////////////////////////////////////////////////////

		/**
		 *  Attaches the signal to the tempo control signal so that 
		 *  any changes in the tempo will change the signal in the same
		 *  ratio. 
		 *  
		 *  @param  {Tone.Signal} signal 
		 *  @param {number=} ratio Optionally pass in the ratio between
		 *                         the two signals. Otherwise it will be computed
		 *                         based on their current values. 
		 *  @returns {Tone.Transport} this
		 */
		Tone.Transport.prototype.syncSignal = function(signal, ratio){
			if (!ratio){
				//get the sync ratio
				if (signal._param.value !== 0){
					ratio = signal._param.value / this.bpm._param.value;
				} else {
					ratio = 0;
				}
			}
			var ratioSignal = new Tone.Gain(ratio);
			this.bpm.chain(ratioSignal, signal._param);
			this._syncedSignals.push({
				"ratio" : ratioSignal,
				"signal" : signal,
				"initial" : signal._param.value
			});
			signal._param.value = 0;
			return this;
		};

		/**
		 *  Unsyncs a previously synced signal from the transport's control. 
		 *  See Tone.Transport.syncSignal.
		 *  @param  {Tone.Signal} signal 
		 *  @returns {Tone.Transport} this
		 */
		Tone.Transport.prototype.unsyncSignal = function(signal){
			for (var i = this._syncedSignals.length - 1; i >= 0; i--){
				var syncedSignal = this._syncedSignals[i];
				if (syncedSignal.signal === signal){
					syncedSignal.ratio.dispose();
					syncedSignal.signal._param.value = syncedSignal.initial;
					this._syncedSignals.splice(i, 1);
				}
			}
			return this;
		};

		/**
		 *  Clean up. 
		 *  @returns {Tone.Transport} this
		 *  @private
		 */
		Tone.Transport.prototype.dispose = function(){
			Tone.Emitter.prototype.dispose.call(this);
			this._clock.dispose();
			this._clock = null;
			this._writable("bpm");
			this.bpm = null;
			this._timeline.dispose();
			this._timeline = null;
			this._onceEvents.dispose();
			this._onceEvents = null;
			this._repeatedEvents.dispose();
			this._repeatedEvents = null;
			return this;
		};

		///////////////////////////////////////////////////////////////////////////////
		//	INITIALIZATION
		///////////////////////////////////////////////////////////////////////////////

		var TransportConstructor = Tone.Transport;

		Tone._initAudioContext(function(){
			if (typeof Tone.Transport === "function"){
				//a single transport object
				Tone.Transport = new Tone.Transport();
			} else {
				//stop the clock
				Tone.Transport.stop();
				//get the previous values
				var prevSettings = Tone.Transport.get();
				//destory the old transport
				Tone.Transport.dispose();
				//make new Transport insides
				TransportConstructor.call(Tone.Transport);
				//set the previous config
				Tone.Transport.set(prevSettings);
			}
		});

		return Tone.Transport;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/**
	 *  Tone.js
	 *  @author Yotam Mann
	 *  @license http://opensource.org/licenses/MIT MIT License
	 *  @copyright 2014-2016 Yotam Mann
	 */
	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(){

		"use strict";

		//////////////////////////////////////////////////////////////////////////
		//	WEB AUDIO CONTEXT
		///////////////////////////////////////////////////////////////////////////

		//borrowed from underscore.js
		function isUndef(val){
			return val === void 0;
		}

		//borrowed from underscore.js
		function isFunction(val){
			return typeof val === "function";
		}

		var audioContext;

		//polyfill for AudioContext and OfflineAudioContext
		if (isUndef(window.AudioContext)){
			window.AudioContext = window.webkitAudioContext;
		} 
		if (isUndef(window.OfflineAudioContext)){
			window.OfflineAudioContext = window.webkitOfflineAudioContext;
		} 

		if (!isUndef(AudioContext)){
			audioContext = new AudioContext();
		} else {
			throw new Error("Web Audio is not supported in this browser");
		}

		//SHIMS////////////////////////////////////////////////////////////////////

		if (!isFunction(AudioContext.prototype.createGain)){
			AudioContext.prototype.createGain = AudioContext.prototype.createGainNode;
		}
		if (!isFunction(AudioContext.prototype.createDelay)){
			AudioContext.prototype.createDelay = AudioContext.prototype.createDelayNode;
		}
		if (!isFunction(AudioContext.prototype.createPeriodicWave)){
			AudioContext.prototype.createPeriodicWave = AudioContext.prototype.createWaveTable;
		}
		if (!isFunction(AudioBufferSourceNode.prototype.start)){
			AudioBufferSourceNode.prototype.start = AudioBufferSourceNode.prototype.noteGrainOn;
		}
		if (!isFunction(AudioBufferSourceNode.prototype.stop)){
			AudioBufferSourceNode.prototype.stop = AudioBufferSourceNode.prototype.noteOff;
		}
		if (!isFunction(OscillatorNode.prototype.start)){
			OscillatorNode.prototype.start = OscillatorNode.prototype.noteOn;
		}
		if (!isFunction(OscillatorNode.prototype.stop)){
			OscillatorNode.prototype.stop = OscillatorNode.prototype.noteOff;	
		}
		if (!isFunction(OscillatorNode.prototype.setPeriodicWave)){
			OscillatorNode.prototype.setPeriodicWave = OscillatorNode.prototype.setWaveTable;	
		}
		//extend the connect function to include Tones
		AudioNode.prototype._nativeConnect = AudioNode.prototype.connect;
		AudioNode.prototype.connect = function(B, outNum, inNum){
			if (B.input){
				if (Array.isArray(B.input)){
					if (isUndef(inNum)){
						inNum = 0;
					}
					this.connect(B.input[inNum]);
				} else {
					this.connect(B.input, outNum, inNum);
				}
			} else {
				try {
					if (B instanceof AudioNode){
						this._nativeConnect(B, outNum, inNum);
					} else {
						this._nativeConnect(B, outNum);
					}
				} catch (e) {
					throw new Error("error connecting to node: "+B);
				}
			}
		};

		///////////////////////////////////////////////////////////////////////////
		//	TONE
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  @class  Tone is the base class of all other classes. It provides 
		 *          a lot of methods and functionality to all classes that extend
		 *          it. 
		 *  
		 *  @constructor
		 *  @alias Tone
		 *  @param {number} [inputs=1] the number of input nodes
		 *  @param {number} [outputs=1] the number of output nodes
		 */
		var Tone = function(inputs, outputs){

			/**
			 *  the input node(s)
			 *  @type {GainNode|Array}
			 */
			if (isUndef(inputs) || inputs === 1){
				this.input = this.context.createGain();
			} else if (inputs > 1){
				this.input = new Array(inputs);
			}

			/**
			 *  the output node(s)
			 *  @type {GainNode|Array}
			 */
			if (isUndef(outputs) || outputs === 1){
				this.output = this.context.createGain();
			} else if (outputs > 1){
				this.output = new Array(inputs);
			}
		};

		/**
		 *  Set the parameters at once. Either pass in an
		 *  object mapping parameters to values, or to set a
		 *  single parameter, by passing in a string and value.
		 *  The last argument is an optional ramp time which 
		 *  will ramp any signal values to their destination value
		 *  over the duration of the rampTime.
		 *  @param {Object|string} params
		 *  @param {number=} value
		 *  @param {Time=} rampTime
		 *  @returns {Tone} this
		 *  @example
		 * //set values using an object
		 * filter.set({
		 * 	"frequency" : 300,
		 * 	"type" : highpass
		 * });
		 *  @example
		 * filter.set("type", "highpass");
		 *  @example
		 * //ramp to the value 220 over 3 seconds. 
		 * oscillator.set({
		 * 	"frequency" : 220
		 * }, 3);
		 */
		Tone.prototype.set = function(params, value, rampTime){
			if (this.isObject(params)){
				rampTime = value;
			} else if (this.isString(params)){
				var tmpObj = {};
				tmpObj[params] = value;
				params = tmpObj;
			}
			for (var attr in params){
				value = params[attr];
				var parent = this;
				if (attr.indexOf(".") !== -1){
					var attrSplit = attr.split(".");
					for (var i = 0; i < attrSplit.length - 1; i++){
						parent = parent[attrSplit[i]];
					}
					attr = attrSplit[attrSplit.length - 1];
				}
				var param = parent[attr];
				if (isUndef(param)){
					continue;
				}
				if ((Tone.Signal && param instanceof Tone.Signal) || 
						(Tone.Param && param instanceof Tone.Param)){
					if (param.value !== value){
						if (isUndef(rampTime)){
							param.value = value;
						} else {
							param.rampTo(value, rampTime);
						}
					}
				} else if (param instanceof AudioParam){
					if (param.value !== value){
						param.value = value;
					}				
				} else if (param instanceof Tone){
					param.set(value);
				} else if (param !== value){
					parent[attr] = value;
				}
			}
			return this;
		};

		/**
		 *  Get the object's attributes. Given no arguments get
		 *  will return all available object properties and their corresponding
		 *  values. Pass in a single attribute to retrieve or an array
		 *  of attributes. The attribute strings can also include a "."
		 *  to access deeper properties.
		 *  @example
		 * osc.get();
		 * //returns {"type" : "sine", "frequency" : 440, ...etc}
		 *  @example
		 * osc.get("type");
		 * //returns { "type" : "sine"}
		 * @example
		 * //use dot notation to access deep properties
		 * synth.get(["envelope.attack", "envelope.release"]);
		 * //returns {"envelope" : {"attack" : 0.2, "release" : 0.4}}
		 *  @param {Array=|string|undefined} params the parameters to get, otherwise will return 
		 *  					                  all available.
		 *  @returns {Object}
		 */
		Tone.prototype.get = function(params){
			if (isUndef(params)){
				params = this._collectDefaults(this.constructor);
			} else if (this.isString(params)){
				params = [params];
			} 
			var ret = {};
			for (var i = 0; i < params.length; i++){
				var attr = params[i];
				var parent = this;
				var subRet = ret;
				if (attr.indexOf(".") !== -1){
					var attrSplit = attr.split(".");
					for (var j = 0; j < attrSplit.length - 1; j++){
						var subAttr = attrSplit[j];
						subRet[subAttr] = subRet[subAttr] || {};
						subRet = subRet[subAttr];
						parent = parent[subAttr];
					}
					attr = attrSplit[attrSplit.length - 1];
				}
				var param = parent[attr];
				if (this.isObject(params[attr])){
					subRet[attr] = param.get();
				} else if (Tone.Signal && param instanceof Tone.Signal){
					subRet[attr] = param.value;
				} else if (Tone.Param && param instanceof Tone.Param){
					subRet[attr] = param.value;
				} else if (param instanceof AudioParam){
					subRet[attr] = param.value;
				} else if (param instanceof Tone){
					subRet[attr] = param.get();
				} else if (!isFunction(param) && !isUndef(param)){
					subRet[attr] = param;
				} 
			}
			return ret;
		};

		/**
		 *  collect all of the default attributes in one
		 *  @private
		 *  @param {function} constr the constructor to find the defaults from
		 *  @return {Array} all of the attributes which belong to the class
		 */
		Tone.prototype._collectDefaults = function(constr){
			var ret = [];
			if (!isUndef(constr.defaults)){
				ret = Object.keys(constr.defaults);
			}
			if (!isUndef(constr._super)){
				var superDefs = this._collectDefaults(constr._super);
				//filter out repeats
				for (var i = 0; i < superDefs.length; i++){
					if (ret.indexOf(superDefs[i]) === -1){
						ret.push(superDefs[i]);
					}
				}
			}
			return ret;
		};

		/**
		 *  @returns {string} returns the name of the class as a string
		 */
		Tone.prototype.toString = function(){
			for (var className in Tone){
				var isLetter = className[0].match(/^[A-Z]$/);
				var sameConstructor =  Tone[className] === this.constructor;
				if (isFunction(Tone[className]) && isLetter && sameConstructor){
					return className;
				}
			}
			return "Tone";
		};

		///////////////////////////////////////////////////////////////////////////
		//	CLASS VARS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  A static pointer to the audio context accessible as Tone.context. 
		 *  @type {AudioContext}
		 */
		Tone.context = audioContext;

		/**
		 *  The audio context.
		 *  @type {AudioContext}
		 */
		Tone.prototype.context = Tone.context;

		/**
		 *  the default buffer size
		 *  @type {number}
		 *  @static
		 *  @const
		 */
		Tone.prototype.bufferSize = 2048;

		/**
		 *  The delay time of a single frame (128 samples according to the spec). 
		 *  @type {number}
		 *  @static
		 *  @const
		 */
		Tone.prototype.blockTime = 128 / Tone.context.sampleRate;

		/**
		 *  The time of a single sample
		 *  @type {number}
		 *  @static
		 *  @const
		 */
		Tone.prototype.sampleTime = 1 / Tone.context.sampleRate;
		
		///////////////////////////////////////////////////////////////////////////
		//	CONNECTIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  disconnect and dispose
		 *  @returns {Tone} this
		 */
		Tone.prototype.dispose = function(){
			if (!this.isUndef(this.input)){
				if (this.input instanceof AudioNode){
					this.input.disconnect();
				} 
				this.input = null;
			}
			if (!this.isUndef(this.output)){
				if (this.output instanceof AudioNode){
					this.output.disconnect();
				} 
				this.output = null;
			}
			return this;
		};

		/**
		 *  a silent connection to the DesinationNode
		 *  which will ensure that anything connected to it
		 *  will not be garbage collected
		 *  
		 *  @private
		 */
		var _silentNode = null;

		/**
		 *  makes a connection to ensure that the node will not be garbage collected
		 *  until 'dispose' is explicitly called
		 *
		 *  use carefully. circumvents JS and WebAudio's normal Garbage Collection behavior
		 *  @returns {Tone} this
		 */
		Tone.prototype.noGC = function(){
			this.output.connect(_silentNode);
			return this;
		};

		AudioNode.prototype.noGC = function(){
			this.connect(_silentNode);
			return this;
		};

		/**
		 *  connect the output of a ToneNode to an AudioParam, AudioNode, or ToneNode
		 *  @param  {Tone | AudioParam | AudioNode} unit 
		 *  @param {number} [outputNum=0] optionally which output to connect from
		 *  @param {number} [inputNum=0] optionally which input to connect to
		 *  @returns {Tone} this
		 */
		Tone.prototype.connect = function(unit, outputNum, inputNum){
			if (Array.isArray(this.output)){
				outputNum = this.defaultArg(outputNum, 0);
				this.output[outputNum].connect(unit, 0, inputNum);
			} else {
				this.output.connect(unit, outputNum, inputNum);
			}
			return this;
		};

		/**
		 *  disconnect the output
		 *  @returns {Tone} this
		 */
		Tone.prototype.disconnect = function(outputNum){
			if (Array.isArray(this.output)){
				outputNum = this.defaultArg(outputNum, 0);
				this.output[outputNum].disconnect();
			} else {
				this.output.disconnect();
			}
			return this;
		};

		/**
		 *  connect together all of the arguments in series
		 *  @param {...AudioParam|Tone|AudioNode} nodes
		 *  @returns {Tone} this
		 */
		Tone.prototype.connectSeries = function(){
			if (arguments.length > 1){
				var currentUnit = arguments[0];
				for (var i = 1; i < arguments.length; i++){
					var toUnit = arguments[i];
					currentUnit.connect(toUnit);
					currentUnit = toUnit;
				}
			}
			return this;
		};

		/**
		 *  fan out the connection from the first argument to the rest of the arguments
		 *  @param {...AudioParam|Tone|AudioNode} nodes
		 *  @returns {Tone} this
		 */
		Tone.prototype.connectParallel = function(){
			var connectFrom = arguments[0];
			if (arguments.length > 1){
				for (var i = 1; i < arguments.length; i++){
					var connectTo = arguments[i];
					connectFrom.connect(connectTo);
				}
			}
			return this;
		};

		/**
		 *  Connect the output of this node to the rest of the nodes in series.
		 *  @example
		 *  //connect a node to an effect, panVol and then to the master output
		 *  node.chain(effect, panVol, Tone.Master);
		 *  @param {...AudioParam|Tone|AudioNode} nodes
		 *  @returns {Tone} this
		 */
		Tone.prototype.chain = function(){
			if (arguments.length > 0){
				var currentUnit = this;
				for (var i = 0; i < arguments.length; i++){
					var toUnit = arguments[i];
					currentUnit.connect(toUnit);
					currentUnit = toUnit;
				}
			}
			return this;
		};

		/**
		 *  connect the output of this node to the rest of the nodes in parallel.
		 *  @param {...AudioParam|Tone|AudioNode} nodes
		 *  @returns {Tone} this
		 */
		Tone.prototype.fan = function(){
			if (arguments.length > 0){
				for (var i = 0; i < arguments.length; i++){
					this.connect(arguments[i]);
				}
			}
			return this;
		};

		//give native nodes chain and fan methods
		AudioNode.prototype.chain = Tone.prototype.chain;
		AudioNode.prototype.fan = Tone.prototype.fan;

		///////////////////////////////////////////////////////////////////////////
		//	UTILITIES / HELPERS / MATHS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  If the `given` parameter is undefined, use the `fallback`. 
		 *  If both `given` and `fallback` are object literals, it will
		 *  return a deep copy which includes all of the parameters from both 
		 *  objects. If a parameter is undefined in given, it will return
		 *  the fallback property. 
		 *  <br><br>
		 *  WARNING: if object is self referential, it will go into an an 
		 *  infinite recursive loop.
		 *  
		 *  @param  {*} given    
		 *  @param  {*} fallback 
		 *  @return {*}          
		 */
		Tone.prototype.defaultArg = function(given, fallback){
			if (this.isObject(given) && this.isObject(fallback)){
				var ret = {};
				//make a deep copy of the given object
				for (var givenProp in given) {
					ret[givenProp] = this.defaultArg(fallback[givenProp], given[givenProp]);
				}
				for (var fallbackProp in fallback) {
					ret[fallbackProp] = this.defaultArg(given[fallbackProp], fallback[fallbackProp]);
				}
				return ret;
			} else {
				return isUndef(given) ? fallback : given;
			}
		};

		/**
		 *  returns the args as an options object with given arguments
		 *  mapped to the names provided. 
		 *
		 *  if the args given is an array containing only one object, it is assumed
		 *  that that's already the options object and will just return it. 
		 *  
		 *  @param  {Array} values  the 'arguments' object of the function
		 *  @param  {Array} keys the names of the arguments as they
		 *                                 should appear in the options object
		 *  @param {Object=} defaults optional defaults to mixin to the returned 
		 *                            options object                              
		 *  @return {Object}       the options object with the names mapped to the arguments
		 */
		Tone.prototype.optionsObject = function(values, keys, defaults){
			var options = {};
			if (values.length === 1 && this.isObject(values[0])){
				options = values[0];
			} else {
				for (var i = 0; i < keys.length; i++){
					options[keys[i]] = values[i];
				}
			}
			if (!this.isUndef(defaults)){
				return this.defaultArg(options, defaults);
			} else {
				return options;
			}
		};

		///////////////////////////////////////////////////////////////////////////
		// TYPE CHECKING
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  test if the arg is undefined
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is undefined
		 *  @function
		 */
		Tone.prototype.isUndef = isUndef;

		/**
		 *  test if the arg is a function
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is a function
		 *  @function
		 */
		Tone.prototype.isFunction = isFunction;

		/**
		 *  Test if the argument is a number.
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is a number
		 */
		Tone.prototype.isNumber = function(arg){
			return (typeof arg === "number");
		};

		/**
		 *  Test if the given argument is an object literal (i.e. `{}`);
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is an object literal.
		 */
		Tone.prototype.isObject = function(arg){
			return (Object.prototype.toString.call(arg) === "[object Object]" && arg.constructor === Object);
		};

		/**
		 *  Test if the argument is a boolean.
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is a boolean
		 */
		Tone.prototype.isBoolean = function(arg){
			return (typeof arg === "boolean");
		};

		/**
		 *  Test if the argument is an Array
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is an array
		 */
		Tone.prototype.isArray = function(arg){
			return (Array.isArray(arg));
		};

		/**
		 *  Test if the argument is a string.
		 *  @param {*} arg the argument to test
		 *  @returns {boolean} true if the arg is a string
		 */
		Tone.prototype.isString = function(arg){
			return (typeof arg === "string");
		};

	 	/**
		 *  An empty function.
		 *  @static
		 */
		Tone.noOp = function(){};

		/**
		 *  Make the property not writable. Internal use only. 
		 *  @private
		 *  @param  {string}  property  the property to make not writable
		 */
		Tone.prototype._readOnly = function(property){
			if (Array.isArray(property)){
				for (var i = 0; i < property.length; i++){
					this._readOnly(property[i]);
				}
			} else {
				Object.defineProperty(this, property, { 
					writable: false,
					enumerable : true,
				});
			}
		};

		/**
		 *  Make an attribute writeable. Interal use only. 
		 *  @private
		 *  @param  {string}  property  the property to make writable
		 */
		Tone.prototype._writable = function(property){
			if (Array.isArray(property)){
				for (var i = 0; i < property.length; i++){
					this._writable(property[i]);
				}
			} else {
				Object.defineProperty(this, property, { 
					writable: true,
				});
			}
		};

		/**
		 * Possible play states. 
		 * @enum {string}
		 */
		Tone.State = {
			Started : "started",
			Stopped : "stopped",
			Paused : "paused",
	 	};

		///////////////////////////////////////////////////////////////////////////
		// GAIN CONVERSIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Equal power gain scale. Good for cross-fading.
		 *  @param  {NormalRange} percent (0-1)
		 *  @return {Number}         output gain (0-1)
		 */
		Tone.prototype.equalPowerScale = function(percent){
			var piFactor = 0.5 * Math.PI;
			return Math.sin(percent * piFactor);
		};

		/**
		 *  Convert decibels into gain.
		 *  @param  {Decibels} db
		 *  @return {Number}   
		 */
		Tone.prototype.dbToGain = function(db) {
			return Math.pow(2, db / 6);
		};

		/**
		 *  Convert gain to decibels.
		 *  @param  {Number} gain (0-1)
		 *  @return {Decibels}   
		 */
		Tone.prototype.gainToDb = function(gain) {
			return  20 * (Math.log(gain) / Math.LN10);
		};

		///////////////////////////////////////////////////////////////////////////
		//	TIMING
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Return the current time of the AudioContext clock.
		 *  @return {Number} the currentTime from the AudioContext
		 */
		Tone.prototype.now = function(){
			return this.context.currentTime;
		};

		/**
		 *  Return the current time of the AudioContext clock.
		 *  @return {Number} the currentTime from the AudioContext
		 *  @static
		 */
		Tone.now = function(){
			return Tone.context.currentTime;
		};

		///////////////////////////////////////////////////////////////////////////
		//	INHERITANCE
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  have a child inherit all of Tone's (or a parent's) prototype
		 *  to inherit the parent's properties, make sure to call 
		 *  Parent.call(this) in the child's constructor
		 *
		 *  based on closure library's inherit function
		 *
		 *  @static
		 *  @param  {function} 	child  
		 *  @param  {function=} parent (optional) parent to inherit from
		 *                             if no parent is supplied, the child
		 *                             will inherit from Tone
		 */
		Tone.extend = function(child, parent){
			if (isUndef(parent)){
				parent = Tone;
			}
			function TempConstructor(){}
			TempConstructor.prototype = parent.prototype;
			child.prototype = new TempConstructor();
			/** @override */
			child.prototype.constructor = child;
			child._super = parent;
		};

		///////////////////////////////////////////////////////////////////////////
		//	CONTEXT
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  array of callbacks to be invoked when a new context is added
		 *  @private 
		 *  @private
		 */
		var newContextCallbacks = [];

		/**
		 *  invoke this callback when a new context is added
		 *  will be invoked initially with the first context
		 *  @private 
		 *  @static
		 *  @param {function(AudioContext)} callback the callback to be invoked
		 *                                           with the audio context
		 */
		Tone._initAudioContext = function(callback){
			//invoke the callback with the existing AudioContext
			callback(Tone.context);
			//add it to the array
			newContextCallbacks.push(callback);
		};

		/**
		 *  Tone automatically creates a context on init, but if you are working
		 *  with other libraries which also create an AudioContext, it can be
		 *  useful to set your own. If you are going to set your own context, 
		 *  be sure to do it at the start of your code, before creating any objects.
		 *  @static
		 *  @param {AudioContext} ctx The new audio context to set
		 */
		Tone.setContext = function(ctx){
			//set the prototypes
			Tone.prototype.context = ctx;
			Tone.context = ctx;
			//invoke all the callbacks
			for (var i = 0; i < newContextCallbacks.length; i++){
				newContextCallbacks[i](ctx);
			}
		};

		/**
		 *  Bind this to a touchstart event to start the audio on mobile devices. 
		 *  <br>
		 *  http://stackoverflow.com/questions/12517000/no-sound-on-ios-6-web-audio-api/12569290#12569290
		 *  @static
		 */
		Tone.startMobile = function(){
			var osc = Tone.context.createOscillator();
			var silent = Tone.context.createGain();
			silent.gain.value = 0;
			osc.connect(silent);
			silent.connect(Tone.context.destination);
			var now = Tone.context.currentTime;
			osc.start(now);
			osc.stop(now+1);
		};

		//setup the context
		Tone._initAudioContext(function(audioContext){
			//set the blockTime
			Tone.prototype.blockTime = 128 / audioContext.sampleRate;
			Tone.prototype.sampleTime = 1 / audioContext.sampleRate;
			_silentNode = audioContext.createGain();
			_silentNode.gain.value = 0;
			_silentNode.connect(audioContext.destination);
		});

		Tone.version = "r7-dev";

		console.log("%c * Tone.js " + Tone.version + " * ", "background: #000; color: #fff");

		return Tone;
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(8), __webpack_require__(16)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class  A sample accurate clock which provides a callback at the given rate. 
		 *          While the callback is not sample-accurate (it is still susceptible to
		 *          loose JS timing), the time passed in as the argument to the callback
		 *          is precise. For most applications, it is better to use Tone.Transport
		 *          instead of the Clock by itself since you can synchronize multiple callbacks.
		 *
		 * 	@constructor
		 * 	@extends {Tone}
		 * 	@param {function} callback The callback to be invoked with the time of the audio event
		 * 	@param {Frequency} frequency The rate of the callback
		 * 	@example
		 * //the callback will be invoked approximately once a second
		 * //and will print the time exactly once a second apart.
		 * var clock = new Tone.Clock(function(time){
		 * 	console.log(time);
		 * }, 1);
		 */
		Tone.Clock = function(){

			var options = this.optionsObject(arguments, ["callback", "frequency"], Tone.Clock.defaults);

			/**
			 *  The callback function to invoke at the scheduled tick.
			 *  @type  {Function}
			 */
			this.callback = options.callback;

			/**
			 *  The time which the clock will schedule events in advance
			 *  of the current time. Scheduling notes in advance improves
			 *  performance and decreases the chance for clicks caused
			 *  by scheduling events in the past. If set to "auto",
			 *  this value will be automatically computed based on the 
			 *  rate of requestAnimationFrame (0.016 seconds). Larger values
			 *  will yeild better performance, but at the cost of latency. 
			 *  Values less than 0.016 are not recommended.
			 *  @type {Number|String}
			 */
			this._lookAhead = "auto";

			/**
			 *  The lookahead value which was automatically
			 *  computed using a time-based averaging.
			 *  @type {Number}
			 *  @private
			 */
			this._computedLookAhead = 1/60;

			/**
			 *  The value afterwhich events are thrown out
			 *  @type {Number}
			 *  @private
			 */
			this._threshold = 0.5;

			/**
			 *  The next time the callback is scheduled.
			 *  @type {Number}
			 *  @private
			 */
			this._nextTick = -1;

			/**
			 *  The last time the callback was invoked
			 *  @type  {Number}
			 *  @private
			 */
			this._lastUpdate = 0;

			/**
			 *  The id of the requestAnimationFrame
			 *  @type {Number}
			 *  @private
			 */
			this._loopID = -1;

			/**
			 *  The rate the callback function should be invoked. 
			 *  @type  {BPM}
			 *  @signal
			 */
			this.frequency = new Tone.TimelineSignal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The number of times the callback was invoked. Starts counting at 0
			 *  and increments after the callback was invoked. 
			 *  @type {Ticks}
			 *  @readOnly
			 */
			this.ticks = 0;

			/**
			 *  The state timeline
			 *  @type {Tone.TimelineState}
			 *  @private
			 */
			this._state = new Tone.TimelineState(Tone.State.Stopped);

			/**
			 *  A pre-binded loop function to save a tiny bit of overhead
			 *  of rebinding the function on every frame.
			 *  @type  {Function}
			 *  @private
			 */
			this._boundLoop = this._loop.bind(this);

			this._readOnly("frequency");
			//start the loop
			this._loop();
		};

		Tone.extend(Tone.Clock);

		/**
		 *  The defaults
		 *  @const
		 *  @type  {Object}
		 */
		Tone.Clock.defaults = {
			"callback" : Tone.noOp,
			"frequency" : 1,
			"lookAhead" : "auto",
		};

		/**
		 *  Returns the playback state of the source, either "started", "stopped" or "paused".
		 *  @type {Tone.State}
		 *  @readOnly
		 *  @memberOf Tone.Clock#
		 *  @name state
		 */
		Object.defineProperty(Tone.Clock.prototype, "state", {
			get : function(){
				return this._state.getStateAtTime(this.now());
			}
		});

		/**
		 *  The time which the clock will schedule events in advance
		 *  of the current time. Scheduling notes in advance improves
		 *  performance and decreases the chance for clicks caused
		 *  by scheduling events in the past. If set to "auto",
		 *  this value will be automatically computed based on the 
		 *  rate of requestAnimationFrame (0.016 seconds). Larger values
		 *  will yeild better performance, but at the cost of latency. 
		 *  Values less than 0.016 are not recommended.
		 *  @type {Number|String}
		 *  @memberOf Tone.Clock#
		 *  @name lookAhead
		 */
		Object.defineProperty(Tone.Clock.prototype, "lookAhead", {
			get : function(){
				return this._lookAhead;
			},
			set : function(val){
				if (val === "auto"){
					this._lookAhead = "auto";
				} else {
					this._lookAhead = this.toSeconds(val);
				}
			}
		});


		/**
		 *  Start the clock at the given time. Optionally pass in an offset
		 *  of where to start the tick counter from.
		 *  @param  {Time}  time    The time the clock should start
		 *  @param  {Ticks=}  offset  Where the tick counter starts counting from.
		 *  @return  {Tone.Clock}  this
		 */
		Tone.Clock.prototype.start = function(time, offset){
			time = this.toSeconds(time);
			if (this._state.getStateAtTime(time) !== Tone.State.Started){
				this._state.addEvent({
					"state" : Tone.State.Started, 
					"time" : time,
					"offset" : offset
				});
			}
			return this;	
		};

		/**
		 *  Stop the clock. Stopping the clock resets the tick counter to 0.
		 *  @param {Time} [time=now] The time when the clock should stop.
		 *  @returns {Tone.Clock} this
		 *  @example
		 * clock.stop();
		 */
		Tone.Clock.prototype.stop = function(time){
			time = this.toSeconds(time);
			if (this._state.getStateAtTime(time) !== Tone.State.Stopped){
				this._state.setStateAtTime(Tone.State.Stopped, time);
			}
			return this;	
		};


		/**
		 *  Pause the clock. Pausing does not reset the tick counter.
		 *  @param {Time} [time=now] The time when the clock should stop.
		 *  @returns {Tone.Clock} this
		 */
		Tone.Clock.prototype.pause = function(time){
			time = this.toSeconds(time);
			if (this._state.getStateAtTime(time) === Tone.State.Started){
				this._state.setStateAtTime(Tone.State.Paused, time);
			}
			return this;	
		};

		/**
		 *  The scheduling loop.
		 *  @param  {Number}  time  The current page time starting from 0
		 *                          when the page was loaded.
		 *  @private
		 */
		Tone.Clock.prototype._loop = function(time){
			this._loopID = requestAnimationFrame(this._boundLoop);
			//compute the look ahead
			if (this._lookAhead === "auto"){
				if (!this.isUndef(time)){
					var diff = (time - this._lastUpdate) / 1000;
					this._lastUpdate = time;
					//throw away large differences
					if (diff < this._threshold){
						//averaging
						this._computedLookAhead = (9 * this._computedLookAhead + diff) / 10;
					}
				}
			} else {
				this._computedLookAhead = this._lookAhead;
			}
			//get the frequency value to compute the value of the next loop
			var now = this.now();
			//if it's started
			var lookAhead = this._computedLookAhead * 2;
			var event = this._state.getEvent(now + lookAhead);
			var state = Tone.State.Stopped;
			if (event){
				state = event.state;
				//if it was stopped and now started
				if (this._nextTick === -1 && state === Tone.State.Started){
					this._nextTick = event.time;
					if (!this.isUndef(event.offset)){
						this.ticks = event.offset;
					}
				}
			}
			if (state === Tone.State.Started){
				while (now + lookAhead > this._nextTick){
					//catch up
					if (now > this._nextTick + this._threshold){
						this._nextTick = now;
					}
					var tickTime = this._nextTick;
					this._nextTick += 1 / this.frequency.getValueAtTime(this._nextTick);
					this.callback(tickTime);
					this.ticks++;
				}
			} else if (state === Tone.State.Stopped){
				this._nextTick = -1;
				this.ticks = 0;
			}
		};

		/**
		 *  Returns the scheduled state at the given time.
		 *  @param  {Time}  time  The time to query.
		 *  @return  {String}  The name of the state input in setStateAtTime.
		 *  @example
		 * clock.start("+0.1");
		 * clock.getStateAtTime("+0.1"); //returns "started"
		 */
		Tone.Clock.prototype.getStateAtTime = function(time){
			return this._state.getStateAtTime(time);
		};

		/**
		 *  Clean up
		 *  @returns {Tone.Clock} this
		 */
		Tone.Clock.prototype.dispose = function(){
			cancelAnimationFrame(this._loopID);
			Tone.TimelineState.prototype.dispose.call(this);
			this._writable("frequency");
			this.frequency.dispose();
			this.frequency = null;
			this._boundLoop = Tone.noOp;
			this._nextTick = Infinity;
			this.callback = null;
			this._state.dispose();
			this._state = null;
		};

		return Tone.Clock;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9), __webpack_require__(15)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class A signal which adds the method getValueAtTime. 
		 *         Code and inspiration from https://github.com/jsantell/web-audio-automation-timeline
		 *  @extends {Tone.Param}
		 *  @param {Number=} value The initial value of the signal
		 *  @param {String=} units The conversion units of the signal.
		 */
		Tone.TimelineSignal = function(){

			var options = this.optionsObject(arguments, ["value", "units"], Tone.Signal.defaults);

			//constructors
			Tone.Signal.apply(this, options);
			options.param = this._param;
			Tone.Param.call(this, options);

			/**
			 *  The scheduled events
			 *  @type {Tone.Timeline}
			 *  @private
			 */
			this._events = new Tone.Timeline(10);

			/**
			 *  The initial scheduled value
			 *  @type {Number}
			 *  @private
			 */
			this._initial = this._fromUnits(this._param.value);
		};

		Tone.extend(Tone.TimelineSignal, Tone.Param);

		/**
		 *  The event types of a schedulable signal.
		 *  @enum {String}
		 */
		Tone.TimelineSignal.Type = {
			Linear : "linear",
			Exponential : "exponential",
			Target : "target",
			Set : "set"
		};

		/**
		 * The current value of the signal. 
		 * @memberOf Tone.TimelineSignal#
		 * @type {Number}
		 * @name value
		 */
		Object.defineProperty(Tone.TimelineSignal.prototype, "value", {
			get : function(){
				return this._toUnits(this._param.value);
			},
			set : function(value){
				var convertedVal = this._fromUnits(value);
				this._initial = convertedVal;
				this._param.value = convertedVal;
			}
		});

		///////////////////////////////////////////////////////////////////////////
		//	SCHEDULING
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Schedules a parameter value change at the given time.
		 *  @param {*}	value The value to set the signal.
		 *  @param {Time}  time The time when the change should occur.
		 *  @returns {Tone.TimelineSignal} this
		 *  @example
		 * //set the frequency to "G4" in exactly 1 second from now. 
		 * freq.setValueAtTime("G4", "+1");
		 */
		Tone.TimelineSignal.prototype.setValueAtTime = function (value, startTime) {
			value = this._fromUnits(value);
			startTime = this.toSeconds(startTime);
			this._events.addEvent({
				"type" : Tone.TimelineSignal.Type.Set,
				"value" : value,
				"time" : startTime
			});
			//invoke the original event
			this._param.setValueAtTime(value, startTime);
			return this;
		};

		/**
		 *  Schedules a linear continuous change in parameter value from the 
		 *  previous scheduled parameter value to the given value.
		 *  
		 *  @param  {number} value   
		 *  @param  {Time} endTime 
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.linearRampToValueAtTime = function (value, endTime) {
			value = this._fromUnits(value);
			endTime = this.toSeconds(endTime);
			this._events.addEvent({
				"type" : Tone.TimelineSignal.Type.Linear,
				"value" : value,
				"time" : endTime
			});
			this._param.linearRampToValueAtTime(value, endTime);
			return this;
		};

		/**
		 *  Schedules an exponential continuous change in parameter value from 
		 *  the previous scheduled parameter value to the given value.
		 *  
		 *  @param  {number} value   
		 *  @param  {Time} endTime 
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.exponentialRampToValueAtTime = function (value, endTime) {
			//get the previous event and make sure it's not starting from 0
			var beforeEvent = this._searchBefore(endTime);
			if (beforeEvent && beforeEvent.value === 0){
				//reschedule that event
				this.setValueAtTime(this._minOutput, beforeEvent.time);
			}
			value = this._fromUnits(value);
			var setValue = Math.max(value, this._minOutput);
			endTime = this.toSeconds(endTime);
			this._events.addEvent({
				"type" : Tone.TimelineSignal.Type.Exponential,
				"value" : setValue,
				"time" : endTime
			});
			//if the ramped to value is 0, make it go to the min output, and then set to 0.
			if (value < this._minOutput){
				this._param.exponentialRampToValueAtTime(this._minOutput, endTime - 1 / Tone.context.sampleRate);
				this.setValueAtTime(0, endTime);
			} else {
				this._param.exponentialRampToValueAtTime(value, endTime);
			}
			return this;
		};

		/**
		 *  Start exponentially approaching the target value at the given time with
		 *  a rate having the given time constant.
		 *  @param {number} value        
		 *  @param {Time} startTime    
		 *  @param {number} timeConstant 
		 *  @returns {Tone.TimelineSignal} this 
		 */
		Tone.TimelineSignal.prototype.setTargetAtTime = function (value, startTime, timeConstant) {
			value = this._fromUnits(value);
			value = Math.max(this._minOutput, value);
			timeConstant = Math.max(this._minOutput, timeConstant);
			startTime = this.toSeconds(startTime);
			this._events.addEvent({
				"type" : Tone.TimelineSignal.Type.Target,
				"value" : value,
				"time" : startTime,
				"constant" : timeConstant
			});
			this._param.setTargetAtTime(value, startTime, timeConstant);
			return this;
		};

		/**
		 *  Cancels all scheduled parameter changes with times greater than or 
		 *  equal to startTime.
		 *  
		 *  @param  {Time} startTime
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.cancelScheduledValues = function (after) {
			this._events.cancel(after);
			this._param.cancelScheduledValues(this.toSeconds(after));
			return this;
		};

		/**
		 *  Sets the computed value at the given time. This provides
		 *  a point from which a linear or exponential curve
		 *  can be scheduled after. Will cancel events after 
		 *  the given time and shorten the currently scheduled
		 *  linear or exponential ramp so that it ends at `time` .
		 *  This is to avoid discontinuities and clicks in envelopes. 
		 *  @param {Time} time When to set the ramp point
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.setRampPoint = function (time) {
			time = this.toSeconds(time);
			//get the value at the given time
			var val = this.getValueAtTime(time);
			//if there is an event at the given time
			//and that even is not a "set"
			var before = this._searchBefore(time);
			if (before && before.time === time){
				//remove everything after
				this.cancelScheduledValues(time + this.sampleTime);
			} else {
				//reschedule the next event to end at the given time
				var after = this._searchAfter(time);
				if (after){
					//cancel the next event(s)
					this.cancelScheduledValues(time);
					if (after.type === Tone.TimelineSignal.Type.Linear){
						this.linearRampToValueAtTime(val, time);
					} else if (after.type === Tone.TimelineSignal.Type.Exponential){
						this.exponentialRampToValueAtTime(val, time);
					} 
				} 
				this.setValueAtTime(val, time);
			}
			return this;
		};

		/**
		 *  Do a linear ramp to the given value between the start and finish times.
		 *  @param {Number} value The value to ramp to.
		 *  @param {Time} start The beginning anchor point to do the linear ramp
		 *  @param {Time} finish The ending anchor point by which the value of
		 *                       the signal will equal the given value.
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.linearRampToValueBetween = function (value, start, finish) {
			this.setRampPoint(start);
			this.linearRampToValueAtTime(value, finish);
			return this;
		};

		/**
		 *  Do a exponential ramp to the given value between the start and finish times.
		 *  @param {Number} value The value to ramp to.
		 *  @param {Time} start The beginning anchor point to do the exponential ramp
		 *  @param {Time} finish The ending anchor point by which the value of
		 *                       the signal will equal the given value.
		 *  @returns {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.exponentialRampToValueBetween = function (value, start, finish) {
			this.setRampPoint(start);
			this.exponentialRampToValueAtTime(value, finish);
			return this;
		};

		///////////////////////////////////////////////////////////////////////////
		//	GETTING SCHEDULED VALUES
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Returns the value before or equal to the given time
		 *  @param  {Number}  time  The time to query
		 *  @return  {Object}  The event at or before the given time.
		 *  @private
		 */
		Tone.TimelineSignal.prototype._searchBefore = function(time){
			return this._events.getEvent(time);
		};

		/**
		 *  The event after the given time
		 *  @param  {Number}  time  The time to query.
		 *  @return  {Object}  The next event after the given time
		 *  @private
		 */
		Tone.TimelineSignal.prototype._searchAfter = function(time){
			return this._events.getEventAfter(time);
		};

		/**
		 *  Get the scheduled value at the given time. This will
		 *  return the unconverted (raw) value.
		 *  @param  {Number}  time  The time in seconds.
		 *  @return  {Number}  The scheduled value at the given time.
		 */
		Tone.TimelineSignal.prototype.getValueAtTime = function(time){
			var after = this._searchAfter(time);
			var before = this._searchBefore(time);
			var value = this._initial;
			//if it was set by
			if (before === null){
				value = this._initial;
			} else if (before.type === Tone.TimelineSignal.Type.Target){
				var previous = this._events.getEventBefore(before.time);
				var previouVal;
				if (previous === null){
					previouVal = this._initial;
				} else {
					previouVal = previous.value;
				}
				value = this._exponentialApproach(before.time, previouVal, before.value, before.constant, time);
			} else if (after === null){
				value = before.value;
			} else if (after.type === Tone.TimelineSignal.Type.Linear){
				value = this._linearInterpolate(before.time, before.value, after.time, after.value, time);
			} else if (after.type === Tone.TimelineSignal.Type.Exponential){
				value = this._exponentialInterpolate(before.time, before.value, after.time, after.value, time);
			} else {
				value = before.value;
			}
			return value;
		};

		/**
		 *  When signals connect to other signals or AudioParams, 
		 *  they take over the output value of that signal or AudioParam. 
		 *  For all other nodes, the behavior is the same as a default <code>connect</code>. 
		 *
		 *  @override
		 *  @param {AudioParam|AudioNode|Tone.Signal|Tone} node 
		 *  @param {number} [outputNumber=0] The output number to connect from.
		 *  @param {number} [inputNumber=0] The input number to connect to.
		 *  @returns {Tone.TimelineSignal} this
		 *  @method
		 */
		Tone.TimelineSignal.prototype.connect = Tone.SignalBase.prototype.connect;


		///////////////////////////////////////////////////////////////////////////
		//	AUTOMATION CURVE CALCULATIONS
		//	MIT License, copyright (c) 2014 Jordan Santell
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Calculates the the value along the curve produced by setTargetAtTime
		 *  @private
		 */
		Tone.TimelineSignal.prototype._exponentialApproach = function (t0, v0, v1, timeConstant, t) {
			return v1 + (v0 - v1) * Math.exp(-(t - t0) / timeConstant);
		};

		/**
		 *  Calculates the the value along the curve produced by linearRampToValueAtTime
		 *  @private
		 */
		Tone.TimelineSignal.prototype._linearInterpolate = function (t0, v0, t1, v1, t) {
			return v0 + (v1 - v0) * ((t - t0) / (t1 - t0));
		};

		/**
		 *  Calculates the the value along the curve produced by exponentialRampToValueAtTime
		 *  @private
		 */
		Tone.TimelineSignal.prototype._exponentialInterpolate = function (t0, v0, t1, v1, t) {
			v0 = Math.max(this._minOutput, v0);
			return v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0));
		};

		/**
		 *  Clean up.
		 *  @return {Tone.TimelineSignal} this
		 */
		Tone.TimelineSignal.prototype.dispose = function(){
			Tone.Signal.prototype.dispose.call(this);
			Tone.Param.prototype.dispose.call(this);
			this._events.dispose();
			this._events = null;
		};

		return Tone.TimelineSignal;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(10), __webpack_require__(12), __webpack_require__(13), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  A signal is an audio-rate value. Tone.Signal is a core component of the library.
		 *          Unlike a number, Signals can be scheduled with sample-level accuracy. Tone.Signal
		 *          has all of the methods available to native Web Audio 
		 *          [AudioParam](http://webaudio.github.io/web-audio-api/#the-audioparam-interface)
		 *          as well as additional conveniences. Read more about working with signals 
		 *          [here](https://github.com/Tonejs/Tone.js/wiki/Signals).
		 *
		 *  @constructor
		 *  @extends {Tone.Param}
		 *  @param {Number|AudioParam} [value] Initial value of the signal. If an AudioParam
		 *                                     is passed in, that parameter will be wrapped
		 *                                     and controlled by the Signal. 
		 *  @param {string} [units=Number] unit The units the signal is in. 
		 *  @example
		 * var signal = new Tone.Signal(10);
		 */
		Tone.Signal = function(){

			var options = this.optionsObject(arguments, ["value", "units"], Tone.Signal.defaults);

			/**
			 * The node where the constant signal value is scaled.
			 * @type {GainNode}
			 * @private
			 */
			this.output = this._gain = this.context.createGain();

			options.param = this._gain.gain;
			Tone.Param.call(this, options);

			/**
			 * The node where the value is set.
			 * @type {Tone.Param}
			 * @private
			 */
			this.input = this._param = this._gain.gain;

			//connect the const output to the node output
			Tone.Signal._constant.chain(this._gain);
		};

		Tone.extend(Tone.Signal, Tone.Param);

		/**
		 *  The default values
		 *  @type  {Object}
		 *  @static
		 *  @const
		 */
		Tone.Signal.defaults = {
			"value" : 0,
			"units" : Tone.Type.Default,
			"convert" : true,
		};

		/**
		 *  When signals connect to other signals or AudioParams, 
		 *  they take over the output value of that signal or AudioParam. 
		 *  For all other nodes, the behavior is the same as a default <code>connect</code>. 
		 *
		 *  @override
		 *  @param {AudioParam|AudioNode|Tone.Signal|Tone} node 
		 *  @param {number} [outputNumber=0] The output number to connect from.
		 *  @param {number} [inputNumber=0] The input number to connect to.
		 *  @returns {Tone.SignalBase} this
		 *  @method
		 */
		Tone.Signal.prototype.connect = Tone.SignalBase.prototype.connect;

		/**
		 *  dispose and disconnect
		 *  @returns {Tone.Signal} this
		 */
		Tone.Signal.prototype.dispose = function(){
			Tone.Param.prototype.dispose.call(this);
			this._param = null;
			this._gain.disconnect();
			this._gain = null;
			return this;
		};

		///////////////////////////////////////////////////////////////////////////
		//	STATIC
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Generates a constant output of 1.
		 *  @static
		 *  @private
		 *  @const
		 *  @type {AudioBufferSourceNode}
		 */
		Tone.Signal._constant = null;

		/**
		 *  initializer function
		 */
		Tone._initAudioContext(function(audioContext){
			var buffer = audioContext.createBuffer(1, 128, audioContext.sampleRate);
			var arr = buffer.getChannelData(0);
			for (var i = 0; i < arr.length; i++){
				arr[i] = 1;
			}
			Tone.Signal._constant = audioContext.createBufferSource();
			Tone.Signal._constant.channelCount = 1;
			Tone.Signal._constant.channelCountMode = "explicit";
			Tone.Signal._constant.buffer = buffer;
			Tone.Signal._constant.loop = true;
			Tone.Signal._constant.start(0);
			Tone.Signal._constant.noGC();
		});

		return Tone.Signal;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(11)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Wraps the native Web Audio API 
		 *         [WaveShaperNode](http://webaudio.github.io/web-audio-api/#the-waveshapernode-interface).
		 *
		 *  @extends {Tone.SignalBase}
		 *  @constructor
		 *  @param {function|Array|Number} mapping The function used to define the values. 
		 *                                    The mapping function should take two arguments: 
		 *                                    the first is the value at the current position 
		 *                                    and the second is the array position. 
		 *                                    If the argument is an array, that array will be
		 *                                    set as the wave shaping function. The input
		 *                                    signal is an AudioRange [-1, 1] value and the output
		 *                                    signal can take on any numerical values. 
		 *                                    
		 *  @param {Number} [bufferLen=1024] The length of the WaveShaperNode buffer.
		 *  @example
		 * var timesTwo = new Tone.WaveShaper(function(val){
		 * 	return val * 2;
		 * }, 2048);
		 *  @example
		 * //a waveshaper can also be constructed with an array of values
		 * var invert = new Tone.WaveShaper([1, -1]);
		 */
		Tone.WaveShaper = function(mapping, bufferLen){

			/**
			 *  the waveshaper
			 *  @type {WaveShaperNode}
			 *  @private
			 */
			this._shaper = this.input = this.output = this.context.createWaveShaper();

			/**
			 *  the waveshapers curve
			 *  @type {Float32Array}
			 *  @private
			 */
			this._curve = null;

			if (Array.isArray(mapping)){
				this.curve = mapping;
			} else if (isFinite(mapping) || this.isUndef(mapping)){
				this._curve = new Float32Array(this.defaultArg(mapping, 1024));
			} else if (this.isFunction(mapping)){
				this._curve = new Float32Array(this.defaultArg(bufferLen, 1024));
				this.setMap(mapping);
			} 
		};

		Tone.extend(Tone.WaveShaper, Tone.SignalBase);

		/**
		 *  Uses a mapping function to set the value of the curve. 
		 *  @param {function} mapping The function used to define the values. 
		 *                            The mapping function take two arguments: 
		 *                            the first is the value at the current position 
		 *                            which goes from -1 to 1 over the number of elements
		 *                            in the curve array. The second argument is the array position. 
		 *  @returns {Tone.WaveShaper} this
		 *  @example
		 * //map the input signal from [-1, 1] to [0, 10]
		 * shaper.setMap(function(val, index){
		 * 	return (val + 1) * 5;
		 * })
		 */
		Tone.WaveShaper.prototype.setMap = function(mapping){
			for (var i = 0, len = this._curve.length; i < len; i++){
				var normalized = (i / (len)) * 2 - 1;
				this._curve[i] = mapping(normalized, i);
			}
			this._shaper.curve = this._curve;
			return this;
		};

		/**
		 * The array to set as the waveshaper curve. For linear curves
		 * array length does not make much difference, but for complex curves
		 * longer arrays will provide smoother interpolation. 
		 * @memberOf Tone.WaveShaper#
		 * @type {Array}
		 * @name curve
		 */
		Object.defineProperty(Tone.WaveShaper.prototype, "curve", {
			get : function(){
				return this._shaper.curve;
			},
			set : function(mapping){
				this._curve = new Float32Array(mapping);
				this._shaper.curve = this._curve;
			}
		});

		/**
		 * Specifies what type of oversampling (if any) should be used when 
		 * applying the shaping curve. Can either be "none", "2x" or "4x". 
		 * @memberOf Tone.WaveShaper#
		 * @type {string}
		 * @name oversample
		 */
		Object.defineProperty(Tone.WaveShaper.prototype, "oversample", {
			get : function(){
				return this._shaper.oversample;
			},
			set : function(oversampling){
				if (["none", "2x", "4x"].indexOf(oversampling) !== -1){
					this._shaper.oversample = oversampling;
				} else {
					throw new Error("invalid oversampling: "+oversampling);
				}
			}
		});

		/**
		 *  Clean up.
		 *  @returns {Tone.WaveShaper} this
		 */
		Tone.WaveShaper.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._shaper.disconnect();
			this._shaper = null;
			this._curve = null;
			return this;
		};

		return Tone.WaveShaper;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Base class for all Signals. Used Internally. 
		 *
		 *  @constructor
		 *  @extends {Tone}
		 */
		Tone.SignalBase = function(){};

		Tone.extend(Tone.SignalBase);

		/**
		 *  When signals connect to other signals or AudioParams, 
		 *  they take over the output value of that signal or AudioParam. 
		 *  For all other nodes, the behavior is the same as a default <code>connect</code>. 
		 *
		 *  @override
		 *  @param {AudioParam|AudioNode|Tone.Signal|Tone} node 
		 *  @param {number} [outputNumber=0] The output number to connect from.
		 *  @param {number} [inputNumber=0] The input number to connect to.
		 *  @returns {Tone.SignalBase} this
		 */
		Tone.SignalBase.prototype.connect = function(node, outputNumber, inputNumber){
			//zero it out so that the signal can have full control
			if ((Tone.Signal && Tone.Signal === node.constructor) || 
					(Tone.Param && Tone.Param === node.constructor) || 
					(Tone.TimelineSignal && Tone.TimelineSignal === node.constructor)){
				//cancel changes
				node._param.cancelScheduledValues(0);
				//reset the value
				node._param.value = 0;
				//mark the value as overridden
				node.overridden = true;
			} else if (node instanceof AudioParam){
				node.cancelScheduledValues(0);
				node.value = 0;
			} 
			Tone.prototype.connect.call(this, node, outputNumber, inputNumber);
			return this;
		};

		return Tone.SignalBase;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		///////////////////////////////////////////////////////////////////////////
		//	TYPES
		///////////////////////////////////////////////////////////////////////////

		/**
		 * Units which a value can take on.
		 * @enum {String}
		 */
		Tone.Type = {
			/** 
			 *  The default value is a number which can take on any value between [-Infinity, Infinity]
			 */
			Default : "number",
			/**
			 *  Time can be described in a number of ways. Read more [Time](https://github.com/Tonejs/Tone.js/wiki/Time).
			 *
			 *  <ul>
			 *  <li>Numbers, which will be taken literally as the time (in seconds).</li>
			 *  <li>Notation, ("4n", "8t") describes time in BPM and time signature relative values.</li>
			 *  <li>TransportTime, ("4:3:2") will also provide tempo and time signature relative times 
			 *  in the form BARS:QUARTERS:SIXTEENTHS.</li>
			 *  <li>Frequency, ("8hz") is converted to the length of the cycle in seconds.</li>
			 *  <li>Now-Relative, ("+1") prefix any of the above with "+" and it will be interpreted as 
			 *  "the current time plus whatever expression follows".</li>
			 *  <li>Expressions, ("3:0 + 2 - (1m / 7)") any of the above can also be combined 
			 *  into a mathematical expression which will be evaluated to compute the desired time.</li>
			 *  <li>No Argument, for methods which accept time, no argument will be interpreted as 
			 *  "now" (i.e. the currentTime).</li>
			 *  </ul>
			 *  
			 *  @typedef {Time}
			 */
			Time : "time",
			/**
			 *  Frequency can be described similar to time, except ultimately the
			 *  values are converted to frequency instead of seconds. A number
			 *  is taken literally as the value in hertz. Additionally any of the 
			 *  Time encodings can be used. Note names in the form
			 *  of NOTE OCTAVE (i.e. C4) are also accepted and converted to their
			 *  frequency value. 
			 *  @typedef {Frequency}
			 */
			Frequency : "frequency",
			/** 
			 *  Normal values are within the range [0, 1].
			 *  @typedef {NormalRange}
			 */
			NormalRange : "normalRange",
			/** 
			 *  AudioRange values are between [-1, 1].
			 *  @typedef {AudioRange}
			 */
			AudioRange : "audioRange",
			/** 
			 *  Decibels are a logarithmic unit of measurement which is useful for volume
			 *  because of the logarithmic way that we perceive loudness. 0 decibels 
			 *  means no change in volume. -10db is approximately half as loud and 10db 
			 *  is twice is loud. 
			 *  @typedef {Decibels}
			 */
			Decibels : "db",
			/** 
			 *  Half-step note increments, i.e. 12 is an octave above the root. and 1 is a half-step up.
			 *  @typedef {Interval}
			 */
			Interval : "interval",
			/** 
			 *  Beats per minute. 
			 *  @typedef {BPM}
			 */
			BPM : "bpm",
			/** 
			 *  The value must be greater than or equal to 0.
			 *  @typedef {Positive}
			 */
			Positive : "positive",
			/** 
			 *  A cent is a hundredth of a semitone. 
			 *  @typedef {Cents}
			 */
			Cents : "cents",
			/** 
			 *  Angle between 0 and 360. 
			 *  @typedef {Degrees}
			 */
			Degrees : "degrees",
			/** 
			 *  A number representing a midi note.
			 *  @typedef {MIDI}
			 */
			MIDI : "midi",
			/** 
			 *  A colon-separated representation of time in the form of
			 *  BARS:QUARTERS:SIXTEENTHS. 
			 *  @typedef {TransportTime}
			 */
			TransportTime : "transportTime",
			/** 
			 *  Ticks are the basic subunit of the Transport. They are
			 *  the smallest unit of time that the Transport supports.
			 *  @typedef {Ticks}
			 */
			Ticks : "tick",
			/** 
			 *  A frequency represented by a letter name, 
			 *  accidental and octave. This system is known as
			 *  [Scientific Pitch Notation](https://en.wikipedia.org/wiki/Scientific_pitch_notation).
			 *  @typedef {Note}
			 */
			Note : "note",
			/** 
			 *  One millisecond is a thousandth of a second. 
			 *  @typedef {Milliseconds}
			 */
			Milliseconds : "milliseconds",
			/** 
			 *  A string representing a duration relative to a measure. 
			 *  <ul>
			 *  	<li>"4n" = quarter note</li>
			 *   	<li>"2m" = two measures</li>
			 *    	<li>"8t" = eighth-note triplet</li>
			 *  </ul>
			 *  @typedef {Notation}
			 */
			Notation : "notation",
		};

		///////////////////////////////////////////////////////////////////////////
		//	MATCHING TESTS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Test if a function is "now-relative", i.e. starts with "+".
		 *  
		 *  @param {String} str The string to test
		 *  @return {boolean} 
		 *  @method isNowRelative
		 *  @lends Tone.prototype.isNowRelative
		 */
		Tone.prototype.isNowRelative = (function(){
			var nowRelative = new RegExp(/^\s*\+(.)+/i);
			return function(note){
				return nowRelative.test(note);
			};
		})();

		/**
		 *  Tests if a string is in Ticks notation. 
		 *  
		 *  @param {String} str The string to test
		 *  @return {boolean} 
		 *  @method isTicks
		 *  @lends Tone.prototype.isTicks
		 */
		Tone.prototype.isTicks = (function(){
			var tickFormat = new RegExp(/^\d+i$/i);
			return function(note){
				return tickFormat.test(note);
			};
		})();

		/**
		 *  Tests if a string is musical notation.
		 *  i.e.:
		 *  <ul>
		 *  	<li>4n = quarter note</li>
		 *   	<li>2m = two measures</li>
		 *    	<li>8t = eighth-note triplet</li>
		 *  </ul>
		 *  
		 *  @param {String} str The string to test
		 *  @return {boolean} 
		 *  @method isNotation
		 *  @lends Tone.prototype.isNotation
		 */
		Tone.prototype.isNotation = (function(){
			var notationFormat = new RegExp(/^[0-9]+[mnt]$/i);
			return function(note){
				return notationFormat.test(note);
			};
		})();

		/**
		 *  Test if a string is in the transportTime format. 
		 *  "Bars:Beats:Sixteenths"
		 *  @param {String} transportTime
		 *  @return {boolean} 
		 *  @method isTransportTime
		 *  @lends Tone.prototype.isTransportTime
		 */
		Tone.prototype.isTransportTime = (function(){
			var transportTimeFormat = new RegExp(/^(\d+(\.\d+)?\:){1,2}(\d+(\.\d+)?)?$/i);
			return function(transportTime){
				return transportTimeFormat.test(transportTime);
			};
		})();

		/**
		 *  Test if a string is in Scientific Pitch Notation: i.e. "C4". 
		 *  @param  {String}  note The note to test
		 *  @return {boolean}      true if it's in the form of a note
		 *  @method isNote
		 *  @lends Tone.prototype.isNote
		 *  @function
		 */
		Tone.prototype.isNote = ( function(){
			var noteFormat = new RegExp(/^[a-g]{1}(b|#|x|bb)?-?[0-9]+$/i);
			return function(note){
				return noteFormat.test(note);
			};
		})();

		/**
		 *  Test if the input is in the format of number + hz
		 *  i.e.: 10hz
		 *
		 *  @param {String} freq 
		 *  @return {boolean} 
		 *  @function
		 */
		Tone.prototype.isFrequency = (function(){
			var freqFormat = new RegExp(/^\d*\.?\d+hz$/i);
			return function(freq){
				return freqFormat.test(freq);
			};
		})();

		///////////////////////////////////////////////////////////////////////////
		//	TO SECOND CONVERSIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  @private
		 *  @return  {Object}  The Transport's BPM if the Transport exists, 
		 *                         otherwise returns reasonable defaults.
		 */
		function getTransportBpm(){
			if (Tone.Transport && Tone.Transport.bpm){
				return Tone.Transport.bpm.value;
			} else {
				return 120;
			}
		}

		/**
		 *  @private
		 *  @return  {Object}  The Transport's Time Signature if the Transport exists, 
		 *                         otherwise returns reasonable defaults.
		 */
		function getTransportTimeSignature(){
			if (Tone.Transport && Tone.Transport.timeSignature){
				return Tone.Transport.timeSignature;
			} else {
				return 4;
			}
		}

		/**
		 *
		 *  convert notation format strings to seconds
		 *  
		 *  @param  {String} notation     
		 *  @param {BPM=} bpm 
		 *  @param {number=} timeSignature 
		 *  @return {number} 
		 *                
		 */
		Tone.prototype.notationToSeconds = function(notation, bpm, timeSignature){
			bpm = this.defaultArg(bpm, getTransportBpm());
			timeSignature = this.defaultArg(timeSignature, getTransportTimeSignature());
			var beatTime = (60 / bpm);
			//special case: 1n = 1m
			if (notation === "1n"){
				notation = "1m";
			}
			var subdivision = parseInt(notation, 10);
			var beats = 0;
			if (subdivision === 0){
				beats = 0;
			}
			var lastLetter = notation.slice(-1);
			if (lastLetter === "t"){
				beats = (4 / subdivision) * 2/3;
			} else if (lastLetter === "n"){
				beats = 4 / subdivision;
			} else if (lastLetter === "m"){
				beats = subdivision * timeSignature;
			} else {
				beats = 0;
			}
			return beatTime * beats;
		};

		/**
		 *  convert transportTime into seconds.
		 *  
		 *  ie: 4:2:3 == 4 measures + 2 quarters + 3 sixteenths
		 *
		 *  @param  {TransportTime} transportTime 
		 *  @param {BPM=} bpm 
		 *  @param {number=} timeSignature
		 *  @return {number}               seconds
		 */
		Tone.prototype.transportTimeToSeconds = function(transportTime, bpm, timeSignature){
			bpm = this.defaultArg(bpm, getTransportBpm());
			timeSignature = this.defaultArg(timeSignature, getTransportTimeSignature());
			var measures = 0;
			var quarters = 0;
			var sixteenths = 0;
			var split = transportTime.split(":");
			if (split.length === 2){
				measures = parseFloat(split[0]);
				quarters = parseFloat(split[1]);
			} else if (split.length === 1){
				quarters = parseFloat(split[0]);
			} else if (split.length === 3){
				measures = parseFloat(split[0]);
				quarters = parseFloat(split[1]);
				sixteenths = parseFloat(split[2]);
			}
			var beats = (measures * timeSignature + quarters + sixteenths / 4);
			return beats * (60/bpm);
		};
		
		/**
		 *  Convert ticks into seconds
		 *  @param  {Ticks} ticks 
		 *  @param {BPM=} bpm 
		 *  @return {number}               seconds
		 */
		Tone.prototype.ticksToSeconds = function(ticks, bpm){
			if (this.isUndef(Tone.Transport)){
				return 0;
			}
			ticks = parseFloat(ticks);
			bpm = this.defaultArg(bpm, getTransportBpm());
			var tickTime = (60/bpm) / Tone.Transport.PPQ;
			return tickTime * ticks;
		};

		/**
		 *  Convert a frequency into seconds.
		 *  Accepts numbers and strings: i.e. "10hz" or 
		 *  10 both return 0.1. 
		 *  
		 *  @param  {Frequency} freq 
		 *  @return {number}      
		 */
		Tone.prototype.frequencyToSeconds = function(freq){
			return 1 / parseFloat(freq);
		};

		/**
		 *  Convert a sample count to seconds.
		 *  @param  {number} samples 
		 *  @return {number}         
		 */
		Tone.prototype.samplesToSeconds = function(samples){
			return samples / this.context.sampleRate;
		};

		/**
		 *  Convert from seconds to samples. 
		 *  @param  {number} seconds 
		 *  @return {number} The number of samples        
		 */
		Tone.prototype.secondsToSamples = function(seconds){
			return seconds * this.context.sampleRate;
		};

		///////////////////////////////////////////////////////////////////////////
		//	FROM SECOND CONVERSIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Convert seconds to transportTime in the form 
		 *  	"measures:quarters:sixteenths"
		 *
		 *  @param {Number} seconds 
		 *  @param {BPM=} bpm 
		 *  @param {Number=} timeSignature
		 *  @return {TransportTime}  
		 */
		Tone.prototype.secondsToTransportTime = function(seconds, bpm, timeSignature){
			bpm = this.defaultArg(bpm, getTransportBpm());
			timeSignature = this.defaultArg(timeSignature, getTransportTimeSignature());
			var quarterTime = 60/bpm;
			var quarters = seconds / quarterTime;
			var measures = Math.floor(quarters / timeSignature);
			var sixteenths = (quarters % 1) * 4;
			quarters = Math.floor(quarters) % timeSignature;
			var progress = [measures, quarters, sixteenths];
			return progress.join(":");
		};

		/**
		 *  Convert a number in seconds to a frequency.
		 *  @param  {number} seconds 
		 *  @return {number}         
		 */
		Tone.prototype.secondsToFrequency = function(seconds){
			return 1/seconds;
		};

		///////////////////////////////////////////////////////////////////////////
		//	GENERALIZED CONVERSIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Convert seconds to the closest transportTime in the form 
		 *  	measures:quarters:sixteenths
		 *
		 *  @method toTransportTime
		 *  
		 *  @param {Time} time 
		 *  @param {BPM=} bpm 
		 *  @param {number=} timeSignature
		 *  @return {TransportTime}  
		 *  
		 *  @lends Tone.prototype.toTransportTime
		 */
		Tone.prototype.toTransportTime = function(time, bpm, timeSignature){
			var seconds = this.toSeconds(time);
			return this.secondsToTransportTime(seconds, bpm, timeSignature);
		};

		/**
		 *  Convert a frequency representation into a number.
		 *  	
		 *  @param  {Frequency} freq 
		 *  @param {number=} 	now 	if passed in, this number will be 
		 *                        		used for all 'now' relative timings
		 *  @return {number}      the frequency in hertz
		 */
		Tone.prototype.toFrequency = function(freq, now){
			if (this.isFrequency(freq)){
				return parseFloat(freq);
			} else if (this.isNotation(freq) || this.isTransportTime(freq)) {
				return this.secondsToFrequency(this.toSeconds(freq, now));
			} else if (this.isNote(freq)){
				return this.noteToFrequency(freq);
			} else {
				return freq;
			}
		};

		/**
		 *  Convert the time representation into ticks.
		 *  Now-Relative timing will be relative to the current
		 *  Tone.Transport.ticks. 
		 *  @param  {Time} time
		 *  @return {Ticks}   
		 */
		Tone.prototype.toTicks = function(time){
			if (this.isUndef(Tone.Transport)){
				return 0;
			}
			var bpm = Tone.Transport.bpm.value;
			//get the seconds
			var plusNow = 0;
			if (this.isNowRelative(time)){
				time = time.replace("+", "");
				plusNow = Tone.Transport.ticks;
			} else if (this.isUndef(time)){
				return Tone.Transport.ticks;
			}
			var seconds = this.toSeconds(time);
			var quarter = 60/bpm;
			var quarters = seconds / quarter;
			var tickNum = quarters * Tone.Transport.PPQ;
			//align the tick value
			return Math.round(tickNum + plusNow);
		};

		/**
		 *  convert a time into samples
		 *  
		 *  @param  {Time} time
		 *  @return {number}         
		 */
		Tone.prototype.toSamples = function(time){
			var seconds = this.toSeconds(time);
			return Math.round(seconds * this.context.sampleRate);
		};

		/**
		 *  Convert Time into seconds.
		 *  
		 *  Unlike the method which it overrides, this takes into account 
		 *  transporttime and musical notation.
		 *
		 *  Time : 1.40
		 *  Notation: 4n|1m|2t
		 *  TransportTime: 2:4:1 (measure:quarters:sixteens)
		 *  Now Relative: +3n
		 *  Math: 3n+16n or even complicated expressions ((3n*2)/6 + 1)
		 *
		 *  @override
		 *  @param  {Time} time       
		 *  @param {number=} 	now 	if passed in, this number will be 
		 *                        		used for all 'now' relative timings
		 *  @return {number} 
		 */
		Tone.prototype.toSeconds = function(time, now){
			now = this.defaultArg(now, this.now());
			if (this.isNumber(time)){
				return time; //assuming that it's seconds
			} else if (this.isString(time)){
				var plusTime = 0;
				if(this.isNowRelative(time)) {
					time = time.replace("+", "");
					plusTime = now;
				} 
				var betweenParens = time.match(/\(([^)(]+)\)/g);
				if (betweenParens){
					//evaluate the expressions between the parenthesis
					for (var j = 0; j < betweenParens.length; j++){
						//remove the parens
						var symbol = betweenParens[j].replace(/[\(\)]/g, "");
						var symbolVal = this.toSeconds(symbol);
						time = time.replace(betweenParens[j], symbolVal);
					}
				}
				//test if it is quantized
				if (time.indexOf("@") !== -1){
					var quantizationSplit = time.split("@");
					if (!this.isUndef(Tone.Transport)){
						var toQuantize = quantizationSplit[0].trim();
						//if there's no argument it should be evaluated as the current time
						if (toQuantize === ""){
							toQuantize = undefined;
						} 
						//if it's now-relative, it should be evaluated by `quantize`
						if (plusTime > 0){
							toQuantize = "+" + toQuantize;
							plusTime = 0;
						}
						var subdivision = quantizationSplit[1].trim();
						time = Tone.Transport.quantize(toQuantize, subdivision);
					} else {
						throw new Error("quantization requires Tone.Transport");
					}
				} else {
					var components = time.split(/[\(\)\-\+\/\*]/);
					if (components.length > 1){
						var originalTime = time;
						for(var i = 0; i < components.length; i++){
							var symb = components[i].trim();
							if (symb !== ""){
								var val = this.toSeconds(symb);
								time = time.replace(symb, val);
							}
						}
						try {
							//eval is evil
							time = eval(time); // jshint ignore:line
						} catch (e){
							throw new EvalError("cannot evaluate Time: "+originalTime);
						}
					} else if (this.isNotation(time)){
						time = this.notationToSeconds(time);
					} else if (this.isTransportTime(time)){
						time = this.transportTimeToSeconds(time);
					} else if (this.isFrequency(time)){
						time = this.frequencyToSeconds(time);
					} else if (this.isTicks(time)){
						time = this.ticksToSeconds(time);
					} else {
						time = parseFloat(time);
					}
				}
				return time + plusTime;
			} else {
				return now;
			}
		};


		/**
		 *  Convert a Time to Notation. Values will be thresholded to the nearest 128th note. 
		 *  @param {Time} time 
		 *  @param {BPM=} bpm 
		 *  @param {number=} timeSignature
		 *  @return {Notation}  
		 */
		Tone.prototype.toNotation = function(time, bpm, timeSignature){
			var testNotations = ["1m", "2n", "4n", "8n", "16n", "32n", "64n", "128n"];
			var retNotation = toNotationHelper.call(this, time, bpm, timeSignature, testNotations);
			//try the same thing but with tripelets
			var testTripletNotations = ["1m", "2n", "2t", "4n", "4t", "8n", "8t", "16n", "16t", "32n", "32t", "64n", "64t", "128n"];
			var retTripletNotation = toNotationHelper.call(this, time, bpm, timeSignature, testTripletNotations);
			//choose the simpler expression of the two
			if (retTripletNotation.split("+").length < retNotation.split("+").length){
				return retTripletNotation;
			} else {
				return retNotation;
			}
		};

		/**
		 *  Helper method for Tone.toNotation
		 *  @private
		 */
		function toNotationHelper(time, bpm, timeSignature, testNotations){
			var seconds = this.toSeconds(time);
			var threshold = this.notationToSeconds(testNotations[testNotations.length - 1], bpm, timeSignature);
			var retNotation = "";
			for (var i = 0; i < testNotations.length; i++){
				var notationTime = this.notationToSeconds(testNotations[i], bpm, timeSignature);
				//account for floating point errors (i.e. round up if the value is 0.999999)
				var multiple = seconds / notationTime;
				var floatingPointError = 0.000001;
				if (1 - multiple % 1 < floatingPointError){
					multiple += floatingPointError;
				}
				multiple = Math.floor(multiple);
				if (multiple > 0){
					if (multiple === 1){
						retNotation += testNotations[i];
					} else {
						retNotation += multiple.toString() + "*" + testNotations[i];
					}
					seconds -= multiple * notationTime;
					if (seconds < threshold){
						break;
					} else {
						retNotation += " + ";
					}
				}
			}
			if (retNotation === ""){
				retNotation = "0";
			}
			return retNotation;
		}

		/**
		 *  Convert the given value from the type specified by units
		 *  into a number.
		 *  @param  {*} val the value to convert
		 *  @return {Number}     the number which the value should be set to
		 */
		Tone.prototype.fromUnits = function(val, units){
			if (this.convert || this.isUndef(this.convert)){
				switch(units){
					case Tone.Type.Time: 
						return this.toSeconds(val);
					case Tone.Type.Frequency: 
						return this.toFrequency(val);
					case Tone.Type.Decibels: 
						return this.dbToGain(val);
					case Tone.Type.NormalRange: 
						return Math.min(Math.max(val, 0), 1);
					case Tone.Type.AudioRange: 
						return Math.min(Math.max(val, -1), 1);
					case Tone.Type.Positive: 
						return Math.max(val, 0);
					default:
						return val;
				}
			} else {
				return val;
			}
		};

		/**
		 * Convert a number to the specified units.
		 * @param  {number} val the value to convert
		 * @return {number}
		 */
		Tone.prototype.toUnits = function(val, units){
			if (this.convert || this.isUndef(this.convert)){
				switch(units){
					case Tone.Type.Decibels: 
						return this.gainToDb(val);
					default:
						return val;
				}
			} else {
				return val;
			}
		};

		///////////////////////////////////////////////////////////////////////////
		//	FREQUENCY CONVERSIONS
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Note to scale index
		 *  @type  {Object}
		 */
		var noteToScaleIndex = {
			"cbb" : -2, "cb" : -1, "c" : 0,  "c#" : 1,  "cx" : 2, 
			"dbb" : 0,  "db" : 1,  "d" : 2,  "d#" : 3,  "dx" : 4,
			"ebb" : 2,  "eb" : 3,  "e" : 4,  "e#" : 5,  "ex" : 6, 
			"fbb" : 3,  "fb" : 4,  "f" : 5,  "f#" : 6,  "fx" : 7,
			"gbb" : 5,  "gb" : 6,  "g" : 7,  "g#" : 8,  "gx" : 9,
			"abb" : 7,  "ab" : 8,  "a" : 9,  "a#" : 10, "ax" : 11,
			"bbb" : 9,  "bb" : 10, "b" : 11, "b#" : 12, "bx" : 13,
		};

		/**
		 *  scale index to note (sharps)
		 *  @type  {Array}
		 */
		var scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

		/**
		 *  The [concert pitch](https://en.wikipedia.org/wiki/Concert_pitch, 
		 *  A4's values in Hertz. 
		 *  @type {Frequency}
		 *  @static
		 */
		Tone.A4 = 440;

		/**
		 *  Convert a note name to frequency. 
		 *  @param  {String} note
		 *  @return {number}     
		 *  @example
		 * var freq = tone.noteToFrequency("A4"); //returns 440
		 */
		Tone.prototype.noteToFrequency = function(note){
			//break apart the note by frequency and octave
			var parts = note.split(/(-?\d+)/);
			if (parts.length === 3){
				var index = noteToScaleIndex[parts[0].toLowerCase()];
				var octave = parts[1];
				var noteNumber = index + (parseInt(octave, 10) + 1) * 12;
				return this.midiToFrequency(noteNumber);
			} else {
				return 0;
			}
		};

		/**
		 *  Convert a frequency to a note name (i.e. A4, C#5).
		 *  @param  {number} freq
		 *  @return {String}         
		 */
		Tone.prototype.frequencyToNote = function(freq){
			var log = Math.log(freq / Tone.A4) / Math.LN2;
			var noteNumber = Math.round(12 * log) + 57;
			var octave = Math.floor(noteNumber/12);
			if(octave < 0){
				noteNumber += -12 * octave;
			}
			var noteName = scaleIndexToNote[noteNumber % 12];
			return noteName + octave.toString();
		};

		/**
		 *  Convert an interval (in semitones) to a frequency ratio.
		 *
		 *  @param  {Interval} interval the number of semitones above the base note
		 *  @return {number}          the frequency ratio
		 *  @example
		 * tone.intervalToFrequencyRatio(0); // returns 1
		 * tone.intervalToFrequencyRatio(12); // returns 2
		 */
		Tone.prototype.intervalToFrequencyRatio = function(interval){
			return Math.pow(2,(interval/12));
		};

		/**
		 *  Convert a midi note number into a note name. 
		 *
		 *  @param  {MIDI} midiNumber the midi note number
		 *  @return {String}            the note's name and octave
		 *  @example
		 * tone.midiToNote(60); // returns "C3"
		 */
		Tone.prototype.midiToNote = function(midiNumber){
			var octave = Math.floor(midiNumber / 12) - 1;
			var note = midiNumber % 12;
			return scaleIndexToNote[note] + octave;
		};

		/**
		 *  Convert a note to it's midi value. 
		 *
		 *  @param  {String} note the note name (i.e. "C3")
		 *  @return {MIDI} the midi value of that note
		 *  @example
		 * tone.noteToMidi("C3"); // returns 60
		 */
		Tone.prototype.noteToMidi = function(note){
			//break apart the note by frequency and octave
			var parts = note.split(/(\d+)/);
			if (parts.length === 3){
				var index = noteToScaleIndex[parts[0].toLowerCase()];
				var octave = parts[1];
				return index + (parseInt(octave, 10) + 1) * 12;
			} else {
				return 0;
			}
		};

		/**
		 *  Convert a MIDI note to frequency value. 
		 *
		 *  @param  {MIDI} midi The midi number to convert.
		 *  @return {Frequency} the corresponding frequency value
		 *  @example
		 * tone.midiToFrequency(57); // returns 440
		 */
		Tone.prototype.midiToFrequency = function(midi){
			return Tone.A4 * Math.pow(2, (midi - 69) / 12);
		};

		return Tone;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 13 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.Param wraps the native Web Audio's AudioParam to provide
		 *         additional unit conversion functionality. It also
		 *         serves as a base-class for classes which have a single,
		 *         automatable parameter. 
		 *  @extends {Tone}
		 *  @param  {AudioParam}  param  The parameter to wrap.
		 *  @param  {Tone.Type} units The units of the audio param.
		 *  @param  {Boolean} convert If the param should be converted.
		 */
		Tone.Param = function(){

			var options = this.optionsObject(arguments, ["param", "units", "convert"], Tone.Param.defaults);

			/**
			 *  The native parameter to control
			 *  @type  {AudioParam}
			 *  @private
			 */
			this._param = this.input = options.param;

			/**
			 *  The units of the parameter
			 *  @type {Tone.Type}
			 */
			this.units = options.units;

			/**
			 *  If the value should be converted or not
			 *  @type {Boolean}
			 */
			this.convert = options.convert;

			/**
			 *  True if the signal value is being overridden by 
			 *  a connected signal.
			 *  @readOnly
			 *  @type  {boolean}
			 *  @private
			 */
			this.overridden = false;

			if (!this.isUndef(options.value)){
				this.value = options.value;
			}
		};

		Tone.extend(Tone.Param);
		
		/**
		 *  Defaults
		 *  @type  {Object}
		 *  @const
		 */
		Tone.Param.defaults = {
			"units" : Tone.Type.Default,
			"convert" : true,
			"param" : undefined
		};

		/**
		 * The current value of the parameter. 
		 * @memberOf Tone.Param#
		 * @type {Number}
		 * @name value
		 */
		Object.defineProperty(Tone.Param.prototype, "value", {
			get : function(){
				return this._toUnits(this._param.value);
			},
			set : function(value){
				var convertedVal = this._fromUnits(value);
				this._param.value = convertedVal;
			}
		});

		/**
		 *  Convert the given value from the type specified by Tone.Param.units
		 *  into the destination value (such as Gain or Frequency).
		 *  @private
		 *  @param  {*} val the value to convert
		 *  @return {number}     the number which the value should be set to
		 */
		Tone.Param.prototype._fromUnits = function(val){
			if (this.convert || this.isUndef(this.convert)){
				switch(this.units){
					case Tone.Type.Time: 
						return this.toSeconds(val);
					case Tone.Type.Frequency: 
						return this.toFrequency(val);
					case Tone.Type.Decibels: 
						return this.dbToGain(val);
					case Tone.Type.NormalRange: 
						return Math.min(Math.max(val, 0), 1);
					case Tone.Type.AudioRange: 
						return Math.min(Math.max(val, -1), 1);
					case Tone.Type.Positive: 
						return Math.max(val, 0);
					default:
						return val;
				}
			} else {
				return val;
			}
		};

		/**
		 * Convert the parameters value into the units specified by Tone.Param.units.
		 * @private
		 * @param  {number} val the value to convert
		 * @return {number}
		 */
		Tone.Param.prototype._toUnits = function(val){
			if (this.convert || this.isUndef(this.convert)){
				switch(this.units){
					case Tone.Type.Decibels: 
						return this.gainToDb(val);
					default:
						return val;
				}
			} else {
				return val;
			}
		};

		/**
		 *  the minimum output value
		 *  @type {Number}
		 *  @private
		 */
		Tone.Param.prototype._minOutput = 0.00001;

		/**
		 *  Schedules a parameter value change at the given time.
		 *  @param {*}	value The value to set the signal.
		 *  @param {Time}  time The time when the change should occur.
		 *  @returns {Tone.Param} this
		 *  @example
		 * //set the frequency to "G4" in exactly 1 second from now. 
		 * freq.setValueAtTime("G4", "+1");
		 */
		Tone.Param.prototype.setValueAtTime = function(value, time){
			value = this._fromUnits(value);
			this._param.setValueAtTime(value, this.toSeconds(time));
			return this;
		};

		/**
		 *  Creates a schedule point with the current value at the current time.
		 *  This is useful for creating an automation anchor point in order to 
		 *  schedule changes from the current value. 
		 *
		 *  @param {number=} now (Optionally) pass the now value in. 
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.setRampPoint = function(now){
			now = this.defaultArg(now, this.now());
			var currentVal = this._param.value;
			this._param.setValueAtTime(currentVal, now);
			return this;
		};

		/**
		 *  Schedules a linear continuous change in parameter value from the 
		 *  previous scheduled parameter value to the given value.
		 *  
		 *  @param  {number} value   
		 *  @param  {Time} endTime 
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.linearRampToValueAtTime = function(value, endTime){
			value = this._fromUnits(value);
			this._param.linearRampToValueAtTime(value, this.toSeconds(endTime));
			return this;
		};

		/**
		 *  Schedules an exponential continuous change in parameter value from 
		 *  the previous scheduled parameter value to the given value.
		 *  
		 *  @param  {number} value   
		 *  @param  {Time} endTime 
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.exponentialRampToValueAtTime = function(value, endTime){
			value = this._fromUnits(value);
			value = Math.max(this._minOutput, value);
			this._param.exponentialRampToValueAtTime(value, this.toSeconds(endTime));
			return this;
		};

		/**
		 *  Schedules an exponential continuous change in parameter value from 
		 *  the current time and current value to the given value over the 
		 *  duration of the rampTime.
		 *  
		 *  @param  {number} value   The value to ramp to.
		 *  @param  {Time} rampTime the time that it takes the 
		 *                               value to ramp from it's current value
		 *  @returns {Tone.Param} this
		 *  @example
		 * //exponentially ramp to the value 2 over 4 seconds. 
		 * signal.exponentialRampToValue(2, 4);
		 */
		Tone.Param.prototype.exponentialRampToValue = function(value, rampTime){
			var now = this.now();
			// exponentialRampToValueAt cannot ever ramp from 0, apparently.
			// More info: https://bugzilla.mozilla.org/show_bug.cgi?id=1125600#c2
			var currentVal = this.value;
			this.setValueAtTime(Math.max(currentVal, this._minOutput), now);
			this.exponentialRampToValueAtTime(value, now + this.toSeconds(rampTime));
			return this;
		};

		/**
		 *  Schedules an linear continuous change in parameter value from 
		 *  the current time and current value to the given value over the 
		 *  duration of the rampTime.
		 *  
		 *  @param  {number} value   The value to ramp to.
		 *  @param  {Time} rampTime the time that it takes the 
		 *                               value to ramp from it's current value
		 *  @returns {Tone.Param} this
		 *  @example
		 * //linearly ramp to the value 4 over 3 seconds. 
		 * signal.linearRampToValue(4, 3);
		 */
		Tone.Param.prototype.linearRampToValue = function(value, rampTime){
			var now = this.now();
			this.setRampPoint(now);
			this.linearRampToValueAtTime(value, now + this.toSeconds(rampTime));
			return this;
		};

		/**
		 *  Start exponentially approaching the target value at the given time with
		 *  a rate having the given time constant.
		 *  @param {number} value        
		 *  @param {Time} startTime    
		 *  @param {number} timeConstant 
		 *  @returns {Tone.Param} this 
		 */
		Tone.Param.prototype.setTargetAtTime = function(value, startTime, timeConstant){
			value = this._fromUnits(value);
			// The value will never be able to approach without timeConstant > 0.
			// http://www.w3.org/TR/webaudio/#dfn-setTargetAtTime, where the equation
			// is described. 0 results in a division by 0.
			value = Math.max(this._minOutput, value);
			timeConstant = Math.max(this._minOutput, timeConstant);
			this._param.setTargetAtTime(value, this.toSeconds(startTime), timeConstant);
			return this;
		};

		/**
		 *  Sets an array of arbitrary parameter values starting at the given time
		 *  for the given duration.
		 *  	
		 *  @param {Array} values    
		 *  @param {Time} startTime 
		 *  @param {Time} duration  
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.setValueCurveAtTime = function(values, startTime, duration){
			for (var i = 0; i < values.length; i++){
				values[i] = this._fromUnits(values[i]);
			}
			this._param.setValueCurveAtTime(values, this.toSeconds(startTime), this.toSeconds(duration));
			return this;
		};

		/**
		 *  Cancels all scheduled parameter changes with times greater than or 
		 *  equal to startTime.
		 *  
		 *  @param  {Time} startTime
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.cancelScheduledValues = function(startTime){
			this._param.cancelScheduledValues(this.toSeconds(startTime));
			return this;
		};

		/**
		 *  Ramps to the given value over the duration of the rampTime. 
		 *  Automatically selects the best ramp type (exponential or linear)
		 *  depending on the `units` of the signal
		 *  
		 *  @param  {number} value   
		 *  @param  {Time} rampTime the time that it takes the 
		 *                               value to ramp from it's current value
		 *  @returns {Tone.Param} this
		 *  @example
		 * //ramp to the value either linearly or exponentially 
		 * //depending on the "units" value of the signal
		 * signal.rampTo(0, 10);
		 */
		Tone.Param.prototype.rampTo = function(value, rampTime){
			rampTime = this.defaultArg(rampTime, 0);
			if (this.units === Tone.Type.Frequency || this.units === Tone.Type.BPM){
				this.exponentialRampToValue(value, rampTime);
			} else {
				this.linearRampToValue(value, rampTime);
			}
			return this;
		};

		/**
		 *  Clean up
		 *  @returns {Tone.Param} this
		 */
		Tone.Param.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._param = null;
			return this;
		};

		return Tone.Param;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 14 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(13), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class A thin wrapper around the Native Web Audio GainNode.
		 *         The GainNode is a basic building block of the Web Audio
		 *         API and is useful for routing audio and adjusting gains. 
		 *  @extends {Tone}
		 *  @param  {Number=}  gain  The initial gain of the GainNode
		 *  @param {Tone.Type=} units The units of the gain parameter. 
		 */
		Tone.Gain = function(){

			var options = this.optionsObject(arguments, ["gain", "units"], Tone.Gain.defaults);

			/**
			 *  The GainNode
			 *  @type  {GainNode}
			 *  @private
			 */
			this.input = this.output = this._gainNode = this.context.createGain();

			/**
			 *  The gain parameter of the gain node.
			 *  @type {AudioParam}
			 *  @signal
			 */
			this.gain = new Tone.Param({
				"param" : this._gainNode.gain, 
				"units" : options.units,
				"value" : options.gain,
				"convert" : options.convert
			});
			this._readOnly("gain");
		};

		Tone.extend(Tone.Gain);

		/**
		 *  The defaults
		 *  @const
		 *  @type  {Object}
		 */
		Tone.Gain.defaults = {
			"gain" : 1,
			"convert" : true,
		};

		/**
		 *  Clean up.
		 *  @return  {Tone.Gain}  this
		 */
		Tone.Gain.prototype.dispose = function(){
			Tone.Param.prototype.dispose.call(this);
			this._gainNode.disconnect();
			this._gainNode = null;
			this._writable("gain");
			this.gain.dispose();
			this.gain = null;
		};

		return Tone.Gain;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class A Timeline class for scheduling and maintaining state
		 *         along a timeline. All events must have a "time" property. 
		 *         Internally, events are stored in time order for fast 
		 *         retrieval.
		 *  @extends {Tone}
		 *  @param {Positive} [memory=Infinity] The number of previous events that are retained.
		 */
		Tone.Timeline = function(){

			var options = this.optionsObject(arguments, ["memory"], Tone.Timeline.defaults);

			/**
			 *  The array of scheduled timeline events
			 *  @type  {Array}
			 *  @private
			 */
			this._timeline = [];

			/**
			 *  An array of items to remove from the list. 
			 *  @type {Array}
			 *  @private
			 */
			this._toRemove = [];

			/**
			 *  Flag if the tieline is mid iteration
			 *  @private
			 *  @type {Boolean}
			 */
			this._iterating = false;

			/**
			 *  The memory of the timeline, i.e.
			 *  how many events in the past it will retain
			 *  @type {Positive}
			 */
			this.memory = options.memory;
		};

		Tone.extend(Tone.Timeline);

		/**
		 *  the default parameters
		 *  @static
		 *  @const
		 */
		Tone.Timeline.defaults = {
			"memory" : Infinity
		};

		/**
		 *  The number of items in the timeline.
		 *  @type {Number}
		 *  @memberOf Tone.Timeline#
		 *  @name length
		 *  @readOnly
		 */
		Object.defineProperty(Tone.Timeline.prototype, "length", {
			get : function(){
				return this._timeline.length;
			}
		});

		/**
		 *  Insert an event object onto the timeline. Events must have a "time" attribute.
		 *  @param  {Object}  event  The event object to insert into the 
		 *                           timeline. 
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.addEvent = function(event){
			//the event needs to have a time attribute
			if (this.isUndef(event.time)){
				throw new Error("events must have a time attribute");
			}
			event.time = this.toSeconds(event.time);
			if (this._timeline.length){
				var index = this._search(event.time);
				this._timeline.splice(index + 1, 0, event);
			} else {
				this._timeline.push(event);			
			}
			//if the length is more than the memory, remove the previous ones
			if (this.length > this.memory){
				var diff = this.length - this.memory;
				this._timeline.splice(0, diff);
			}
			return this;
		};

		/**
		 *  Remove an event from the timeline.
		 *  @param  {Object}  event  The event object to remove from the list.
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.removeEvent = function(event){
			if (this._iterating){
				this._toRemove.push(event);
			} else {
				var index = this._timeline.indexOf(event);
				if (index !== -1){
					this._timeline.splice(index, 1);
				}
			}
			return this;
		};

		/**
		 *  Get the event whose time is less than or equal to the given time.
		 *  @param  {Number}  time  The time to query.
		 *  @returns {Object} The event object set after that time.
		 */
		Tone.Timeline.prototype.getEvent = function(time){
			time = this.toSeconds(time);
			var index = this._search(time);
			if (index !== -1){
				return this._timeline[index];
			} else {
				return null;
			}
		};

		/**
		 *  Get the event which is scheduled after the given time.
		 *  @param  {Number}  time  The time to query.
		 *  @returns {Object} The event object after the given time
		 */
		Tone.Timeline.prototype.getEventAfter = function(time){
			time = this.toSeconds(time);
			var index = this._search(time);
			if (index + 1 < this._timeline.length){
				return this._timeline[index + 1];
			} else {
				return null;
			}
		};

		/**
		 *  Get the event before the event at the given time.
		 *  @param  {Number}  time  The time to query.
		 *  @returns {Object} The event object before the given time
		 */
		Tone.Timeline.prototype.getEventBefore = function(time){
			time = this.toSeconds(time);
			var index = this._search(time);
			if (index - 1 >= 0){
				return this._timeline[index - 1];
			} else {
				return null;
			}
		};

		/**
		 *  Cancel events after the given time
		 *  @param  {Time}  time  The time to query.
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.cancel = function(after){
			if (this._timeline.length > 1){
				after = this.toSeconds(after);
				var index = this._search(after);
				if (index >= 0){
					this._timeline = this._timeline.slice(0, index);
				} else {
					this._timeline = [];
				}
			} else if (this._timeline.length === 1){
				//the first item's time
				if (this._timeline[0].time >= after){
					this._timeline = [];
				}
			}
			return this;
		};

		/**
		 *  Cancel events before or equal to the given time.
		 *  @param  {Time}  time  The time to cancel before.
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.cancelBefore = function(time){
			if (this._timeline.length){
				time = this.toSeconds(time);
				var index = this._search(time);
				if (index >= 0){
					this._timeline = this._timeline.slice(index + 1);
				}
			}
			return this;
		};

		/**
		 *  Does a binary serach on the timeline array and returns the 
		 *  event which is after or equal to the time.
		 *  @param  {Number}  time  
		 *  @return  {Number} the index in the timeline array 
		 *  @private
		 */
		Tone.Timeline.prototype._search = function(time){
			var beginning = 0;
			var len = this._timeline.length;
			var end = len;
			// continue searching while [imin,imax] is not empty
			while (beginning <= end && beginning < len){
				// calculate the midpoint for roughly equal partition
				var midPoint = Math.floor(beginning + (end - beginning) / 2);
				var event = this._timeline[midPoint];
				if (event.time === time){
					//choose the last one that has the same time
					for (var i = midPoint; i < this._timeline.length; i++){
						var testEvent = this._timeline[i];
						if (testEvent.time === time){
							midPoint = i;
						}
					}
					return midPoint;
				} else if (event.time > time){
					//search lower
					end = midPoint - 1;
				} else if (event.time < time){
					//search upper
					beginning = midPoint + 1;
				} 
			}
			return beginning - 1;
		};

		/**
		 *  Internal iterator. Applies extra safety checks for 
		 *  removing items from the array. 
		 *  @param  {Function}  callback 
		 *  @param  {Number=}    lowerBound     
		 *  @param  {Number=}    upperBound    
		 *  @private
		 */
		Tone.Timeline.prototype._iterate = function(callback, lowerBound, upperBound){
			this._iterating = true;
			lowerBound = this.defaultArg(lowerBound, 0);
			upperBound = this.defaultArg(upperBound, this._timeline.length - 1);
			for (var i = lowerBound; i <= upperBound; i++){
				callback(this._timeline[i]);
			}
			this._iterating = false;
			if (this._toRemove.length > 0){
				for (var j = 0; j < this._toRemove.length; j++){
					var index = this._timeline.indexOf(this._toRemove[j]);
					if (index !== -1){
						this._timeline.splice(index, 1);
					}
				}
				this._toRemove = [];
			}
		};

		/**
		 *  Iterate over everything in the array
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.forEach = function(callback){
			this._iterate(callback);
			return this;
		};

		/**
		 *  Iterate over everything in the array at or before the given time.
		 *  @param  {Time}  time The time to check if items are before
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.forEachBefore = function(time, callback){
			//iterate over the items in reverse so that removing an item doesn't break things
			time = this.toSeconds(time);
			var upperBound = this._search(time);
			if (upperBound !== -1){
				this._iterate(callback, 0, upperBound);
			}
			return this;
		};

		/**
		 *  Iterate over everything in the array after the given time.
		 *  @param  {Time}  time The time to check if items are before
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.forEachAfter = function(time, callback){
			//iterate over the items in reverse so that removing an item doesn't break things
			time = this.toSeconds(time);
			var lowerBound = this._search(time);
			this._iterate(callback, lowerBound + 1);
			return this;
		};

		/**
		 *  Iterate over everything in the array at or after the given time. Similar to 
		 *  forEachAfter, but includes the item(s) at the given time.
		 *  @param  {Time}  time The time to check if items are before
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.forEachFrom = function(time, callback){
			//iterate over the items in reverse so that removing an item doesn't break things
			time = this.toSeconds(time);
			var lowerBound = this._search(time);
			//work backwards until the event time is less than time
			while (lowerBound >= 0 && this._timeline[lowerBound].time >= time){
				lowerBound--;
			}
			this._iterate(callback, lowerBound + 1);
			return this;
		};

		/**
		 *  Iterate over everything in the array at the given time
		 *  @param  {Time}  time The time to check if items are before
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.Timeline} this
		 */
		Tone.Timeline.prototype.forEachAtTime = function(time, callback){
			//iterate over the items in reverse so that removing an item doesn't break things
			time = this.toSeconds(time);
			var upperBound = this._search(time);
			if (upperBound !== -1){
				this._iterate(function(event){
					if (event.time === time){
						callback(event);
					} 
				}, 0, upperBound);
			}
			return this;
		};

		/**
		 *  Clean up.
		 *  @return  {Tone.Timeline}  this
		 */
		Tone.Timeline.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._timeline = null;
			this._toRemove = null;
		};

		return Tone.Timeline;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 16 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(15), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class  A Timeline State. Provides the methods: <code>setStateAtTime("state", time)</code>
		 *          and <code>getStateAtTime(time)</code>.
		 *
		 *  @extends {Tone.Timeline}
		 *  @param {String} initial The initial state of the TimelineState. 
		 *                          Defaults to <code>undefined</code>
		 */
		Tone.TimelineState = function(initial){

			Tone.Timeline.call(this);

			/**
			 *  The initial state
			 *  @private
			 *  @type {String}
			 */
			this._initial = initial;
		};

		Tone.extend(Tone.TimelineState, Tone.Timeline);

		/**
		 *  Returns the scheduled state scheduled before or at
		 *  the given time.
		 *  @param  {Time}  time  The time to query.
		 *  @return  {String}  The name of the state input in setStateAtTime.
		 */
		Tone.TimelineState.prototype.getStateAtTime = function(time){
			var event = this.getEvent(time);
			if (event !== null){
				return event.state;
			} else {
				return this._initial;
			}
		};

		/**
		 *  Returns the scheduled state scheduled before or at
		 *  the given time.
		 *  @param  {String}  state The name of the state to set.
		 *  @param  {Time}  time  The time to query.
		 */
		Tone.TimelineState.prototype.setStateAtTime = function(state, time){
			this.addEvent({
				"state" : state,
				"time" : this.toSeconds(time)
			});
		};

		return Tone.TimelineState;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class Tone.Emitter gives classes which extend it
		 *         the ability to listen for and trigger events. 
		 *         Inspiration and reference from Jerome Etienne's [MicroEvent](https://github.com/jeromeetienne/microevent.js).
		 *         MIT (c) 2011 Jerome Etienne.
		 *         
		 *  @extends {Tone}
		 */
		Tone.Emitter = function(){
			/**
			 *  Contains all of the events.
			 *  @private
			 *  @type  {Object}
			 */
			this._events = {};
		};

		Tone.extend(Tone.Emitter);

		/**
		 *  Bind a callback to a specific event.
		 *  @param  {String}    event     The name of the event to listen for.
		 *  @param  {Function}  callback  The callback to invoke when the
		 *                                event is triggered
		 *  @return  {Tone.Emitter}    this
		 */
		Tone.Emitter.prototype.on = function(event, callback){
			//split the event
			var events = event.split(/\W+/);
			for (var i = 0; i < events.length; i++){
				var eventName = events[i];
				if (!this._events.hasOwnProperty(eventName)){
					this._events[eventName] = [];
				}
				this._events[eventName].push(callback);
			}
			return this;
		};

		/**
		 *  Remove the event listener.
		 *  @param  {String}    event     The event to stop listening to.
		 *  @param  {Function=}  callback  The callback which was bound to 
		 *                                the event with Tone.Emitter.on.
		 *                                If no callback is given, all callbacks
		 *                                events are removed.
		 *  @return  {Tone.Emitter}    this
		 */
		Tone.Emitter.prototype.off = function(event, callback){
			var events = event.split(/\W+/);
			for (var ev = 0; ev < events.length; ev++){
				event = events[ev];
				if (this._events.hasOwnProperty(event)){
					if (Tone.prototype.isUndef(callback)){
						this._events[event] = [];
					} else {
						var eventList = this._events[event];
						for (var i = 0; i < eventList.length; i++){
							if (eventList[i] === callback){
								eventList.splice(i, 1);
							}
						}
					}
				}
			}
			return this;
		};

		/**
		 *  Invoke all of the callbacks bound to the event
		 *  with any arguments passed in. 
		 *  @param  {String}  event  The name of the event.
		 *  @param {*...} args The arguments to pass to the functions listening.
		 *  @return  {Tone.Emitter}  this
		 */
		Tone.Emitter.prototype.trigger = function(event){
			if (this._events){
				var args = Array.prototype.slice.call(arguments, 1);
				if (this._events.hasOwnProperty(event)){
					var eventList = this._events[event];
					for (var i = 0, len = eventList.length; i < len; i++){
						eventList[i].apply(this, args);
					}
				}
			}
			return this;
		};

		/**
		 *  Add Emitter functions (on/off/trigger) to the object
		 *  @param  {Object|Function}  object  The object or class to extend.
		 */
		Tone.Emitter.mixin = function(object){
			var functions = ["on", "off", "trigger"];
			object._events = {};
			for (var i = 0; i < functions.length; i++){
				var func = functions[i];
				var emitterFunc = Tone.Emitter.prototype[func];
				object[func] = emitterFunc;
			}
		};

		/**
		 *  Clean up
		 *  @return  {Tone.Emitter}  this
		 */
		Tone.Emitter.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._events = null;
			return this;
		};

		return Tone.Emitter;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		"use strict";

		/**
		 *  @class Similar to Tone.Timeline, but all events represent
		 *         intervals with both "time" and "duration" times. The 
		 *         events are placed in a tree structure optimized
		 *         for querying an intersection point with the timeline
		 *         events. Internally uses an [Interval Tree](https://en.wikipedia.org/wiki/Interval_tree)
		 *         to represent the data.
		 *  @extends {Tone}
		 */
		Tone.IntervalTimeline = function(){

			/**
			 *  The root node of the inteval tree
			 *  @type  {IntervalNode}
			 *  @private
			 */
			this._root = null;

			/**
			 *  Keep track of the length of the timeline.
			 *  @type  {Number}
			 *  @private
			 */
			this._length = 0;
		};

		Tone.extend(Tone.IntervalTimeline);

		/**
		 *  The event to add to the timeline. All events must 
		 *  have a time and duration value
		 *  @param  {Object}  event  The event to add to the timeline
		 *  @return  {Tone.IntervalTimeline}  this
		 */
		Tone.IntervalTimeline.prototype.addEvent = function(event){
			if (this.isUndef(event.time) || this.isUndef(event.duration)){
				throw new Error("events must have time and duration parameters");
			}
			var node = new IntervalNode(event.time, event.time + event.duration, event);
			if (this._root === null){
				this._root = node;
			} else {
				this._root.insert(node);
			}
			this._length++;
			// Restructure tree to be balanced
			while (node !== null) {
				node.updateHeight();
				node.updateMax();
				this._rebalance(node);
				node = node.parent;
			}
			return this;
		};

		/**
		 *  Remove an event from the timeline.
		 *  @param  {Object}  event  The event to remove from the timeline
		 *  @return  {Tone.IntervalTimeline}  this
		 */
		Tone.IntervalTimeline.prototype.removeEvent = function(event){
			if (this._root !== null){
				var results = [];
				this._root.search(event.time, results);
				for (var i = 0; i < results.length; i++){
					var node = results[i];
					if (node.event === event){
						this._removeNode(node);
						this._length--;
						break;
					}
				}
			}
			return this;
		};

		/**
		 *  The number of items in the timeline.
		 *  @type {Number}
		 *  @memberOf Tone.IntervalTimeline#
		 *  @name length
		 *  @readOnly
		 */
		Object.defineProperty(Tone.IntervalTimeline.prototype, "length", {
			get : function(){
				return this._length;
			}
		});

		/**
		 *  Remove events whose time time is after the given time
		 *  @param  {Time}  time  The time to query.
		 *  @returns {Tone.IntervalTimeline} this
		 */
		Tone.IntervalTimeline.prototype.cancel = function(after){
			after = this.toSeconds(after);
			this.forEachAfter(after, function(event){
				this.removeEvent(event);
			}.bind(this));
			return this;
		};

		/**
		 *  Set the root node as the given node
		 *  @param {IntervalNode} node
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._setRoot = function(node){
			this._root = node;
			if (this._root !== null){
				this._root.parent = null;
			}
		};

		/**
		 *  Replace the references to the node in the node's parent
		 *  with the replacement node.
		 *  @param  {IntervalNode}  node        
		 *  @param  {IntervalNode}  replacement 
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._replaceNodeInParent = function(node, replacement){
			if (node.parent !== null){
				if (node.isLeftChild()){
					node.parent.left = replacement;
				} else {
					node.parent.right = replacement;
				}
				this._rebalance(node.parent);
			} else {
				this._setRoot(replacement);
			}
		};

		/**
		 *  Remove the node from the tree and replace it with 
		 *  a successor which follows the schema.
		 *  @param  {IntervalNode}  node
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._removeNode = function(node){
			if (node.left === null && node.right === null){
				this._replaceNodeInParent(node, null);
			} else if (node.right === null){
				this._replaceNodeInParent(node, node.left);
			} else if (node.left === null){
				this._replaceNodeInParent(node, node.right);
			} else {
				var balance = node.getBalance();
				var replacement, temp;
				if (balance > 0){
					if (node.left.right === null){
						replacement = node.left;
						replacement.right = node.right;
						temp = replacement;
					} else {
						replacement = node.left.right;
						while (replacement.right !== null){
							replacement = replacement.right;
						}
						replacement.parent.right = replacement.left;
						temp = replacement.parent;
						replacement.left = node.left;
						replacement.right = node.right;
					}
				} else {
					if (node.right.left === null){
						replacement = node.right;
						replacement.left = node.left;
						temp = replacement;
					} else {
						replacement = node.right.left;
						while (replacement.left !== null) {
							replacement = replacement.left;
						}
						replacement.parent = replacement.parent;
						replacement.parent.left = replacement.right;
						temp = replacement.parent;
						replacement.left = node.left;
						replacement.right = node.right;
					}
				}
				if (node.parent !== null){
					if (node.isLeftChild()){
						node.parent.left = replacement;
					} else {
						node.parent.right = replacement;
					}
				} else {
					this._setRoot(replacement);
				}
				// this._replaceNodeInParent(node, replacement);
				this._rebalance(temp);
			}
			node.dispose();
		};

		/**
		 *  Rotate the tree to the left
		 *  @param  {IntervalNode}  node
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._rotateLeft = function(node){
			var parent = node.parent;
			var isLeftChild = node.isLeftChild();

			// Make node.right the new root of this sub tree (instead of node)
			var pivotNode = node.right;
			node.right = pivotNode.left;
			pivotNode.left = node;

			if (parent !== null){
				if (isLeftChild){
					parent.left = pivotNode;
				} else{
					parent.right = pivotNode;
				}
			} else{
				this._setRoot(pivotNode);
			}
		};

		/**
		 *  Rotate the tree to the right
		 *  @param  {IntervalNode}  node
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._rotateRight = function(node){
			var parent = node.parent;
			var isLeftChild = node.isLeftChild();
	 
			// Make node.left the new root of this sub tree (instead of node)
			var pivotNode = node.left;
			node.left = pivotNode.right;
			pivotNode.right = node;

			if (parent !== null){
				if (isLeftChild){
					parent.left = pivotNode;
				} else{
					parent.right = pivotNode;
				}
			} else{
				this._setRoot(pivotNode);
			}
		};

		/**
		 *  Balance the BST
		 *  @param  {IntervalNode}  node
		 *  @private
		 */
		Tone.IntervalTimeline.prototype._rebalance = function(node){
			var balance = node.getBalance();
			if (balance > 1){
				if (node.left.getBalance() < 0){
					this._rotateLeft(node.left);
				} else {
					this._rotateRight(node);
				}
			} else if (balance < -1) {
				if (node.right.getBalance() > 0){
					this._rotateRight(node.right);
				} else {
					this._rotateLeft(node);
				}
			}
		};

		/**
		 *  Get an event whose time and duration span the give time. Will
		 *  return the match whose "time" value is closest to the given time.
		 *  @param  {Object}  event  The event to add to the timeline
		 *  @return  {Object}  The event which spans the desired time
		 */
		Tone.IntervalTimeline.prototype.getEvent = function(time){
			if (this._root !== null){
				var results = [];
				this._root.search(time, results);
				if (results.length > 0){
					var max = results[0];
					for (var i = 1; i < results.length; i++){
						if (results[i].low > max.low){
							max = results[i];
						}
					}
					return max.event;
				} 
			}
			return null;
		};

		/**
		 *  Iterate over everything in the timeline.
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.IntervalTimeline} this
		 */
		Tone.IntervalTimeline.prototype.forEach = function(callback){
			if (this._root !== null){
				var allNodes = [];
				if (this._root !== null){
					this._root.traverse(function(node){
						allNodes.push(node);
					});
				}
				for (var i = 0; i < allNodes.length; i++){
					var ev = allNodes[i].event;
					if (ev){
						callback(ev);
					}
				}
			}
			return this;
		};

		/**
		 *  Iterate over everything in the array in which the given time
		 *  overlaps with the time and duration time of the event.
		 *  @param  {Time}  time The time to check if items are overlapping
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.IntervalTimeline} this
		 */
		Tone.IntervalTimeline.prototype.forEachOverlap = function(time, callback){
			time = this.toSeconds(time);
			if (this._root !== null){
				var results = [];
				this._root.search(time, results);
				for (var i = results.length - 1; i >= 0; i--){
					var ev = results[i].event;
					if (ev){
						callback(ev);
					}
				}
			}
			return this;
		};

		/**
		 *  Iterate over everything in the array in which the time is greater
		 *  than the given time.
		 *  @param  {Time}  time The time to check if items are before
		 *  @param  {Function}  callback The callback to invoke with every item
		 *  @returns {Tone.IntervalTimeline} this
		 */
		Tone.IntervalTimeline.prototype.forEachAfter = function(time, callback){
			time = this.toSeconds(time);
			if (this._root !== null){
				var results = [];
				this._root.searchAfter(time, results);
				for (var i = results.length - 1; i >= 0; i--){
					var ev = results[i].event;
					if (ev){
						callback(ev);
					}
				}
			}
			return this;
		};

		/**
		 *  Clean up
		 *  @return  {Tone.IntervalTimeline}  this
		 */
		Tone.IntervalTimeline.prototype.dispose = function() {
			var allNodes = [];
			if (this._root !== null){
				this._root.traverse(function(node){
					allNodes.push(node);
				});
			}
			for (var i = 0; i < allNodes.length; i++){
				allNodes[i].dispose();
			}
			allNodes = null;
			this._root = null;
			return this;
		};

		///////////////////////////////////////////////////////////////////////////
		//	INTERVAL NODE HELPER
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Represents a node in the binary search tree, with the addition
		 *  of a "high" value which keeps track of the highest value of
		 *  its children. 
		 *  References: 
		 *  https://brooknovak.wordpress.com/2013/12/07/augmented-interval-tree-in-c/
		 *  http://www.mif.vu.lt/~valdas/ALGORITMAI/LITERATURA/Cormen/Cormen.pdf
		 *  @param {Number} low
		 *  @param {Number} high
		 *  @private
		 */
		var IntervalNode = function(low, high, event){
			//the event container
			this.event = event;
			//the low value
			this.low = low;
			//the high value
			this.high = high;
			//the high value for this and all child nodes
			this.max = this.high;
			//the nodes to the left
			this._left = null;
			//the nodes to the right
			this._right = null;
			//the parent node
			this.parent = null;
			//the number of child nodes
			this.height = 0;
		};

		/** 
		 *  Insert a node into the correct spot in the tree
		 *  @param  {IntervalNode}  node
		 */
		IntervalNode.prototype.insert = function(node) {
			if (node.low <= this.low){
				if (this.left === null){
					this.left = node;
				} else {
					this.left.insert(node);
				}
			} else {
				if (this.right === null){
					this.right = node;
				} else {
					this.right.insert(node);
				}
			}
		};

		/**
		 *  Search the tree for nodes which overlap 
		 *  with the given point
		 *  @param  {Number}  point  The point to query
		 *  @param  {Array}  results  The array to put the results
		 */
		IntervalNode.prototype.search = function(point, results) {
			// If p is to the right of the rightmost point of any interval
			// in this node and all children, there won't be any matches.
			if (point > this.max){
				return;
			}
			// Search left children
			if (this.left !== null){
				this.left.search(point, results);
			}
			// Check this node
			if (this.low <= point && this.high >= point){
				results.push(this);
			}
			// If p is to the left of the time of this interval,
			// then it can't be in any child to the right.
			if (this.low > point){
				return;
			}
			// Search right children
			if (this.right !== null){
				this.right.search(point, results);
			}
		};

		/**
		 *  Search the tree for nodes which are less 
		 *  than the given point
		 *  @param  {Number}  point  The point to query
		 *  @param  {Array}  results  The array to put the results
		 */
		IntervalNode.prototype.searchAfter = function(point, results) {
			// Check this node
			if (this.low >= point){
				results.push(this);
				if (this.left !== null){
					this.left.searchAfter(point, results);
				}
			} 
			// search the right side
			if (this.right !== null){
				this.right.searchAfter(point, results);
			}
		};

		/**
		 *  Invoke the callback on this element and both it's branches
		 *  @param  {Function}  callback
		 */
		IntervalNode.prototype.traverse = function(callback){
			callback(this);
			if (this.left !== null){
				this.left.traverse(callback);
			}
			if (this.right !== null){
				this.right.traverse(callback);
			}
		};

		/**
		 *  Update the height of the node
		 */
		IntervalNode.prototype.updateHeight = function(){
			if (this.left !== null && this.right !== null){
				this.height = Math.max(this.left.height, this.right.height) + 1;
			} else if (this.right !== null){
				this.height = this.right.height + 1;
			} else if (this.left !== null){
				this.height = this.left.height + 1;
			} else {
				this.height = 0;
			}
		};

		/**
		 *  Update the height of the node
		 */
		IntervalNode.prototype.updateMax = function(){
			this.max = this.high;
			if (this.left !== null){
				this.max = Math.max(this.max, this.left.max);
			}
			if (this.right !== null){
				this.max = Math.max(this.max, this.right.max);
			}
		};

		/**
		 *  The balance is how the leafs are distributed on the node
		 *  @return  {Number}  Negative numbers are balanced to the right
		 */
		IntervalNode.prototype.getBalance = function() {
			var balance = 0;
			if (this.left !== null && this.right !== null){
				balance = this.left.height - this.right.height;
			} else if (this.left !== null){
				balance = this.left.height + 1;
			} else if (this.right !== null){
				balance = -(this.right.height + 1);
			}
			return balance;
		};

		/**
		 *  @returns {Boolean} true if this node is the left child
		 *  of its parent
		 */
		IntervalNode.prototype.isLeftChild = function() {
			return this.parent !== null && this.parent.left === this;
		};

		/**
		 *  get/set the left node
		 *  @type {IntervalNode}
		 */
		Object.defineProperty(IntervalNode.prototype, "left", {
			get : function(){
				return this._left;
			},
			set : function(node){
				this._left = node;
				if (node !== null){
					node.parent = this;
				}
				this.updateHeight();
				this.updateMax();
			}
		});

		/**
		 *  get/set the right node
		 *  @type {IntervalNode}
		 */
		Object.defineProperty(IntervalNode.prototype, "right", {
			get : function(){
				return this._right;
			},
			set : function(node){
				this._right = node;
				if (node !== null){
					node.parent = this;
				}
				this.updateHeight();
				this.updateMax();
			}
		});

		/**
		 *  null out references.
		 */
		IntervalNode.prototype.dispose = function() {
			this.parent = null;
			this._left = null;
			this._right = null;
			this.event = null;
		};

		///////////////////////////////////////////////////////////////////////////
		//	END INTERVAL NODE HELPER
		///////////////////////////////////////////////////////////////////////////

		return Tone.IntervalTimeline;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_RESULT__ = function(){

		return {
			//shades
			"charcoal" : "rgb(50,51,52)",
			"lightGrey" : "rgb(223,224,225)",
			"grey" : "rgb(204, 204, 204)",
			//colors
			"orange" : "#FFB729",
			"blue" : "rgb(22, 168, 240)",
			"lightBlue" : "rgb(131, 211, 248)",
			//keys
			"C" : "#4e61d8",
			"C#" : "#8064c6",
			"Db" : "#8064c6",
			"D" : "#a542b1",
			"D#" : "#ed3883",
			"Eb" : "#ed3883",
			"E" : "#f75839",
			"F" : "#f7943d",
			"F#" : "#f6be37",
			"Gb" : "#f6be37",
			"G" : "#d1c12e",
			"G#" : "#95c631",
			"Ab" : "#95c631",
			"A" : "#4bb250",
			"A#" : "#45b5a1",
			"Bb" : "#45b5a1",
			"B" : "#4598b6",
		};
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

	"use strict"

	var bounds = __webpack_require__(21)

	var NOT_FOUND = 0
	var SUCCESS = 1
	var EMPTY = 2

	module.exports = createWrapper

	function IntervalTreeNode(mid, left, right, leftPoints, rightPoints) {
	  this.mid = mid
	  this.left = left
	  this.right = right
	  this.leftPoints = leftPoints
	  this.rightPoints = rightPoints
	  this.count = (left ? left.count : 0) + (right ? right.count : 0) + leftPoints.length
	}

	var proto = IntervalTreeNode.prototype

	function copy(a, b) {
	  a.mid = b.mid
	  a.left = b.left
	  a.right = b.right
	  a.leftPoints = b.leftPoints
	  a.rightPoints = b.rightPoints
	  a.count = b.count
	}

	function rebuild(node, intervals) {
	  var ntree = createIntervalTree(intervals)
	  node.mid = ntree.mid
	  node.left = ntree.left
	  node.right = ntree.right
	  node.leftPoints = ntree.leftPoints
	  node.rightPoints = ntree.rightPoints
	  node.count = ntree.count
	}

	function rebuildWithInterval(node, interval) {
	  var intervals = node.intervals([])
	  intervals.push(interval)
	  rebuild(node, intervals)    
	}

	function rebuildWithoutInterval(node, interval) {
	  var intervals = node.intervals([])
	  var idx = intervals.indexOf(interval)
	  if(idx < 0) {
	    return NOT_FOUND
	  }
	  intervals.splice(idx, 1)
	  rebuild(node, intervals)
	  return SUCCESS
	}

	proto.intervals = function(result) {
	  result.push.apply(result, this.leftPoints)
	  if(this.left) {
	    this.left.intervals(result)
	  }
	  if(this.right) {
	    this.right.intervals(result)
	  }
	  return result
	}

	proto.insert = function(interval) {
	  var weight = this.count - this.leftPoints.length
	  this.count += 1
	  if(interval[1] < this.mid) {
	    if(this.left) {
	      if(4*(this.left.count+1) > 3*(weight+1)) {
	        rebuildWithInterval(this, interval)
	      } else {
	        this.left.insert(interval)
	      }
	    } else {
	      this.left = createIntervalTree([interval])
	    }
	  } else if(interval[0] > this.mid) {
	    if(this.right) {
	      if(4*(this.right.count+1) > 3*(weight+1)) {
	        rebuildWithInterval(this, interval)
	      } else {
	        this.right.insert(interval)
	      }
	    } else {
	      this.right = createIntervalTree([interval])
	    }
	  } else {
	    var l = bounds.ge(this.leftPoints, interval, compareBegin)
	    var r = bounds.ge(this.rightPoints, interval, compareEnd)
	    this.leftPoints.splice(l, 0, interval)
	    this.rightPoints.splice(r, 0, interval)
	  }
	}

	proto.remove = function(interval) {
	  var weight = this.count - this.leftPoints
	  if(interval[1] < this.mid) {
	    if(!this.left) {
	      return NOT_FOUND
	    }
	    var rw = this.right ? this.right.count : 0
	    if(4 * rw > 3 * (weight-1)) {
	      return rebuildWithoutInterval(this, interval)
	    }
	    var r = this.left.remove(interval)
	    if(r === EMPTY) {
	      this.left = null
	      this.count -= 1
	      return SUCCESS
	    } else if(r === SUCCESS) {
	      this.count -= 1
	    }
	    return r
	  } else if(interval[0] > this.mid) {
	    if(!this.right) {
	      return NOT_FOUND
	    }
	    var lw = this.left ? this.left.count : 0
	    if(4 * lw > 3 * (weight-1)) {
	      return rebuildWithoutInterval(this, interval)
	    }
	    var r = this.right.remove(interval)
	    if(r === EMPTY) {
	      this.right = null
	      this.count -= 1
	      return SUCCESS
	    } else if(r === SUCCESS) {
	      this.count -= 1
	    }
	    return r
	  } else {
	    if(this.count === 1) {
	      if(this.leftPoints[0] === interval) {
	        return EMPTY
	      } else {
	        return NOT_FOUND
	      }
	    }
	    if(this.leftPoints.length === 1 && this.leftPoints[0] === interval) {
	      if(this.left && this.right) {
	        var p = this
	        var n = this.left
	        while(n.right) {
	          p = n
	          n = n.right
	        }
	        if(p === this) {
	          n.right = this.right
	        } else {
	          var l = this.left
	          var r = this.right
	          p.count -= n.count
	          p.right = n.left
	          n.left = l
	          n.right = r
	        }
	        copy(this, n)
	        this.count = (this.left?this.left.count:0) + (this.right?this.right.count:0) + this.leftPoints.length
	      } else if(this.left) {
	        copy(this, this.left)
	      } else {
	        copy(this, this.right)
	      }
	      return SUCCESS
	    }
	    for(var l = bounds.ge(this.leftPoints, interval, compareBegin); l<this.leftPoints.length; ++l) {
	      if(this.leftPoints[l][0] !== interval[0]) {
	        break
	      }
	      if(this.leftPoints[l] === interval) {
	        this.count -= 1
	        this.leftPoints.splice(l, 1)
	        for(var r = bounds.ge(this.rightPoints, interval, compareEnd); r<this.rightPoints.length; ++r) {
	          if(this.rightPoints[r][1] !== interval[1]) {
	            break
	          } else if(this.rightPoints[r] === interval) {
	            this.rightPoints.splice(r, 1)
	            return SUCCESS
	          }
	        }
	      }
	    }
	    return NOT_FOUND
	  }
	}

	function reportLeftRange(arr, hi, cb) {
	  for(var i=0; i<arr.length && arr[i][0] <= hi; ++i) {
	    var r = cb(arr[i])
	    if(r) { return r }
	  }
	}

	function reportRightRange(arr, lo, cb) {
	  for(var i=arr.length-1; i>=0 && arr[i][1] >= lo; --i) {
	    var r = cb(arr[i])
	    if(r) { return r }
	  }
	}

	function reportRange(arr, cb) {
	  for(var i=0; i<arr.length; ++i) {
	    var r = cb(arr[i])
	    if(r) { return r }
	  }
	}

	proto.queryPoint = function(x, cb) {
	  if(x < this.mid) {
	    if(this.left) {
	      var r = this.left.queryPoint(x, cb)
	      if(r) { return r }
	    }
	    return reportLeftRange(this.leftPoints, x, cb)
	  } else if(x > this.mid) {
	    if(this.right) {
	      var r = this.right.queryPoint(x, cb)
	      if(r) { return r }
	    }
	    return reportRightRange(this.rightPoints, x, cb)
	  } else {
	    return reportRange(this.leftPoints, cb)
	  }
	}

	proto.queryInterval = function(lo, hi, cb) {
	  if(lo < this.mid && this.left) {
	    var r = this.left.queryInterval(lo, hi, cb)
	    if(r) { return r }
	  }
	  if(hi > this.mid && this.right) {
	    var r = this.right.queryInterval(lo, hi, cb)
	    if(r) { return r }
	  }
	  if(hi < this.mid) {
	    return reportLeftRange(this.leftPoints, hi, cb)
	  } else if(lo > this.mid) {
	    return reportRightRange(this.rightPoints, lo, cb)
	  } else {
	    return reportRange(this.leftPoints, cb)
	  }
	}

	function compareNumbers(a, b) {
	  return a - b
	}

	function compareBegin(a, b) {
	  var d = a[0] - b[0]
	  if(d) { return d }
	  return a[1] - b[1]
	}

	function compareEnd(a, b) {
	  var d = a[1] - b[1]
	  if(d) { return d }
	  return a[0] - b[0]
	}

	function createIntervalTree(intervals) {
	  if(intervals.length === 0) {
	    return null
	  }
	  var pts = []
	  for(var i=0; i<intervals.length; ++i) {
	    pts.push(intervals[i][0], intervals[i][1])
	  }
	  pts.sort(compareNumbers)

	  var mid = pts[pts.length>>1]

	  var leftIntervals = []
	  var rightIntervals = []
	  var centerIntervals = []
	  for(var i=0; i<intervals.length; ++i) {
	    var s = intervals[i]
	    if(s[1] < mid) {
	      leftIntervals.push(s)
	    } else if(mid < s[0]) {
	      rightIntervals.push(s)
	    } else {
	      centerIntervals.push(s)
	    }
	  }

	  //Split center intervals
	  var leftPoints = centerIntervals
	  var rightPoints = centerIntervals.slice()
	  leftPoints.sort(compareBegin)
	  rightPoints.sort(compareEnd)

	  return new IntervalTreeNode(mid, 
	    createIntervalTree(leftIntervals),
	    createIntervalTree(rightIntervals),
	    leftPoints,
	    rightPoints)
	}

	//User friendly wrapper that makes it possible to support empty trees
	function IntervalTree(root) {
	  this.root = root
	}

	var tproto = IntervalTree.prototype

	tproto.insert = function(interval) {
	  if(this.root) {
	    this.root.insert(interval)
	  } else {
	    this.root = new IntervalTreeNode(interval[0], null, null, [interval], [interval])
	  }
	}

	tproto.remove = function(interval) {
	  if(this.root) {
	    var r = this.root.remove(interval)
	    if(r === EMPTY) {
	      this.root = null
	    }
	    return r !== NOT_FOUND
	  }
	  return false
	}

	tproto.queryPoint = function(p, cb) {
	  if(this.root) {
	    return this.root.queryPoint(p, cb)
	  }
	}

	tproto.queryInterval = function(lo, hi, cb) {
	  if(lo <= hi && this.root) {
	    return this.root.queryInterval(lo, hi, cb)
	  }
	}

	Object.defineProperty(tproto, "count", {
	  get: function() {
	    if(this.root) {
	      return this.root.count
	    }
	    return 0
	  }
	})

	Object.defineProperty(tproto, "intervals", {
	  get: function() {
	    if(this.root) {
	      return this.root.intervals([])
	    }
	    return []
	  }
	})

	function createWrapper(intervals) {
	  if(!intervals || intervals.length === 0) {
	    return new IntervalTree(null)
	  }
	  return new IntervalTree(createIntervalTree(intervals))
	}


/***/ }),
/* 21 */
/***/ (function(module, exports) {

	"use strict"

	function compileSearch(funcName, predicate, reversed, extraArgs, useNdarray, earlyOut) {
	  var code = [
	    "function ", funcName, "(a,l,h,", extraArgs.join(","),  "){",
	earlyOut ? "" : "var i=", (reversed ? "l-1" : "h+1"),
	";while(l<=h){\
	var m=(l+h)>>>1,x=a", useNdarray ? ".get(m)" : "[m]"]
	  if(earlyOut) {
	    if(predicate.indexOf("c") < 0) {
	      code.push(";if(x===y){return m}else if(x<=y){")
	    } else {
	      code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){")
	    }
	  } else {
	    code.push(";if(", predicate, "){i=m;")
	  }
	  if(reversed) {
	    code.push("l=m+1}else{h=m-1}")
	  } else {
	    code.push("h=m-1}else{l=m+1}")
	  }
	  code.push("}")
	  if(earlyOut) {
	    code.push("return -1};")
	  } else {
	    code.push("return i};")
	  }
	  return code.join("")
	}

	function compileBoundsSearch(predicate, reversed, suffix, earlyOut) {
	  var result = new Function([
	  compileSearch("A", "x" + predicate + "y", reversed, ["y"], false, earlyOut),
	  compileSearch("B", "x" + predicate + "y", reversed, ["y"], true, earlyOut),
	  compileSearch("P", "c(x,y)" + predicate + "0", reversed, ["y", "c"], false, earlyOut),
	  compileSearch("Q", "c(x,y)" + predicate + "0", reversed, ["y", "c"], true, earlyOut),
	"function dispatchBsearch", suffix, "(a,y,c,l,h){\
	if(a.shape){\
	if(typeof(c)==='function'){\
	return Q(a,(l===undefined)?0:l|0,(h===undefined)?a.shape[0]-1:h|0,y,c)\
	}else{\
	return B(a,(c===undefined)?0:c|0,(l===undefined)?a.shape[0]-1:l|0,y)\
	}}else{\
	if(typeof(c)==='function'){\
	return P(a,(l===undefined)?0:l|0,(h===undefined)?a.length-1:h|0,y,c)\
	}else{\
	return A(a,(c===undefined)?0:c|0,(l===undefined)?a.length-1:l|0,y)\
	}}}\
	return dispatchBsearch", suffix].join(""))
	  return result()
	}

	module.exports = {
	  ge: compileBoundsSearch(">=", false, "GE"),
	  gt: compileBoundsSearch(">", false, "GT"),
	  lt: compileBoundsSearch("<", true, "LT"),
	  le: compileBoundsSearch("<=", true, "LE"),
	  eq: compileBoundsSearch("-", true, "EQ", true)
	}


/***/ }),
/* 22 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(23);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./roll.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./roll.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 23 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, "/** \r\n *  SIZING\r\n */\n#RollContainer {\n  position: absolute;\n  width: 100%;\n  height: calc(100% - 120px);\n  left: 0px;\n  top: 0px;\n  overflow: hidden; }\n  #RollContainer #ScrollContainer {\n    height: calc(100% + 25px);\n    width: 100%;\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    overflow-y: hidden;\n    overflow-x: scroll; }\n    #RollContainer #ScrollContainer #PianoRoll {\n      display: inline;\n      position: absolute;\n      width: 100%;\n      height: 100%;\n      top: 0px;\n      left: 0px;\n      z-index: 1;\n      background-color: transparent; }\n  #RollContainer #TriggerLine {\n    position: absolute;\n    left: calc(50% - 1.5px);\n    height: 100%;\n    background-color: black;\n    width: 3px;\n    z-index: 2;\n    opacity: 0.1;\n    pointer-events: none; }\n  #RollContainer #ScoreCanvas {\n    width: 100%;\n    height: 100%;\n    position: absolute;\n    top: 0px;\n    left: 0px;\n    z-index: 0;\n    height: calc(100% - 25px); }\n", ""]);

	// exports


/***/ }),
/* 24 */
/***/ (function(module, exports) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	// css base code, injected by the css-loader
	module.exports = function() {
		var list = [];

		// return the list of modules as css string
		list.toString = function toString() {
			var result = [];
			for(var i = 0; i < this.length; i++) {
				var item = this[i];
				if(item[2]) {
					result.push("@media " + item[2] + "{" + item[1] + "}");
				} else {
					result.push(item[1]);
				}
			}
			return result.join("");
		};

		// import a list of modules into the list
		list.i = function(modules, mediaQuery) {
			if(typeof modules === "string")
				modules = [[null, modules, ""]];
			var alreadyImportedModules = {};
			for(var i = 0; i < this.length; i++) {
				var id = this[i][0];
				if(typeof id === "number")
					alreadyImportedModules[id] = true;
			}
			for(i = 0; i < modules.length; i++) {
				var item = modules[i];
				// skip already imported module
				// this implementation is not 100% perfect for weird media query combinations
				//  when a module is imported multiple times with different media queries.
				//  I hope this will never occur (Hey this way we have smaller bundles)
				if(typeof item[0] !== "number" || !alreadyImportedModules[item[0]]) {
					if(mediaQuery && !item[2]) {
						item[2] = mediaQuery;
					} else if(mediaQuery) {
						item[2] = "(" + item[2] + ") and (" + mediaQuery + ")";
					}
					list.push(item);
				}
			}
		};
		return list;
	};


/***/ }),
/* 25 */
/***/ (function(module, exports, __webpack_require__) {

	/*
		MIT License http://www.opensource.org/licenses/mit-license.php
		Author Tobias Koppers @sokra
	*/
	var stylesInDom = {},
		memoize = function(fn) {
			var memo;
			return function () {
				if (typeof memo === "undefined") memo = fn.apply(this, arguments);
				return memo;
			};
		},
		isOldIE = memoize(function() {
			return /msie [6-9]\b/.test(window.navigator.userAgent.toLowerCase());
		}),
		getHeadElement = memoize(function () {
			return document.head || document.getElementsByTagName("head")[0];
		}),
		singletonElement = null,
		singletonCounter = 0;

	module.exports = function(list, options) {
		if(false) {
			if(typeof document !== "object") throw new Error("The style-loader cannot be used in a non-browser environment");
		}

		options = options || {};
		// Force single-tag solution on IE6-9, which has a hard limit on the # of <style>
		// tags it will allow on a page
		if (typeof options.singleton === "undefined") options.singleton = isOldIE();

		var styles = listToStyles(list);
		addStylesToDom(styles, options);

		return function update(newList) {
			var mayRemove = [];
			for(var i = 0; i < styles.length; i++) {
				var item = styles[i];
				var domStyle = stylesInDom[item.id];
				domStyle.refs--;
				mayRemove.push(domStyle);
			}
			if(newList) {
				var newStyles = listToStyles(newList);
				addStylesToDom(newStyles, options);
			}
			for(var i = 0; i < mayRemove.length; i++) {
				var domStyle = mayRemove[i];
				if(domStyle.refs === 0) {
					for(var j = 0; j < domStyle.parts.length; j++)
						domStyle.parts[j]();
					delete stylesInDom[domStyle.id];
				}
			}
		};
	}

	function addStylesToDom(styles, options) {
		for(var i = 0; i < styles.length; i++) {
			var item = styles[i];
			var domStyle = stylesInDom[item.id];
			if(domStyle) {
				domStyle.refs++;
				for(var j = 0; j < domStyle.parts.length; j++) {
					domStyle.parts[j](item.parts[j]);
				}
				for(; j < item.parts.length; j++) {
					domStyle.parts.push(addStyle(item.parts[j], options));
				}
			} else {
				var parts = [];
				for(var j = 0; j < item.parts.length; j++) {
					parts.push(addStyle(item.parts[j], options));
				}
				stylesInDom[item.id] = {id: item.id, refs: 1, parts: parts};
			}
		}
	}

	function listToStyles(list) {
		var styles = [];
		var newStyles = {};
		for(var i = 0; i < list.length; i++) {
			var item = list[i];
			var id = item[0];
			var css = item[1];
			var media = item[2];
			var sourceMap = item[3];
			var part = {css: css, media: media, sourceMap: sourceMap};
			if(!newStyles[id])
				styles.push(newStyles[id] = {id: id, parts: [part]});
			else
				newStyles[id].parts.push(part);
		}
		return styles;
	}

	function createStyleElement() {
		var styleElement = document.createElement("style");
		var head = getHeadElement();
		styleElement.type = "text/css";
		head.appendChild(styleElement);
		return styleElement;
	}

	function createLinkElement() {
		var linkElement = document.createElement("link");
		var head = getHeadElement();
		linkElement.rel = "stylesheet";
		head.appendChild(linkElement);
		return linkElement;
	}

	function addStyle(obj, options) {
		var styleElement, update, remove;

		if (options.singleton) {
			var styleIndex = singletonCounter++;
			styleElement = singletonElement || (singletonElement = createStyleElement());
			update = applyToSingletonTag.bind(null, styleElement, styleIndex, false);
			remove = applyToSingletonTag.bind(null, styleElement, styleIndex, true);
		} else if(obj.sourceMap &&
			typeof URL === "function" &&
			typeof URL.createObjectURL === "function" &&
			typeof URL.revokeObjectURL === "function" &&
			typeof Blob === "function" &&
			typeof btoa === "function") {
			styleElement = createLinkElement();
			update = updateLink.bind(null, styleElement);
			remove = function() {
				styleElement.parentNode.removeChild(styleElement);
				if(styleElement.href)
					URL.revokeObjectURL(styleElement.href);
			};
		} else {
			styleElement = createStyleElement();
			update = applyToTag.bind(null, styleElement);
			remove = function() {
				styleElement.parentNode.removeChild(styleElement);
			};
		}

		update(obj);

		return function updateStyle(newObj) {
			if(newObj) {
				if(newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap)
					return;
				update(obj = newObj);
			} else {
				remove();
			}
		};
	}

	var replaceText = (function () {
		var textStore = [];

		return function (index, replacement) {
			textStore[index] = replacement;
			return textStore.filter(Boolean).join('\n');
		};
	})();

	function applyToSingletonTag(styleElement, index, remove, obj) {
		var css = remove ? "" : obj.css;

		if (styleElement.styleSheet) {
			styleElement.styleSheet.cssText = replaceText(index, css);
		} else {
			var cssNode = document.createTextNode(css);
			var childNodes = styleElement.childNodes;
			if (childNodes[index]) styleElement.removeChild(childNodes[index]);
			if (childNodes.length) {
				styleElement.insertBefore(cssNode, childNodes[index]);
			} else {
				styleElement.appendChild(cssNode);
			}
		}
	}

	function applyToTag(styleElement, obj) {
		var css = obj.css;
		var media = obj.media;
		var sourceMap = obj.sourceMap;

		if(media) {
			styleElement.setAttribute("media", media)
		}

		if(styleElement.styleSheet) {
			styleElement.styleSheet.cssText = css;
		} else {
			while(styleElement.firstChild) {
				styleElement.removeChild(styleElement.firstChild);
			}
			styleElement.appendChild(document.createTextNode(css));
		}
	}

	function updateLink(linkElement, obj) {
		var css = obj.css;
		var media = obj.media;
		var sourceMap = obj.sourceMap;

		if(sourceMap) {
			// http://stackoverflow.com/a/26603875
			css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))) + " */";
		}

		var blob = new Blob([css], { type: "text/css" });

		var oldSrc = linkElement.href;

		linkElement.href = URL.createObjectURL(blob);

		if(oldSrc)
			URL.revokeObjectURL(oldSrc);
	}


/***/ }),
/* 26 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(27), __webpack_require__(28)], __WEBPACK_AMD_DEFINE_RESULT__ = function ($, mousewheel) {

		var Scroll = function(container, pixelsPerSecond){

			/**
			 *  The scrollable element
			 */
			this.element = container;

			/**
			 *  the current scroll position. Used to 
			 *  check if there's been an update.
			 *  @type  {Number}
			 */
			this.currentScroll = -1;

			/**
			 *  the scrolling rate
			 */
			this.pixelsPerSecond = pixelsPerSecond;

			/**
			 *  the last update time
			 */
			this.lastUpdate = -1;

			/**
			 *  whether or not the element is autoadvancing
			 */
			this.autoAdvance = false;

			/**
			 *  manual override if the user is scrolling
			 */
			this.manualOverride = false;

			/**
			 *  the difference between the current and last scroll
			 */
			this.scrollDifference = 0;

			/**
			 *  the timeout for resumeAuto
			 */
			this.restStart = -1;

			/**
			 *  stop the clock when it's scrolling
			 */
			// this.element.addEventListener("mousewheel", this.scrolling.bind(this));
			// this.element.addEventListener("DomMouseScroll", this.scrolling.bind(this));
			$(this.element).on("mousewheel", this.scrolling.bind(this));

			this.element.addEventListener("touchstart", this.touchstart.bind(this));
			this.element.addEventListener("touchend", this.touchend.bind(this));

			/**
			 * a prebound version of the loop function
			 */
			this._boundloop = this.loop.bind(this);
			//start the loop
			this.loop();

			/**
			 *  the callback function when touch override starts
			 */
			this.scrubstart = function(){};

			/**
			 *  the callback function when touch override end
			 */
			this.scrubend = function(){};

			//scroll back to the top if the page was reloaded
			window.addEventListener("beforeunload", function() {
			    this.element.scrollLeft = 0;
			}.bind(this));
		};

		/**
		 *  The update loop
		 */
		Scroll.prototype.loop = function(){
			var currentTime = Date.now();
			requestAnimationFrame(this._boundloop);
			//test if manual override is over
			if (this.manualOverride && !this.touchdown){
				var scroll = this.element.scrollLeft;
				if (scroll === this.currentScroll){
					if (this.restStart === -1) {
						this.restStart = currentTime;
					} else if (currentTime - this.restStart > 100){
						this.manualOverride = false;
						this.scrubend(this.currentScroll);
					}
				} else {
					this.restStart = -1;
				}
				this.currentScroll = scroll;
			}
			if (this.lastUpdate !== -1 && !this.manualOverride && this.autoAdvance){
				var delta = currentTime - this.lastUpdate;
				this.currentScroll += (delta / 1000) * this.pixelsPerSecond;
				this.element.scrollLeft = Math.round(this.currentScroll);
			}
			this.lastUpdate = currentTime;
		};

		/**
		 *  callback when it's scrolling
		 */
		Scroll.prototype.scrolling = function(){
			if (!this.manualOverride){
				this.manualOverride = true;
				this.scrubstart();
			}
		};

		/**
		 *  called on touch
		 */
		Scroll.prototype.touchstart = function(){
			this.touchdown = true;
			this.scrolling();
		};

		/**
		 *  called on touchend
		 */
		Scroll.prototype.touchend = function(){
			this.touchdown = false;
		};

		/**
		 *  While the scrolling isn't paused,
		 *  move forward normally
		 */
		Scroll.prototype.move = function(){
			/*if (this.lastUpdate !== -1){
				var delta = currentTime - this.lastUpdate;
				this.currentScroll += (delta / 1000) * this.pixelsPerSecond;
				this.element.scrollLeft(this.currentScroll);
			}*/
		};

		/**
		 *  start auto advancing
		 */
		Scroll.prototype.start = function(){
			this.currentScroll = this.element.scrollLeft;
			this.autoAdvance = true;		
		};

		/**
		 *  stop auto advancing
		 */
		Scroll.prototype.stop = function(){
			this.autoAdvance = false;
		};

		/**
		 *  restart from the beginning
		 */
		Scroll.prototype.restart = function(){
			var startOffset = this.element.offsetWidth / 2;
			this.element.scrollLeft = 0;
			this.currentScroll = 0;
		};


		return Scroll;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 27 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * jQuery JavaScript Library v2.2.4
	 * http://jquery.com/
	 *
	 * Includes Sizzle.js
	 * http://sizzlejs.com/
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license
	 * http://jquery.org/license
	 *
	 * Date: 2016-05-20T17:23Z
	 */

	(function( global, factory ) {

		if ( typeof module === "object" && typeof module.exports === "object" ) {
			// For CommonJS and CommonJS-like environments where a proper `window`
			// is present, execute the factory and get jQuery.
			// For environments that do not have a `window` with a `document`
			// (such as Node.js), expose a factory as module.exports.
			// This accentuates the need for the creation of a real `window`.
			// e.g. var jQuery = require("jquery")(window);
			// See ticket #14549 for more info.
			module.exports = global.document ?
				factory( global, true ) :
				function( w ) {
					if ( !w.document ) {
						throw new Error( "jQuery requires a window with a document" );
					}
					return factory( w );
				};
		} else {
			factory( global );
		}

	// Pass this if window is not defined yet
	}(typeof window !== "undefined" ? window : this, function( window, noGlobal ) {

	// Support: Firefox 18+
	// Can't be in strict mode, several libs including ASP.NET trace
	// the stack via arguments.caller.callee and Firefox dies if
	// you try to trace through "use strict" call chains. (#13335)
	//"use strict";
	var arr = [];

	var document = window.document;

	var slice = arr.slice;

	var concat = arr.concat;

	var push = arr.push;

	var indexOf = arr.indexOf;

	var class2type = {};

	var toString = class2type.toString;

	var hasOwn = class2type.hasOwnProperty;

	var support = {};



	var
		version = "2.2.4",

		// Define a local copy of jQuery
		jQuery = function( selector, context ) {

			// The jQuery object is actually just the init constructor 'enhanced'
			// Need init if jQuery is called (just allow error to be thrown if not included)
			return new jQuery.fn.init( selector, context );
		},

		// Support: Android<4.1
		// Make sure we trim BOM and NBSP
		rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

		// Matches dashed string for camelizing
		rmsPrefix = /^-ms-/,
		rdashAlpha = /-([\da-z])/gi,

		// Used by jQuery.camelCase as callback to replace()
		fcamelCase = function( all, letter ) {
			return letter.toUpperCase();
		};

	jQuery.fn = jQuery.prototype = {

		// The current version of jQuery being used
		jquery: version,

		constructor: jQuery,

		// Start with an empty selector
		selector: "",

		// The default length of a jQuery object is 0
		length: 0,

		toArray: function() {
			return slice.call( this );
		},

		// Get the Nth element in the matched element set OR
		// Get the whole matched element set as a clean array
		get: function( num ) {
			return num != null ?

				// Return just the one element from the set
				( num < 0 ? this[ num + this.length ] : this[ num ] ) :

				// Return all the elements in a clean array
				slice.call( this );
		},

		// Take an array of elements and push it onto the stack
		// (returning the new matched element set)
		pushStack: function( elems ) {

			// Build a new jQuery matched element set
			var ret = jQuery.merge( this.constructor(), elems );

			// Add the old object onto the stack (as a reference)
			ret.prevObject = this;
			ret.context = this.context;

			// Return the newly-formed element set
			return ret;
		},

		// Execute a callback for every element in the matched set.
		each: function( callback ) {
			return jQuery.each( this, callback );
		},

		map: function( callback ) {
			return this.pushStack( jQuery.map( this, function( elem, i ) {
				return callback.call( elem, i, elem );
			} ) );
		},

		slice: function() {
			return this.pushStack( slice.apply( this, arguments ) );
		},

		first: function() {
			return this.eq( 0 );
		},

		last: function() {
			return this.eq( -1 );
		},

		eq: function( i ) {
			var len = this.length,
				j = +i + ( i < 0 ? len : 0 );
			return this.pushStack( j >= 0 && j < len ? [ this[ j ] ] : [] );
		},

		end: function() {
			return this.prevObject || this.constructor();
		},

		// For internal use only.
		// Behaves like an Array's method, not like a jQuery method.
		push: push,
		sort: arr.sort,
		splice: arr.splice
	};

	jQuery.extend = jQuery.fn.extend = function() {
		var options, name, src, copy, copyIsArray, clone,
			target = arguments[ 0 ] || {},
			i = 1,
			length = arguments.length,
			deep = false;

		// Handle a deep copy situation
		if ( typeof target === "boolean" ) {
			deep = target;

			// Skip the boolean and the target
			target = arguments[ i ] || {};
			i++;
		}

		// Handle case when target is a string or something (possible in deep copy)
		if ( typeof target !== "object" && !jQuery.isFunction( target ) ) {
			target = {};
		}

		// Extend jQuery itself if only one argument is passed
		if ( i === length ) {
			target = this;
			i--;
		}

		for ( ; i < length; i++ ) {

			// Only deal with non-null/undefined values
			if ( ( options = arguments[ i ] ) != null ) {

				// Extend the base object
				for ( name in options ) {
					src = target[ name ];
					copy = options[ name ];

					// Prevent never-ending loop
					if ( target === copy ) {
						continue;
					}

					// Recurse if we're merging plain objects or arrays
					if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
						( copyIsArray = jQuery.isArray( copy ) ) ) ) {

						if ( copyIsArray ) {
							copyIsArray = false;
							clone = src && jQuery.isArray( src ) ? src : [];

						} else {
							clone = src && jQuery.isPlainObject( src ) ? src : {};
						}

						// Never move original objects, clone them
						target[ name ] = jQuery.extend( deep, clone, copy );

					// Don't bring in undefined values
					} else if ( copy !== undefined ) {
						target[ name ] = copy;
					}
				}
			}
		}

		// Return the modified object
		return target;
	};

	jQuery.extend( {

		// Unique for each copy of jQuery on the page
		expando: "jQuery" + ( version + Math.random() ).replace( /\D/g, "" ),

		// Assume jQuery is ready without the ready module
		isReady: true,

		error: function( msg ) {
			throw new Error( msg );
		},

		noop: function() {},

		isFunction: function( obj ) {
			return jQuery.type( obj ) === "function";
		},

		isArray: Array.isArray,

		isWindow: function( obj ) {
			return obj != null && obj === obj.window;
		},

		isNumeric: function( obj ) {

			// parseFloat NaNs numeric-cast false positives (null|true|false|"")
			// ...but misinterprets leading-number strings, particularly hex literals ("0x...")
			// subtraction forces infinities to NaN
			// adding 1 corrects loss of precision from parseFloat (#15100)
			var realStringObj = obj && obj.toString();
			return !jQuery.isArray( obj ) && ( realStringObj - parseFloat( realStringObj ) + 1 ) >= 0;
		},

		isPlainObject: function( obj ) {
			var key;

			// Not plain objects:
			// - Any object or value whose internal [[Class]] property is not "[object Object]"
			// - DOM nodes
			// - window
			if ( jQuery.type( obj ) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
				return false;
			}

			// Not own constructor property must be Object
			if ( obj.constructor &&
					!hasOwn.call( obj, "constructor" ) &&
					!hasOwn.call( obj.constructor.prototype || {}, "isPrototypeOf" ) ) {
				return false;
			}

			// Own properties are enumerated firstly, so to speed up,
			// if last one is own, then all properties are own
			for ( key in obj ) {}

			return key === undefined || hasOwn.call( obj, key );
		},

		isEmptyObject: function( obj ) {
			var name;
			for ( name in obj ) {
				return false;
			}
			return true;
		},

		type: function( obj ) {
			if ( obj == null ) {
				return obj + "";
			}

			// Support: Android<4.0, iOS<6 (functionish RegExp)
			return typeof obj === "object" || typeof obj === "function" ?
				class2type[ toString.call( obj ) ] || "object" :
				typeof obj;
		},

		// Evaluates a script in a global context
		globalEval: function( code ) {
			var script,
				indirect = eval;

			code = jQuery.trim( code );

			if ( code ) {

				// If the code includes a valid, prologue position
				// strict mode pragma, execute code by injecting a
				// script tag into the document.
				if ( code.indexOf( "use strict" ) === 1 ) {
					script = document.createElement( "script" );
					script.text = code;
					document.head.appendChild( script ).parentNode.removeChild( script );
				} else {

					// Otherwise, avoid the DOM node creation, insertion
					// and removal by using an indirect global eval

					indirect( code );
				}
			}
		},

		// Convert dashed to camelCase; used by the css and data modules
		// Support: IE9-11+
		// Microsoft forgot to hump their vendor prefix (#9572)
		camelCase: function( string ) {
			return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
		},

		nodeName: function( elem, name ) {
			return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
		},

		each: function( obj, callback ) {
			var length, i = 0;

			if ( isArrayLike( obj ) ) {
				length = obj.length;
				for ( ; i < length; i++ ) {
					if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
						break;
					}
				}
			} else {
				for ( i in obj ) {
					if ( callback.call( obj[ i ], i, obj[ i ] ) === false ) {
						break;
					}
				}
			}

			return obj;
		},

		// Support: Android<4.1
		trim: function( text ) {
			return text == null ?
				"" :
				( text + "" ).replace( rtrim, "" );
		},

		// results is for internal usage only
		makeArray: function( arr, results ) {
			var ret = results || [];

			if ( arr != null ) {
				if ( isArrayLike( Object( arr ) ) ) {
					jQuery.merge( ret,
						typeof arr === "string" ?
						[ arr ] : arr
					);
				} else {
					push.call( ret, arr );
				}
			}

			return ret;
		},

		inArray: function( elem, arr, i ) {
			return arr == null ? -1 : indexOf.call( arr, elem, i );
		},

		merge: function( first, second ) {
			var len = +second.length,
				j = 0,
				i = first.length;

			for ( ; j < len; j++ ) {
				first[ i++ ] = second[ j ];
			}

			first.length = i;

			return first;
		},

		grep: function( elems, callback, invert ) {
			var callbackInverse,
				matches = [],
				i = 0,
				length = elems.length,
				callbackExpect = !invert;

			// Go through the array, only saving the items
			// that pass the validator function
			for ( ; i < length; i++ ) {
				callbackInverse = !callback( elems[ i ], i );
				if ( callbackInverse !== callbackExpect ) {
					matches.push( elems[ i ] );
				}
			}

			return matches;
		},

		// arg is for internal usage only
		map: function( elems, callback, arg ) {
			var length, value,
				i = 0,
				ret = [];

			// Go through the array, translating each of the items to their new values
			if ( isArrayLike( elems ) ) {
				length = elems.length;
				for ( ; i < length; i++ ) {
					value = callback( elems[ i ], i, arg );

					if ( value != null ) {
						ret.push( value );
					}
				}

			// Go through every key on the object,
			} else {
				for ( i in elems ) {
					value = callback( elems[ i ], i, arg );

					if ( value != null ) {
						ret.push( value );
					}
				}
			}

			// Flatten any nested arrays
			return concat.apply( [], ret );
		},

		// A global GUID counter for objects
		guid: 1,

		// Bind a function to a context, optionally partially applying any
		// arguments.
		proxy: function( fn, context ) {
			var tmp, args, proxy;

			if ( typeof context === "string" ) {
				tmp = fn[ context ];
				context = fn;
				fn = tmp;
			}

			// Quick check to determine if target is callable, in the spec
			// this throws a TypeError, but we will just return undefined.
			if ( !jQuery.isFunction( fn ) ) {
				return undefined;
			}

			// Simulated bind
			args = slice.call( arguments, 2 );
			proxy = function() {
				return fn.apply( context || this, args.concat( slice.call( arguments ) ) );
			};

			// Set the guid of unique handler to the same of original handler, so it can be removed
			proxy.guid = fn.guid = fn.guid || jQuery.guid++;

			return proxy;
		},

		now: Date.now,

		// jQuery.support is not used in Core but other projects attach their
		// properties to it so it needs to exist.
		support: support
	} );

	// JSHint would error on this code due to the Symbol not being defined in ES5.
	// Defining this global in .jshintrc would create a danger of using the global
	// unguarded in another place, it seems safer to just disable JSHint for these
	// three lines.
	/* jshint ignore: start */
	if ( typeof Symbol === "function" ) {
		jQuery.fn[ Symbol.iterator ] = arr[ Symbol.iterator ];
	}
	/* jshint ignore: end */

	// Populate the class2type map
	jQuery.each( "Boolean Number String Function Array Date RegExp Object Error Symbol".split( " " ),
	function( i, name ) {
		class2type[ "[object " + name + "]" ] = name.toLowerCase();
	} );

	function isArrayLike( obj ) {

		// Support: iOS 8.2 (not reproducible in simulator)
		// `in` check used to prevent JIT error (gh-2145)
		// hasOwn isn't used here due to false negatives
		// regarding Nodelist length in IE
		var length = !!obj && "length" in obj && obj.length,
			type = jQuery.type( obj );

		if ( type === "function" || jQuery.isWindow( obj ) ) {
			return false;
		}

		return type === "array" || length === 0 ||
			typeof length === "number" && length > 0 && ( length - 1 ) in obj;
	}
	var Sizzle =
	/*!
	 * Sizzle CSS Selector Engine v2.2.1
	 * http://sizzlejs.com/
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license
	 * http://jquery.org/license
	 *
	 * Date: 2015-10-17
	 */
	(function( window ) {

	var i,
		support,
		Expr,
		getText,
		isXML,
		tokenize,
		compile,
		select,
		outermostContext,
		sortInput,
		hasDuplicate,

		// Local document vars
		setDocument,
		document,
		docElem,
		documentIsHTML,
		rbuggyQSA,
		rbuggyMatches,
		matches,
		contains,

		// Instance-specific data
		expando = "sizzle" + 1 * new Date(),
		preferredDoc = window.document,
		dirruns = 0,
		done = 0,
		classCache = createCache(),
		tokenCache = createCache(),
		compilerCache = createCache(),
		sortOrder = function( a, b ) {
			if ( a === b ) {
				hasDuplicate = true;
			}
			return 0;
		},

		// General-purpose constants
		MAX_NEGATIVE = 1 << 31,

		// Instance methods
		hasOwn = ({}).hasOwnProperty,
		arr = [],
		pop = arr.pop,
		push_native = arr.push,
		push = arr.push,
		slice = arr.slice,
		// Use a stripped-down indexOf as it's faster than native
		// http://jsperf.com/thor-indexof-vs-for/5
		indexOf = function( list, elem ) {
			var i = 0,
				len = list.length;
			for ( ; i < len; i++ ) {
				if ( list[i] === elem ) {
					return i;
				}
			}
			return -1;
		},

		booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",

		// Regular expressions

		// http://www.w3.org/TR/css3-selectors/#whitespace
		whitespace = "[\\x20\\t\\r\\n\\f]",

		// http://www.w3.org/TR/CSS21/syndata.html#value-def-identifier
		identifier = "(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",

		// Attribute selectors: http://www.w3.org/TR/selectors/#attribute-selectors
		attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace +
			// Operator (capture 2)
			"*([*^$|!~]?=)" + whitespace +
			// "Attribute values must be CSS identifiers [capture 5] or strings [capture 3 or capture 4]"
			"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace +
			"*\\]",

		pseudos = ":(" + identifier + ")(?:\\((" +
			// To reduce the number of selectors needing tokenize in the preFilter, prefer arguments:
			// 1. quoted (capture 3; capture 4 or capture 5)
			"('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" +
			// 2. simple (capture 6)
			"((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" +
			// 3. anything else (capture 2)
			".*" +
			")\\)|)",

		// Leading and non-escaped trailing whitespace, capturing some non-whitespace characters preceding the latter
		rwhitespace = new RegExp( whitespace + "+", "g" ),
		rtrim = new RegExp( "^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g" ),

		rcomma = new RegExp( "^" + whitespace + "*," + whitespace + "*" ),
		rcombinators = new RegExp( "^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*" ),

		rattributeQuotes = new RegExp( "=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g" ),

		rpseudo = new RegExp( pseudos ),
		ridentifier = new RegExp( "^" + identifier + "$" ),

		matchExpr = {
			"ID": new RegExp( "^#(" + identifier + ")" ),
			"CLASS": new RegExp( "^\\.(" + identifier + ")" ),
			"TAG": new RegExp( "^(" + identifier + "|[*])" ),
			"ATTR": new RegExp( "^" + attributes ),
			"PSEUDO": new RegExp( "^" + pseudos ),
			"CHILD": new RegExp( "^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace +
				"*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace +
				"*(\\d+)|))" + whitespace + "*\\)|)", "i" ),
			"bool": new RegExp( "^(?:" + booleans + ")$", "i" ),
			// For use in libraries implementing .is()
			// We use this for POS matching in `select`
			"needsContext": new RegExp( "^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" +
				whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i" )
		},

		rinputs = /^(?:input|select|textarea|button)$/i,
		rheader = /^h\d$/i,

		rnative = /^[^{]+\{\s*\[native \w/,

		// Easily-parseable/retrievable ID or TAG or CLASS selectors
		rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,

		rsibling = /[+~]/,
		rescape = /'|\\/g,

		// CSS escapes http://www.w3.org/TR/CSS21/syndata.html#escaped-characters
		runescape = new RegExp( "\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig" ),
		funescape = function( _, escaped, escapedWhitespace ) {
			var high = "0x" + escaped - 0x10000;
			// NaN means non-codepoint
			// Support: Firefox<24
			// Workaround erroneous numeric interpretation of +"0x"
			return high !== high || escapedWhitespace ?
				escaped :
				high < 0 ?
					// BMP codepoint
					String.fromCharCode( high + 0x10000 ) :
					// Supplemental Plane codepoint (surrogate pair)
					String.fromCharCode( high >> 10 | 0xD800, high & 0x3FF | 0xDC00 );
		},

		// Used for iframes
		// See setDocument()
		// Removing the function wrapper causes a "Permission Denied"
		// error in IE
		unloadHandler = function() {
			setDocument();
		};

	// Optimize for push.apply( _, NodeList )
	try {
		push.apply(
			(arr = slice.call( preferredDoc.childNodes )),
			preferredDoc.childNodes
		);
		// Support: Android<4.0
		// Detect silently failing push.apply
		arr[ preferredDoc.childNodes.length ].nodeType;
	} catch ( e ) {
		push = { apply: arr.length ?

			// Leverage slice if possible
			function( target, els ) {
				push_native.apply( target, slice.call(els) );
			} :

			// Support: IE<9
			// Otherwise append directly
			function( target, els ) {
				var j = target.length,
					i = 0;
				// Can't trust NodeList.length
				while ( (target[j++] = els[i++]) ) {}
				target.length = j - 1;
			}
		};
	}

	function Sizzle( selector, context, results, seed ) {
		var m, i, elem, nid, nidselect, match, groups, newSelector,
			newContext = context && context.ownerDocument,

			// nodeType defaults to 9, since context defaults to document
			nodeType = context ? context.nodeType : 9;

		results = results || [];

		// Return early from calls with invalid selector or context
		if ( typeof selector !== "string" || !selector ||
			nodeType !== 1 && nodeType !== 9 && nodeType !== 11 ) {

			return results;
		}

		// Try to shortcut find operations (as opposed to filters) in HTML documents
		if ( !seed ) {

			if ( ( context ? context.ownerDocument || context : preferredDoc ) !== document ) {
				setDocument( context );
			}
			context = context || document;

			if ( documentIsHTML ) {

				// If the selector is sufficiently simple, try using a "get*By*" DOM method
				// (excepting DocumentFragment context, where the methods don't exist)
				if ( nodeType !== 11 && (match = rquickExpr.exec( selector )) ) {

					// ID selector
					if ( (m = match[1]) ) {

						// Document context
						if ( nodeType === 9 ) {
							if ( (elem = context.getElementById( m )) ) {

								// Support: IE, Opera, Webkit
								// TODO: identify versions
								// getElementById can match elements by name instead of ID
								if ( elem.id === m ) {
									results.push( elem );
									return results;
								}
							} else {
								return results;
							}

						// Element context
						} else {

							// Support: IE, Opera, Webkit
							// TODO: identify versions
							// getElementById can match elements by name instead of ID
							if ( newContext && (elem = newContext.getElementById( m )) &&
								contains( context, elem ) &&
								elem.id === m ) {

								results.push( elem );
								return results;
							}
						}

					// Type selector
					} else if ( match[2] ) {
						push.apply( results, context.getElementsByTagName( selector ) );
						return results;

					// Class selector
					} else if ( (m = match[3]) && support.getElementsByClassName &&
						context.getElementsByClassName ) {

						push.apply( results, context.getElementsByClassName( m ) );
						return results;
					}
				}

				// Take advantage of querySelectorAll
				if ( support.qsa &&
					!compilerCache[ selector + " " ] &&
					(!rbuggyQSA || !rbuggyQSA.test( selector )) ) {

					if ( nodeType !== 1 ) {
						newContext = context;
						newSelector = selector;

					// qSA looks outside Element context, which is not what we want
					// Thanks to Andrew Dupont for this workaround technique
					// Support: IE <=8
					// Exclude object elements
					} else if ( context.nodeName.toLowerCase() !== "object" ) {

						// Capture the context ID, setting it first if necessary
						if ( (nid = context.getAttribute( "id" )) ) {
							nid = nid.replace( rescape, "\\$&" );
						} else {
							context.setAttribute( "id", (nid = expando) );
						}

						// Prefix every selector in the list
						groups = tokenize( selector );
						i = groups.length;
						nidselect = ridentifier.test( nid ) ? "#" + nid : "[id='" + nid + "']";
						while ( i-- ) {
							groups[i] = nidselect + " " + toSelector( groups[i] );
						}
						newSelector = groups.join( "," );

						// Expand context for sibling selectors
						newContext = rsibling.test( selector ) && testContext( context.parentNode ) ||
							context;
					}

					if ( newSelector ) {
						try {
							push.apply( results,
								newContext.querySelectorAll( newSelector )
							);
							return results;
						} catch ( qsaError ) {
						} finally {
							if ( nid === expando ) {
								context.removeAttribute( "id" );
							}
						}
					}
				}
			}
		}

		// All others
		return select( selector.replace( rtrim, "$1" ), context, results, seed );
	}

	/**
	 * Create key-value caches of limited size
	 * @returns {function(string, object)} Returns the Object data after storing it on itself with
	 *	property name the (space-suffixed) string and (if the cache is larger than Expr.cacheLength)
	 *	deleting the oldest entry
	 */
	function createCache() {
		var keys = [];

		function cache( key, value ) {
			// Use (key + " ") to avoid collision with native prototype properties (see Issue #157)
			if ( keys.push( key + " " ) > Expr.cacheLength ) {
				// Only keep the most recent entries
				delete cache[ keys.shift() ];
			}
			return (cache[ key + " " ] = value);
		}
		return cache;
	}

	/**
	 * Mark a function for special use by Sizzle
	 * @param {Function} fn The function to mark
	 */
	function markFunction( fn ) {
		fn[ expando ] = true;
		return fn;
	}

	/**
	 * Support testing using an element
	 * @param {Function} fn Passed the created div and expects a boolean result
	 */
	function assert( fn ) {
		var div = document.createElement("div");

		try {
			return !!fn( div );
		} catch (e) {
			return false;
		} finally {
			// Remove from its parent by default
			if ( div.parentNode ) {
				div.parentNode.removeChild( div );
			}
			// release memory in IE
			div = null;
		}
	}

	/**
	 * Adds the same handler for all of the specified attrs
	 * @param {String} attrs Pipe-separated list of attributes
	 * @param {Function} handler The method that will be applied
	 */
	function addHandle( attrs, handler ) {
		var arr = attrs.split("|"),
			i = arr.length;

		while ( i-- ) {
			Expr.attrHandle[ arr[i] ] = handler;
		}
	}

	/**
	 * Checks document order of two siblings
	 * @param {Element} a
	 * @param {Element} b
	 * @returns {Number} Returns less than 0 if a precedes b, greater than 0 if a follows b
	 */
	function siblingCheck( a, b ) {
		var cur = b && a,
			diff = cur && a.nodeType === 1 && b.nodeType === 1 &&
				( ~b.sourceIndex || MAX_NEGATIVE ) -
				( ~a.sourceIndex || MAX_NEGATIVE );

		// Use IE sourceIndex if available on both nodes
		if ( diff ) {
			return diff;
		}

		// Check if b follows a
		if ( cur ) {
			while ( (cur = cur.nextSibling) ) {
				if ( cur === b ) {
					return -1;
				}
			}
		}

		return a ? 1 : -1;
	}

	/**
	 * Returns a function to use in pseudos for input types
	 * @param {String} type
	 */
	function createInputPseudo( type ) {
		return function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && elem.type === type;
		};
	}

	/**
	 * Returns a function to use in pseudos for buttons
	 * @param {String} type
	 */
	function createButtonPseudo( type ) {
		return function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && elem.type === type;
		};
	}

	/**
	 * Returns a function to use in pseudos for positionals
	 * @param {Function} fn
	 */
	function createPositionalPseudo( fn ) {
		return markFunction(function( argument ) {
			argument = +argument;
			return markFunction(function( seed, matches ) {
				var j,
					matchIndexes = fn( [], seed.length, argument ),
					i = matchIndexes.length;

				// Match elements found at the specified indexes
				while ( i-- ) {
					if ( seed[ (j = matchIndexes[i]) ] ) {
						seed[j] = !(matches[j] = seed[j]);
					}
				}
			});
		});
	}

	/**
	 * Checks a node for validity as a Sizzle context
	 * @param {Element|Object=} context
	 * @returns {Element|Object|Boolean} The input node if acceptable, otherwise a falsy value
	 */
	function testContext( context ) {
		return context && typeof context.getElementsByTagName !== "undefined" && context;
	}

	// Expose support vars for convenience
	support = Sizzle.support = {};

	/**
	 * Detects XML nodes
	 * @param {Element|Object} elem An element or a document
	 * @returns {Boolean} True iff elem is a non-HTML XML node
	 */
	isXML = Sizzle.isXML = function( elem ) {
		// documentElement is verified for cases where it doesn't yet exist
		// (such as loading iframes in IE - #4833)
		var documentElement = elem && (elem.ownerDocument || elem).documentElement;
		return documentElement ? documentElement.nodeName !== "HTML" : false;
	};

	/**
	 * Sets document-related variables once based on the current document
	 * @param {Element|Object} [doc] An element or document object to use to set the document
	 * @returns {Object} Returns the current document
	 */
	setDocument = Sizzle.setDocument = function( node ) {
		var hasCompare, parent,
			doc = node ? node.ownerDocument || node : preferredDoc;

		// Return early if doc is invalid or already selected
		if ( doc === document || doc.nodeType !== 9 || !doc.documentElement ) {
			return document;
		}

		// Update global variables
		document = doc;
		docElem = document.documentElement;
		documentIsHTML = !isXML( document );

		// Support: IE 9-11, Edge
		// Accessing iframe documents after unload throws "permission denied" errors (jQuery #13936)
		if ( (parent = document.defaultView) && parent.top !== parent ) {
			// Support: IE 11
			if ( parent.addEventListener ) {
				parent.addEventListener( "unload", unloadHandler, false );

			// Support: IE 9 - 10 only
			} else if ( parent.attachEvent ) {
				parent.attachEvent( "onunload", unloadHandler );
			}
		}

		/* Attributes
		---------------------------------------------------------------------- */

		// Support: IE<8
		// Verify that getAttribute really returns attributes and not properties
		// (excepting IE8 booleans)
		support.attributes = assert(function( div ) {
			div.className = "i";
			return !div.getAttribute("className");
		});

		/* getElement(s)By*
		---------------------------------------------------------------------- */

		// Check if getElementsByTagName("*") returns only elements
		support.getElementsByTagName = assert(function( div ) {
			div.appendChild( document.createComment("") );
			return !div.getElementsByTagName("*").length;
		});

		// Support: IE<9
		support.getElementsByClassName = rnative.test( document.getElementsByClassName );

		// Support: IE<10
		// Check if getElementById returns elements by name
		// The broken getElementById methods don't pick up programatically-set names,
		// so use a roundabout getElementsByName test
		support.getById = assert(function( div ) {
			docElem.appendChild( div ).id = expando;
			return !document.getElementsByName || !document.getElementsByName( expando ).length;
		});

		// ID find and filter
		if ( support.getById ) {
			Expr.find["ID"] = function( id, context ) {
				if ( typeof context.getElementById !== "undefined" && documentIsHTML ) {
					var m = context.getElementById( id );
					return m ? [ m ] : [];
				}
			};
			Expr.filter["ID"] = function( id ) {
				var attrId = id.replace( runescape, funescape );
				return function( elem ) {
					return elem.getAttribute("id") === attrId;
				};
			};
		} else {
			// Support: IE6/7
			// getElementById is not reliable as a find shortcut
			delete Expr.find["ID"];

			Expr.filter["ID"] =  function( id ) {
				var attrId = id.replace( runescape, funescape );
				return function( elem ) {
					var node = typeof elem.getAttributeNode !== "undefined" &&
						elem.getAttributeNode("id");
					return node && node.value === attrId;
				};
			};
		}

		// Tag
		Expr.find["TAG"] = support.getElementsByTagName ?
			function( tag, context ) {
				if ( typeof context.getElementsByTagName !== "undefined" ) {
					return context.getElementsByTagName( tag );

				// DocumentFragment nodes don't have gEBTN
				} else if ( support.qsa ) {
					return context.querySelectorAll( tag );
				}
			} :

			function( tag, context ) {
				var elem,
					tmp = [],
					i = 0,
					// By happy coincidence, a (broken) gEBTN appears on DocumentFragment nodes too
					results = context.getElementsByTagName( tag );

				// Filter out possible comments
				if ( tag === "*" ) {
					while ( (elem = results[i++]) ) {
						if ( elem.nodeType === 1 ) {
							tmp.push( elem );
						}
					}

					return tmp;
				}
				return results;
			};

		// Class
		Expr.find["CLASS"] = support.getElementsByClassName && function( className, context ) {
			if ( typeof context.getElementsByClassName !== "undefined" && documentIsHTML ) {
				return context.getElementsByClassName( className );
			}
		};

		/* QSA/matchesSelector
		---------------------------------------------------------------------- */

		// QSA and matchesSelector support

		// matchesSelector(:active) reports false when true (IE9/Opera 11.5)
		rbuggyMatches = [];

		// qSa(:focus) reports false when true (Chrome 21)
		// We allow this because of a bug in IE8/9 that throws an error
		// whenever `document.activeElement` is accessed on an iframe
		// So, we allow :focus to pass through QSA all the time to avoid the IE error
		// See http://bugs.jquery.com/ticket/13378
		rbuggyQSA = [];

		if ( (support.qsa = rnative.test( document.querySelectorAll )) ) {
			// Build QSA regex
			// Regex strategy adopted from Diego Perini
			assert(function( div ) {
				// Select is set to empty string on purpose
				// This is to test IE's treatment of not explicitly
				// setting a boolean content attribute,
				// since its presence should be enough
				// http://bugs.jquery.com/ticket/12359
				docElem.appendChild( div ).innerHTML = "<a id='" + expando + "'></a>" +
					"<select id='" + expando + "-\r\\' msallowcapture=''>" +
					"<option selected=''></option></select>";

				// Support: IE8, Opera 11-12.16
				// Nothing should be selected when empty strings follow ^= or $= or *=
				// The test attribute must be unknown in Opera but "safe" for WinRT
				// http://msdn.microsoft.com/en-us/library/ie/hh465388.aspx#attribute_section
				if ( div.querySelectorAll("[msallowcapture^='']").length ) {
					rbuggyQSA.push( "[*^$]=" + whitespace + "*(?:''|\"\")" );
				}

				// Support: IE8
				// Boolean attributes and "value" are not treated correctly
				if ( !div.querySelectorAll("[selected]").length ) {
					rbuggyQSA.push( "\\[" + whitespace + "*(?:value|" + booleans + ")" );
				}

				// Support: Chrome<29, Android<4.4, Safari<7.0+, iOS<7.0+, PhantomJS<1.9.8+
				if ( !div.querySelectorAll( "[id~=" + expando + "-]" ).length ) {
					rbuggyQSA.push("~=");
				}

				// Webkit/Opera - :checked should return selected option elements
				// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
				// IE8 throws error here and will not see later tests
				if ( !div.querySelectorAll(":checked").length ) {
					rbuggyQSA.push(":checked");
				}

				// Support: Safari 8+, iOS 8+
				// https://bugs.webkit.org/show_bug.cgi?id=136851
				// In-page `selector#id sibing-combinator selector` fails
				if ( !div.querySelectorAll( "a#" + expando + "+*" ).length ) {
					rbuggyQSA.push(".#.+[+~]");
				}
			});

			assert(function( div ) {
				// Support: Windows 8 Native Apps
				// The type and name attributes are restricted during .innerHTML assignment
				var input = document.createElement("input");
				input.setAttribute( "type", "hidden" );
				div.appendChild( input ).setAttribute( "name", "D" );

				// Support: IE8
				// Enforce case-sensitivity of name attribute
				if ( div.querySelectorAll("[name=d]").length ) {
					rbuggyQSA.push( "name" + whitespace + "*[*^$|!~]?=" );
				}

				// FF 3.5 - :enabled/:disabled and hidden elements (hidden elements are still enabled)
				// IE8 throws error here and will not see later tests
				if ( !div.querySelectorAll(":enabled").length ) {
					rbuggyQSA.push( ":enabled", ":disabled" );
				}

				// Opera 10-11 does not throw on post-comma invalid pseudos
				div.querySelectorAll("*,:x");
				rbuggyQSA.push(",.*:");
			});
		}

		if ( (support.matchesSelector = rnative.test( (matches = docElem.matches ||
			docElem.webkitMatchesSelector ||
			docElem.mozMatchesSelector ||
			docElem.oMatchesSelector ||
			docElem.msMatchesSelector) )) ) {

			assert(function( div ) {
				// Check to see if it's possible to do matchesSelector
				// on a disconnected node (IE 9)
				support.disconnectedMatch = matches.call( div, "div" );

				// This should fail with an exception
				// Gecko does not error, returns false instead
				matches.call( div, "[s!='']:x" );
				rbuggyMatches.push( "!=", pseudos );
			});
		}

		rbuggyQSA = rbuggyQSA.length && new RegExp( rbuggyQSA.join("|") );
		rbuggyMatches = rbuggyMatches.length && new RegExp( rbuggyMatches.join("|") );

		/* Contains
		---------------------------------------------------------------------- */
		hasCompare = rnative.test( docElem.compareDocumentPosition );

		// Element contains another
		// Purposefully self-exclusive
		// As in, an element does not contain itself
		contains = hasCompare || rnative.test( docElem.contains ) ?
			function( a, b ) {
				var adown = a.nodeType === 9 ? a.documentElement : a,
					bup = b && b.parentNode;
				return a === bup || !!( bup && bup.nodeType === 1 && (
					adown.contains ?
						adown.contains( bup ) :
						a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
				));
			} :
			function( a, b ) {
				if ( b ) {
					while ( (b = b.parentNode) ) {
						if ( b === a ) {
							return true;
						}
					}
				}
				return false;
			};

		/* Sorting
		---------------------------------------------------------------------- */

		// Document order sorting
		sortOrder = hasCompare ?
		function( a, b ) {

			// Flag for duplicate removal
			if ( a === b ) {
				hasDuplicate = true;
				return 0;
			}

			// Sort on method existence if only one input has compareDocumentPosition
			var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
			if ( compare ) {
				return compare;
			}

			// Calculate position if both inputs belong to the same document
			compare = ( a.ownerDocument || a ) === ( b.ownerDocument || b ) ?
				a.compareDocumentPosition( b ) :

				// Otherwise we know they are disconnected
				1;

			// Disconnected nodes
			if ( compare & 1 ||
				(!support.sortDetached && b.compareDocumentPosition( a ) === compare) ) {

				// Choose the first element that is related to our preferred document
				if ( a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a) ) {
					return -1;
				}
				if ( b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b) ) {
					return 1;
				}

				// Maintain original order
				return sortInput ?
					( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
					0;
			}

			return compare & 4 ? -1 : 1;
		} :
		function( a, b ) {
			// Exit early if the nodes are identical
			if ( a === b ) {
				hasDuplicate = true;
				return 0;
			}

			var cur,
				i = 0,
				aup = a.parentNode,
				bup = b.parentNode,
				ap = [ a ],
				bp = [ b ];

			// Parentless nodes are either documents or disconnected
			if ( !aup || !bup ) {
				return a === document ? -1 :
					b === document ? 1 :
					aup ? -1 :
					bup ? 1 :
					sortInput ?
					( indexOf( sortInput, a ) - indexOf( sortInput, b ) ) :
					0;

			// If the nodes are siblings, we can do a quick check
			} else if ( aup === bup ) {
				return siblingCheck( a, b );
			}

			// Otherwise we need full lists of their ancestors for comparison
			cur = a;
			while ( (cur = cur.parentNode) ) {
				ap.unshift( cur );
			}
			cur = b;
			while ( (cur = cur.parentNode) ) {
				bp.unshift( cur );
			}

			// Walk down the tree looking for a discrepancy
			while ( ap[i] === bp[i] ) {
				i++;
			}

			return i ?
				// Do a sibling check if the nodes have a common ancestor
				siblingCheck( ap[i], bp[i] ) :

				// Otherwise nodes in our document sort first
				ap[i] === preferredDoc ? -1 :
				bp[i] === preferredDoc ? 1 :
				0;
		};

		return document;
	};

	Sizzle.matches = function( expr, elements ) {
		return Sizzle( expr, null, null, elements );
	};

	Sizzle.matchesSelector = function( elem, expr ) {
		// Set document vars if needed
		if ( ( elem.ownerDocument || elem ) !== document ) {
			setDocument( elem );
		}

		// Make sure that attribute selectors are quoted
		expr = expr.replace( rattributeQuotes, "='$1']" );

		if ( support.matchesSelector && documentIsHTML &&
			!compilerCache[ expr + " " ] &&
			( !rbuggyMatches || !rbuggyMatches.test( expr ) ) &&
			( !rbuggyQSA     || !rbuggyQSA.test( expr ) ) ) {

			try {
				var ret = matches.call( elem, expr );

				// IE 9's matchesSelector returns false on disconnected nodes
				if ( ret || support.disconnectedMatch ||
						// As well, disconnected nodes are said to be in a document
						// fragment in IE 9
						elem.document && elem.document.nodeType !== 11 ) {
					return ret;
				}
			} catch (e) {}
		}

		return Sizzle( expr, document, null, [ elem ] ).length > 0;
	};

	Sizzle.contains = function( context, elem ) {
		// Set document vars if needed
		if ( ( context.ownerDocument || context ) !== document ) {
			setDocument( context );
		}
		return contains( context, elem );
	};

	Sizzle.attr = function( elem, name ) {
		// Set document vars if needed
		if ( ( elem.ownerDocument || elem ) !== document ) {
			setDocument( elem );
		}

		var fn = Expr.attrHandle[ name.toLowerCase() ],
			// Don't get fooled by Object.prototype properties (jQuery #13807)
			val = fn && hasOwn.call( Expr.attrHandle, name.toLowerCase() ) ?
				fn( elem, name, !documentIsHTML ) :
				undefined;

		return val !== undefined ?
			val :
			support.attributes || !documentIsHTML ?
				elem.getAttribute( name ) :
				(val = elem.getAttributeNode(name)) && val.specified ?
					val.value :
					null;
	};

	Sizzle.error = function( msg ) {
		throw new Error( "Syntax error, unrecognized expression: " + msg );
	};

	/**
	 * Document sorting and removing duplicates
	 * @param {ArrayLike} results
	 */
	Sizzle.uniqueSort = function( results ) {
		var elem,
			duplicates = [],
			j = 0,
			i = 0;

		// Unless we *know* we can detect duplicates, assume their presence
		hasDuplicate = !support.detectDuplicates;
		sortInput = !support.sortStable && results.slice( 0 );
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			while ( (elem = results[i++]) ) {
				if ( elem === results[ i ] ) {
					j = duplicates.push( i );
				}
			}
			while ( j-- ) {
				results.splice( duplicates[ j ], 1 );
			}
		}

		// Clear input after sorting to release objects
		// See https://github.com/jquery/sizzle/pull/225
		sortInput = null;

		return results;
	};

	/**
	 * Utility function for retrieving the text value of an array of DOM nodes
	 * @param {Array|Element} elem
	 */
	getText = Sizzle.getText = function( elem ) {
		var node,
			ret = "",
			i = 0,
			nodeType = elem.nodeType;

		if ( !nodeType ) {
			// If no nodeType, this is expected to be an array
			while ( (node = elem[i++]) ) {
				// Do not traverse comment nodes
				ret += getText( node );
			}
		} else if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent for elements
			// innerText usage removed for consistency of new lines (jQuery #11153)
			if ( typeof elem.textContent === "string" ) {
				return elem.textContent;
			} else {
				// Traverse its children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
		// Do not include comment or processing instruction nodes

		return ret;
	};

	Expr = Sizzle.selectors = {

		// Can be adjusted by the user
		cacheLength: 50,

		createPseudo: markFunction,

		match: matchExpr,

		attrHandle: {},

		find: {},

		relative: {
			">": { dir: "parentNode", first: true },
			" ": { dir: "parentNode" },
			"+": { dir: "previousSibling", first: true },
			"~": { dir: "previousSibling" }
		},

		preFilter: {
			"ATTR": function( match ) {
				match[1] = match[1].replace( runescape, funescape );

				// Move the given value to match[3] whether quoted or unquoted
				match[3] = ( match[3] || match[4] || match[5] || "" ).replace( runescape, funescape );

				if ( match[2] === "~=" ) {
					match[3] = " " + match[3] + " ";
				}

				return match.slice( 0, 4 );
			},

			"CHILD": function( match ) {
				/* matches from matchExpr["CHILD"]
					1 type (only|nth|...)
					2 what (child|of-type)
					3 argument (even|odd|\d*|\d*n([+-]\d+)?|...)
					4 xn-component of xn+y argument ([+-]?\d*n|)
					5 sign of xn-component
					6 x of xn-component
					7 sign of y-component
					8 y of y-component
				*/
				match[1] = match[1].toLowerCase();

				if ( match[1].slice( 0, 3 ) === "nth" ) {
					// nth-* requires argument
					if ( !match[3] ) {
						Sizzle.error( match[0] );
					}

					// numeric x and y parameters for Expr.filter.CHILD
					// remember that false/true cast respectively to 0/1
					match[4] = +( match[4] ? match[5] + (match[6] || 1) : 2 * ( match[3] === "even" || match[3] === "odd" ) );
					match[5] = +( ( match[7] + match[8] ) || match[3] === "odd" );

				// other types prohibit arguments
				} else if ( match[3] ) {
					Sizzle.error( match[0] );
				}

				return match;
			},

			"PSEUDO": function( match ) {
				var excess,
					unquoted = !match[6] && match[2];

				if ( matchExpr["CHILD"].test( match[0] ) ) {
					return null;
				}

				// Accept quoted arguments as-is
				if ( match[3] ) {
					match[2] = match[4] || match[5] || "";

				// Strip excess characters from unquoted arguments
				} else if ( unquoted && rpseudo.test( unquoted ) &&
					// Get excess from tokenize (recursively)
					(excess = tokenize( unquoted, true )) &&
					// advance to the next closing parenthesis
					(excess = unquoted.indexOf( ")", unquoted.length - excess ) - unquoted.length) ) {

					// excess is a negative index
					match[0] = match[0].slice( 0, excess );
					match[2] = unquoted.slice( 0, excess );
				}

				// Return only captures needed by the pseudo filter method (type and argument)
				return match.slice( 0, 3 );
			}
		},

		filter: {

			"TAG": function( nodeNameSelector ) {
				var nodeName = nodeNameSelector.replace( runescape, funescape ).toLowerCase();
				return nodeNameSelector === "*" ?
					function() { return true; } :
					function( elem ) {
						return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
					};
			},

			"CLASS": function( className ) {
				var pattern = classCache[ className + " " ];

				return pattern ||
					(pattern = new RegExp( "(^|" + whitespace + ")" + className + "(" + whitespace + "|$)" )) &&
					classCache( className, function( elem ) {
						return pattern.test( typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "" );
					});
			},

			"ATTR": function( name, operator, check ) {
				return function( elem ) {
					var result = Sizzle.attr( elem, name );

					if ( result == null ) {
						return operator === "!=";
					}
					if ( !operator ) {
						return true;
					}

					result += "";

					return operator === "=" ? result === check :
						operator === "!=" ? result !== check :
						operator === "^=" ? check && result.indexOf( check ) === 0 :
						operator === "*=" ? check && result.indexOf( check ) > -1 :
						operator === "$=" ? check && result.slice( -check.length ) === check :
						operator === "~=" ? ( " " + result.replace( rwhitespace, " " ) + " " ).indexOf( check ) > -1 :
						operator === "|=" ? result === check || result.slice( 0, check.length + 1 ) === check + "-" :
						false;
				};
			},

			"CHILD": function( type, what, argument, first, last ) {
				var simple = type.slice( 0, 3 ) !== "nth",
					forward = type.slice( -4 ) !== "last",
					ofType = what === "of-type";

				return first === 1 && last === 0 ?

					// Shortcut for :nth-*(n)
					function( elem ) {
						return !!elem.parentNode;
					} :

					function( elem, context, xml ) {
						var cache, uniqueCache, outerCache, node, nodeIndex, start,
							dir = simple !== forward ? "nextSibling" : "previousSibling",
							parent = elem.parentNode,
							name = ofType && elem.nodeName.toLowerCase(),
							useCache = !xml && !ofType,
							diff = false;

						if ( parent ) {

							// :(first|last|only)-(child|of-type)
							if ( simple ) {
								while ( dir ) {
									node = elem;
									while ( (node = node[ dir ]) ) {
										if ( ofType ?
											node.nodeName.toLowerCase() === name :
											node.nodeType === 1 ) {

											return false;
										}
									}
									// Reverse direction for :only-* (if we haven't yet done so)
									start = dir = type === "only" && !start && "nextSibling";
								}
								return true;
							}

							start = [ forward ? parent.firstChild : parent.lastChild ];

							// non-xml :nth-child(...) stores cache data on `parent`
							if ( forward && useCache ) {

								// Seek `elem` from a previously-cached index

								// ...in a gzip-friendly way
								node = parent;
								outerCache = node[ expando ] || (node[ expando ] = {});

								// Support: IE <9 only
								// Defend against cloned attroperties (jQuery gh-1709)
								uniqueCache = outerCache[ node.uniqueID ] ||
									(outerCache[ node.uniqueID ] = {});

								cache = uniqueCache[ type ] || [];
								nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
								diff = nodeIndex && cache[ 2 ];
								node = nodeIndex && parent.childNodes[ nodeIndex ];

								while ( (node = ++nodeIndex && node && node[ dir ] ||

									// Fallback to seeking `elem` from the start
									(diff = nodeIndex = 0) || start.pop()) ) {

									// When found, cache indexes on `parent` and break
									if ( node.nodeType === 1 && ++diff && node === elem ) {
										uniqueCache[ type ] = [ dirruns, nodeIndex, diff ];
										break;
									}
								}

							} else {
								// Use previously-cached element index if available
								if ( useCache ) {
									// ...in a gzip-friendly way
									node = elem;
									outerCache = node[ expando ] || (node[ expando ] = {});

									// Support: IE <9 only
									// Defend against cloned attroperties (jQuery gh-1709)
									uniqueCache = outerCache[ node.uniqueID ] ||
										(outerCache[ node.uniqueID ] = {});

									cache = uniqueCache[ type ] || [];
									nodeIndex = cache[ 0 ] === dirruns && cache[ 1 ];
									diff = nodeIndex;
								}

								// xml :nth-child(...)
								// or :nth-last-child(...) or :nth(-last)?-of-type(...)
								if ( diff === false ) {
									// Use the same loop as above to seek `elem` from the start
									while ( (node = ++nodeIndex && node && node[ dir ] ||
										(diff = nodeIndex = 0) || start.pop()) ) {

										if ( ( ofType ?
											node.nodeName.toLowerCase() === name :
											node.nodeType === 1 ) &&
											++diff ) {

											// Cache the index of each encountered element
											if ( useCache ) {
												outerCache = node[ expando ] || (node[ expando ] = {});

												// Support: IE <9 only
												// Defend against cloned attroperties (jQuery gh-1709)
												uniqueCache = outerCache[ node.uniqueID ] ||
													(outerCache[ node.uniqueID ] = {});

												uniqueCache[ type ] = [ dirruns, diff ];
											}

											if ( node === elem ) {
												break;
											}
										}
									}
								}
							}

							// Incorporate the offset, then check against cycle size
							diff -= last;
							return diff === first || ( diff % first === 0 && diff / first >= 0 );
						}
					};
			},

			"PSEUDO": function( pseudo, argument ) {
				// pseudo-class names are case-insensitive
				// http://www.w3.org/TR/selectors/#pseudo-classes
				// Prioritize by case sensitivity in case custom pseudos are added with uppercase letters
				// Remember that setFilters inherits from pseudos
				var args,
					fn = Expr.pseudos[ pseudo ] || Expr.setFilters[ pseudo.toLowerCase() ] ||
						Sizzle.error( "unsupported pseudo: " + pseudo );

				// The user may use createPseudo to indicate that
				// arguments are needed to create the filter function
				// just as Sizzle does
				if ( fn[ expando ] ) {
					return fn( argument );
				}

				// But maintain support for old signatures
				if ( fn.length > 1 ) {
					args = [ pseudo, pseudo, "", argument ];
					return Expr.setFilters.hasOwnProperty( pseudo.toLowerCase() ) ?
						markFunction(function( seed, matches ) {
							var idx,
								matched = fn( seed, argument ),
								i = matched.length;
							while ( i-- ) {
								idx = indexOf( seed, matched[i] );
								seed[ idx ] = !( matches[ idx ] = matched[i] );
							}
						}) :
						function( elem ) {
							return fn( elem, 0, args );
						};
				}

				return fn;
			}
		},

		pseudos: {
			// Potentially complex pseudos
			"not": markFunction(function( selector ) {
				// Trim the selector passed to compile
				// to avoid treating leading and trailing
				// spaces as combinators
				var input = [],
					results = [],
					matcher = compile( selector.replace( rtrim, "$1" ) );

				return matcher[ expando ] ?
					markFunction(function( seed, matches, context, xml ) {
						var elem,
							unmatched = matcher( seed, null, xml, [] ),
							i = seed.length;

						// Match elements unmatched by `matcher`
						while ( i-- ) {
							if ( (elem = unmatched[i]) ) {
								seed[i] = !(matches[i] = elem);
							}
						}
					}) :
					function( elem, context, xml ) {
						input[0] = elem;
						matcher( input, null, xml, results );
						// Don't keep the element (issue #299)
						input[0] = null;
						return !results.pop();
					};
			}),

			"has": markFunction(function( selector ) {
				return function( elem ) {
					return Sizzle( selector, elem ).length > 0;
				};
			}),

			"contains": markFunction(function( text ) {
				text = text.replace( runescape, funescape );
				return function( elem ) {
					return ( elem.textContent || elem.innerText || getText( elem ) ).indexOf( text ) > -1;
				};
			}),

			// "Whether an element is represented by a :lang() selector
			// is based solely on the element's language value
			// being equal to the identifier C,
			// or beginning with the identifier C immediately followed by "-".
			// The matching of C against the element's language value is performed case-insensitively.
			// The identifier C does not have to be a valid language name."
			// http://www.w3.org/TR/selectors/#lang-pseudo
			"lang": markFunction( function( lang ) {
				// lang value must be a valid identifier
				if ( !ridentifier.test(lang || "") ) {
					Sizzle.error( "unsupported lang: " + lang );
				}
				lang = lang.replace( runescape, funescape ).toLowerCase();
				return function( elem ) {
					var elemLang;
					do {
						if ( (elemLang = documentIsHTML ?
							elem.lang :
							elem.getAttribute("xml:lang") || elem.getAttribute("lang")) ) {

							elemLang = elemLang.toLowerCase();
							return elemLang === lang || elemLang.indexOf( lang + "-" ) === 0;
						}
					} while ( (elem = elem.parentNode) && elem.nodeType === 1 );
					return false;
				};
			}),

			// Miscellaneous
			"target": function( elem ) {
				var hash = window.location && window.location.hash;
				return hash && hash.slice( 1 ) === elem.id;
			},

			"root": function( elem ) {
				return elem === docElem;
			},

			"focus": function( elem ) {
				return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
			},

			// Boolean properties
			"enabled": function( elem ) {
				return elem.disabled === false;
			},

			"disabled": function( elem ) {
				return elem.disabled === true;
			},

			"checked": function( elem ) {
				// In CSS3, :checked should return both checked and selected elements
				// http://www.w3.org/TR/2011/REC-css3-selectors-20110929/#checked
				var nodeName = elem.nodeName.toLowerCase();
				return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
			},

			"selected": function( elem ) {
				// Accessing this property makes selected-by-default
				// options in Safari work properly
				if ( elem.parentNode ) {
					elem.parentNode.selectedIndex;
				}

				return elem.selected === true;
			},

			// Contents
			"empty": function( elem ) {
				// http://www.w3.org/TR/selectors/#empty-pseudo
				// :empty is negated by element (1) or content nodes (text: 3; cdata: 4; entity ref: 5),
				//   but not by others (comment: 8; processing instruction: 7; etc.)
				// nodeType < 6 works because attributes (2) do not appear as children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling ) {
					if ( elem.nodeType < 6 ) {
						return false;
					}
				}
				return true;
			},

			"parent": function( elem ) {
				return !Expr.pseudos["empty"]( elem );
			},

			// Element/input types
			"header": function( elem ) {
				return rheader.test( elem.nodeName );
			},

			"input": function( elem ) {
				return rinputs.test( elem.nodeName );
			},

			"button": function( elem ) {
				var name = elem.nodeName.toLowerCase();
				return name === "input" && elem.type === "button" || name === "button";
			},

			"text": function( elem ) {
				var attr;
				return elem.nodeName.toLowerCase() === "input" &&
					elem.type === "text" &&

					// Support: IE<8
					// New HTML5 attribute values (e.g., "search") appear with elem.type === "text"
					( (attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text" );
			},

			// Position-in-collection
			"first": createPositionalPseudo(function() {
				return [ 0 ];
			}),

			"last": createPositionalPseudo(function( matchIndexes, length ) {
				return [ length - 1 ];
			}),

			"eq": createPositionalPseudo(function( matchIndexes, length, argument ) {
				return [ argument < 0 ? argument + length : argument ];
			}),

			"even": createPositionalPseudo(function( matchIndexes, length ) {
				var i = 0;
				for ( ; i < length; i += 2 ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"odd": createPositionalPseudo(function( matchIndexes, length ) {
				var i = 1;
				for ( ; i < length; i += 2 ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"lt": createPositionalPseudo(function( matchIndexes, length, argument ) {
				var i = argument < 0 ? argument + length : argument;
				for ( ; --i >= 0; ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			}),

			"gt": createPositionalPseudo(function( matchIndexes, length, argument ) {
				var i = argument < 0 ? argument + length : argument;
				for ( ; ++i < length; ) {
					matchIndexes.push( i );
				}
				return matchIndexes;
			})
		}
	};

	Expr.pseudos["nth"] = Expr.pseudos["eq"];

	// Add button/input type pseudos
	for ( i in { radio: true, checkbox: true, file: true, password: true, image: true } ) {
		Expr.pseudos[ i ] = createInputPseudo( i );
	}
	for ( i in { submit: true, reset: true } ) {
		Expr.pseudos[ i ] = createButtonPseudo( i );
	}

	// Easy API for creating new setFilters
	function setFilters() {}
	setFilters.prototype = Expr.filters = Expr.pseudos;
	Expr.setFilters = new setFilters();

	tokenize = Sizzle.tokenize = function( selector, parseOnly ) {
		var matched, match, tokens, type,
			soFar, groups, preFilters,
			cached = tokenCache[ selector + " " ];

		if ( cached ) {
			return parseOnly ? 0 : cached.slice( 0 );
		}

		soFar = selector;
		groups = [];
		preFilters = Expr.preFilter;

		while ( soFar ) {

			// Comma and first run
			if ( !matched || (match = rcomma.exec( soFar )) ) {
				if ( match ) {
					// Don't consume trailing commas as valid
					soFar = soFar.slice( match[0].length ) || soFar;
				}
				groups.push( (tokens = []) );
			}

			matched = false;

			// Combinators
			if ( (match = rcombinators.exec( soFar )) ) {
				matched = match.shift();
				tokens.push({
					value: matched,
					// Cast descendant combinators to space
					type: match[0].replace( rtrim, " " )
				});
				soFar = soFar.slice( matched.length );
			}

			// Filters
			for ( type in Expr.filter ) {
				if ( (match = matchExpr[ type ].exec( soFar )) && (!preFilters[ type ] ||
					(match = preFilters[ type ]( match ))) ) {
					matched = match.shift();
					tokens.push({
						value: matched,
						type: type,
						matches: match
					});
					soFar = soFar.slice( matched.length );
				}
			}

			if ( !matched ) {
				break;
			}
		}

		// Return the length of the invalid excess
		// if we're just parsing
		// Otherwise, throw an error or return tokens
		return parseOnly ?
			soFar.length :
			soFar ?
				Sizzle.error( selector ) :
				// Cache the tokens
				tokenCache( selector, groups ).slice( 0 );
	};

	function toSelector( tokens ) {
		var i = 0,
			len = tokens.length,
			selector = "";
		for ( ; i < len; i++ ) {
			selector += tokens[i].value;
		}
		return selector;
	}

	function addCombinator( matcher, combinator, base ) {
		var dir = combinator.dir,
			checkNonElements = base && dir === "parentNode",
			doneName = done++;

		return combinator.first ?
			// Check against closest ancestor/preceding element
			function( elem, context, xml ) {
				while ( (elem = elem[ dir ]) ) {
					if ( elem.nodeType === 1 || checkNonElements ) {
						return matcher( elem, context, xml );
					}
				}
			} :

			// Check against all ancestor/preceding elements
			function( elem, context, xml ) {
				var oldCache, uniqueCache, outerCache,
					newCache = [ dirruns, doneName ];

				// We can't set arbitrary data on XML nodes, so they don't benefit from combinator caching
				if ( xml ) {
					while ( (elem = elem[ dir ]) ) {
						if ( elem.nodeType === 1 || checkNonElements ) {
							if ( matcher( elem, context, xml ) ) {
								return true;
							}
						}
					}
				} else {
					while ( (elem = elem[ dir ]) ) {
						if ( elem.nodeType === 1 || checkNonElements ) {
							outerCache = elem[ expando ] || (elem[ expando ] = {});

							// Support: IE <9 only
							// Defend against cloned attroperties (jQuery gh-1709)
							uniqueCache = outerCache[ elem.uniqueID ] || (outerCache[ elem.uniqueID ] = {});

							if ( (oldCache = uniqueCache[ dir ]) &&
								oldCache[ 0 ] === dirruns && oldCache[ 1 ] === doneName ) {

								// Assign to newCache so results back-propagate to previous elements
								return (newCache[ 2 ] = oldCache[ 2 ]);
							} else {
								// Reuse newcache so results back-propagate to previous elements
								uniqueCache[ dir ] = newCache;

								// A match means we're done; a fail means we have to keep checking
								if ( (newCache[ 2 ] = matcher( elem, context, xml )) ) {
									return true;
								}
							}
						}
					}
				}
			};
	}

	function elementMatcher( matchers ) {
		return matchers.length > 1 ?
			function( elem, context, xml ) {
				var i = matchers.length;
				while ( i-- ) {
					if ( !matchers[i]( elem, context, xml ) ) {
						return false;
					}
				}
				return true;
			} :
			matchers[0];
	}

	function multipleContexts( selector, contexts, results ) {
		var i = 0,
			len = contexts.length;
		for ( ; i < len; i++ ) {
			Sizzle( selector, contexts[i], results );
		}
		return results;
	}

	function condense( unmatched, map, filter, context, xml ) {
		var elem,
			newUnmatched = [],
			i = 0,
			len = unmatched.length,
			mapped = map != null;

		for ( ; i < len; i++ ) {
			if ( (elem = unmatched[i]) ) {
				if ( !filter || filter( elem, context, xml ) ) {
					newUnmatched.push( elem );
					if ( mapped ) {
						map.push( i );
					}
				}
			}
		}

		return newUnmatched;
	}

	function setMatcher( preFilter, selector, matcher, postFilter, postFinder, postSelector ) {
		if ( postFilter && !postFilter[ expando ] ) {
			postFilter = setMatcher( postFilter );
		}
		if ( postFinder && !postFinder[ expando ] ) {
			postFinder = setMatcher( postFinder, postSelector );
		}
		return markFunction(function( seed, results, context, xml ) {
			var temp, i, elem,
				preMap = [],
				postMap = [],
				preexisting = results.length,

				// Get initial elements from seed or context
				elems = seed || multipleContexts( selector || "*", context.nodeType ? [ context ] : context, [] ),

				// Prefilter to get matcher input, preserving a map for seed-results synchronization
				matcherIn = preFilter && ( seed || !selector ) ?
					condense( elems, preMap, preFilter, context, xml ) :
					elems,

				matcherOut = matcher ?
					// If we have a postFinder, or filtered seed, or non-seed postFilter or preexisting results,
					postFinder || ( seed ? preFilter : preexisting || postFilter ) ?

						// ...intermediate processing is necessary
						[] :

						// ...otherwise use results directly
						results :
					matcherIn;

			// Find primary matches
			if ( matcher ) {
				matcher( matcherIn, matcherOut, context, xml );
			}

			// Apply postFilter
			if ( postFilter ) {
				temp = condense( matcherOut, postMap );
				postFilter( temp, [], context, xml );

				// Un-match failing elements by moving them back to matcherIn
				i = temp.length;
				while ( i-- ) {
					if ( (elem = temp[i]) ) {
						matcherOut[ postMap[i] ] = !(matcherIn[ postMap[i] ] = elem);
					}
				}
			}

			if ( seed ) {
				if ( postFinder || preFilter ) {
					if ( postFinder ) {
						// Get the final matcherOut by condensing this intermediate into postFinder contexts
						temp = [];
						i = matcherOut.length;
						while ( i-- ) {
							if ( (elem = matcherOut[i]) ) {
								// Restore matcherIn since elem is not yet a final match
								temp.push( (matcherIn[i] = elem) );
							}
						}
						postFinder( null, (matcherOut = []), temp, xml );
					}

					// Move matched elements from seed to results to keep them synchronized
					i = matcherOut.length;
					while ( i-- ) {
						if ( (elem = matcherOut[i]) &&
							(temp = postFinder ? indexOf( seed, elem ) : preMap[i]) > -1 ) {

							seed[temp] = !(results[temp] = elem);
						}
					}
				}

			// Add elements to results, through postFinder if defined
			} else {
				matcherOut = condense(
					matcherOut === results ?
						matcherOut.splice( preexisting, matcherOut.length ) :
						matcherOut
				);
				if ( postFinder ) {
					postFinder( null, results, matcherOut, xml );
				} else {
					push.apply( results, matcherOut );
				}
			}
		});
	}

	function matcherFromTokens( tokens ) {
		var checkContext, matcher, j,
			len = tokens.length,
			leadingRelative = Expr.relative[ tokens[0].type ],
			implicitRelative = leadingRelative || Expr.relative[" "],
			i = leadingRelative ? 1 : 0,

			// The foundational matcher ensures that elements are reachable from top-level context(s)
			matchContext = addCombinator( function( elem ) {
				return elem === checkContext;
			}, implicitRelative, true ),
			matchAnyContext = addCombinator( function( elem ) {
				return indexOf( checkContext, elem ) > -1;
			}, implicitRelative, true ),
			matchers = [ function( elem, context, xml ) {
				var ret = ( !leadingRelative && ( xml || context !== outermostContext ) ) || (
					(checkContext = context).nodeType ?
						matchContext( elem, context, xml ) :
						matchAnyContext( elem, context, xml ) );
				// Avoid hanging onto element (issue #299)
				checkContext = null;
				return ret;
			} ];

		for ( ; i < len; i++ ) {
			if ( (matcher = Expr.relative[ tokens[i].type ]) ) {
				matchers = [ addCombinator(elementMatcher( matchers ), matcher) ];
			} else {
				matcher = Expr.filter[ tokens[i].type ].apply( null, tokens[i].matches );

				// Return special upon seeing a positional matcher
				if ( matcher[ expando ] ) {
					// Find the next relative operator (if any) for proper handling
					j = ++i;
					for ( ; j < len; j++ ) {
						if ( Expr.relative[ tokens[j].type ] ) {
							break;
						}
					}
					return setMatcher(
						i > 1 && elementMatcher( matchers ),
						i > 1 && toSelector(
							// If the preceding token was a descendant combinator, insert an implicit any-element `*`
							tokens.slice( 0, i - 1 ).concat({ value: tokens[ i - 2 ].type === " " ? "*" : "" })
						).replace( rtrim, "$1" ),
						matcher,
						i < j && matcherFromTokens( tokens.slice( i, j ) ),
						j < len && matcherFromTokens( (tokens = tokens.slice( j )) ),
						j < len && toSelector( tokens )
					);
				}
				matchers.push( matcher );
			}
		}

		return elementMatcher( matchers );
	}

	function matcherFromGroupMatchers( elementMatchers, setMatchers ) {
		var bySet = setMatchers.length > 0,
			byElement = elementMatchers.length > 0,
			superMatcher = function( seed, context, xml, results, outermost ) {
				var elem, j, matcher,
					matchedCount = 0,
					i = "0",
					unmatched = seed && [],
					setMatched = [],
					contextBackup = outermostContext,
					// We must always have either seed elements or outermost context
					elems = seed || byElement && Expr.find["TAG"]( "*", outermost ),
					// Use integer dirruns iff this is the outermost matcher
					dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
					len = elems.length;

				if ( outermost ) {
					outermostContext = context === document || context || outermost;
				}

				// Add elements passing elementMatchers directly to results
				// Support: IE<9, Safari
				// Tolerate NodeList properties (IE: "length"; Safari: <number>) matching elements by id
				for ( ; i !== len && (elem = elems[i]) != null; i++ ) {
					if ( byElement && elem ) {
						j = 0;
						if ( !context && elem.ownerDocument !== document ) {
							setDocument( elem );
							xml = !documentIsHTML;
						}
						while ( (matcher = elementMatchers[j++]) ) {
							if ( matcher( elem, context || document, xml) ) {
								results.push( elem );
								break;
							}
						}
						if ( outermost ) {
							dirruns = dirrunsUnique;
						}
					}

					// Track unmatched elements for set filters
					if ( bySet ) {
						// They will have gone through all possible matchers
						if ( (elem = !matcher && elem) ) {
							matchedCount--;
						}

						// Lengthen the array for every element, matched or not
						if ( seed ) {
							unmatched.push( elem );
						}
					}
				}

				// `i` is now the count of elements visited above, and adding it to `matchedCount`
				// makes the latter nonnegative.
				matchedCount += i;

				// Apply set filters to unmatched elements
				// NOTE: This can be skipped if there are no unmatched elements (i.e., `matchedCount`
				// equals `i`), unless we didn't visit _any_ elements in the above loop because we have
				// no element matchers and no seed.
				// Incrementing an initially-string "0" `i` allows `i` to remain a string only in that
				// case, which will result in a "00" `matchedCount` that differs from `i` but is also
				// numerically zero.
				if ( bySet && i !== matchedCount ) {
					j = 0;
					while ( (matcher = setMatchers[j++]) ) {
						matcher( unmatched, setMatched, context, xml );
					}

					if ( seed ) {
						// Reintegrate element matches to eliminate the need for sorting
						if ( matchedCount > 0 ) {
							while ( i-- ) {
								if ( !(unmatched[i] || setMatched[i]) ) {
									setMatched[i] = pop.call( results );
								}
							}
						}

						// Discard index placeholder values to get only actual matches
						setMatched = condense( setMatched );
					}

					// Add matches to results
					push.apply( results, setMatched );

					// Seedless set matches succeeding multiple successful matchers stipulate sorting
					if ( outermost && !seed && setMatched.length > 0 &&
						( matchedCount + setMatchers.length ) > 1 ) {

						Sizzle.uniqueSort( results );
					}
				}

				// Override manipulation of globals by nested matchers
				if ( outermost ) {
					dirruns = dirrunsUnique;
					outermostContext = contextBackup;
				}

				return unmatched;
			};

		return bySet ?
			markFunction( superMatcher ) :
			superMatcher;
	}

	compile = Sizzle.compile = function( selector, match /* Internal Use Only */ ) {
		var i,
			setMatchers = [],
			elementMatchers = [],
			cached = compilerCache[ selector + " " ];

		if ( !cached ) {
			// Generate a function of recursive functions that can be used to check each element
			if ( !match ) {
				match = tokenize( selector );
			}
			i = match.length;
			while ( i-- ) {
				cached = matcherFromTokens( match[i] );
				if ( cached[ expando ] ) {
					setMatchers.push( cached );
				} else {
					elementMatchers.push( cached );
				}
			}

			// Cache the compiled function
			cached = compilerCache( selector, matcherFromGroupMatchers( elementMatchers, setMatchers ) );

			// Save selector and tokenization
			cached.selector = selector;
		}
		return cached;
	};

	/**
	 * A low-level selection function that works with Sizzle's compiled
	 *  selector functions
	 * @param {String|Function} selector A selector or a pre-compiled
	 *  selector function built with Sizzle.compile
	 * @param {Element} context
	 * @param {Array} [results]
	 * @param {Array} [seed] A set of elements to match against
	 */
	select = Sizzle.select = function( selector, context, results, seed ) {
		var i, tokens, token, type, find,
			compiled = typeof selector === "function" && selector,
			match = !seed && tokenize( (selector = compiled.selector || selector) );

		results = results || [];

		// Try to minimize operations if there is only one selector in the list and no seed
		// (the latter of which guarantees us context)
		if ( match.length === 1 ) {

			// Reduce context if the leading compound selector is an ID
			tokens = match[0] = match[0].slice( 0 );
			if ( tokens.length > 2 && (token = tokens[0]).type === "ID" &&
					support.getById && context.nodeType === 9 && documentIsHTML &&
					Expr.relative[ tokens[1].type ] ) {

				context = ( Expr.find["ID"]( token.matches[0].replace(runescape, funescape), context ) || [] )[0];
				if ( !context ) {
					return results;

				// Precompiled matchers will still verify ancestry, so step up a level
				} else if ( compiled ) {
					context = context.parentNode;
				}

				selector = selector.slice( tokens.shift().value.length );
			}

			// Fetch a seed set for right-to-left matching
			i = matchExpr["needsContext"].test( selector ) ? 0 : tokens.length;
			while ( i-- ) {
				token = tokens[i];

				// Abort if we hit a combinator
				if ( Expr.relative[ (type = token.type) ] ) {
					break;
				}
				if ( (find = Expr.find[ type ]) ) {
					// Search, expanding context for leading sibling combinators
					if ( (seed = find(
						token.matches[0].replace( runescape, funescape ),
						rsibling.test( tokens[0].type ) && testContext( context.parentNode ) || context
					)) ) {

						// If seed is empty or no tokens remain, we can return early
						tokens.splice( i, 1 );
						selector = seed.length && toSelector( tokens );
						if ( !selector ) {
							push.apply( results, seed );
							return results;
						}

						break;
					}
				}
			}
		}

		// Compile and execute a filtering function if one is not provided
		// Provide `match` to avoid retokenization if we modified the selector above
		( compiled || compile( selector, match ) )(
			seed,
			context,
			!documentIsHTML,
			results,
			!context || rsibling.test( selector ) && testContext( context.parentNode ) || context
		);
		return results;
	};

	// One-time assignments

	// Sort stability
	support.sortStable = expando.split("").sort( sortOrder ).join("") === expando;

	// Support: Chrome 14-35+
	// Always assume duplicates if they aren't passed to the comparison function
	support.detectDuplicates = !!hasDuplicate;

	// Initialize against the default document
	setDocument();

	// Support: Webkit<537.32 - Safari 6.0.3/Chrome 25 (fixed in Chrome 27)
	// Detached nodes confoundingly follow *each other*
	support.sortDetached = assert(function( div1 ) {
		// Should return 1, but returns 4 (following)
		return div1.compareDocumentPosition( document.createElement("div") ) & 1;
	});

	// Support: IE<8
	// Prevent attribute/property "interpolation"
	// http://msdn.microsoft.com/en-us/library/ms536429%28VS.85%29.aspx
	if ( !assert(function( div ) {
		div.innerHTML = "<a href='#'></a>";
		return div.firstChild.getAttribute("href") === "#" ;
	}) ) {
		addHandle( "type|href|height|width", function( elem, name, isXML ) {
			if ( !isXML ) {
				return elem.getAttribute( name, name.toLowerCase() === "type" ? 1 : 2 );
			}
		});
	}

	// Support: IE<9
	// Use defaultValue in place of getAttribute("value")
	if ( !support.attributes || !assert(function( div ) {
		div.innerHTML = "<input/>";
		div.firstChild.setAttribute( "value", "" );
		return div.firstChild.getAttribute( "value" ) === "";
	}) ) {
		addHandle( "value", function( elem, name, isXML ) {
			if ( !isXML && elem.nodeName.toLowerCase() === "input" ) {
				return elem.defaultValue;
			}
		});
	}

	// Support: IE<9
	// Use getAttributeNode to fetch booleans when getAttribute lies
	if ( !assert(function( div ) {
		return div.getAttribute("disabled") == null;
	}) ) {
		addHandle( booleans, function( elem, name, isXML ) {
			var val;
			if ( !isXML ) {
				return elem[ name ] === true ? name.toLowerCase() :
						(val = elem.getAttributeNode( name )) && val.specified ?
						val.value :
					null;
			}
		});
	}

	return Sizzle;

	})( window );



	jQuery.find = Sizzle;
	jQuery.expr = Sizzle.selectors;
	jQuery.expr[ ":" ] = jQuery.expr.pseudos;
	jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
	jQuery.text = Sizzle.getText;
	jQuery.isXMLDoc = Sizzle.isXML;
	jQuery.contains = Sizzle.contains;



	var dir = function( elem, dir, until ) {
		var matched = [],
			truncate = until !== undefined;

		while ( ( elem = elem[ dir ] ) && elem.nodeType !== 9 ) {
			if ( elem.nodeType === 1 ) {
				if ( truncate && jQuery( elem ).is( until ) ) {
					break;
				}
				matched.push( elem );
			}
		}
		return matched;
	};


	var siblings = function( n, elem ) {
		var matched = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				matched.push( n );
			}
		}

		return matched;
	};


	var rneedsContext = jQuery.expr.match.needsContext;

	var rsingleTag = ( /^<([\w-]+)\s*\/?>(?:<\/\1>|)$/ );



	var risSimple = /^.[^:#\[\.,]*$/;

	// Implement the identical functionality for filter and not
	function winnow( elements, qualifier, not ) {
		if ( jQuery.isFunction( qualifier ) ) {
			return jQuery.grep( elements, function( elem, i ) {
				/* jshint -W018 */
				return !!qualifier.call( elem, i, elem ) !== not;
			} );

		}

		if ( qualifier.nodeType ) {
			return jQuery.grep( elements, function( elem ) {
				return ( elem === qualifier ) !== not;
			} );

		}

		if ( typeof qualifier === "string" ) {
			if ( risSimple.test( qualifier ) ) {
				return jQuery.filter( qualifier, elements, not );
			}

			qualifier = jQuery.filter( qualifier, elements );
		}

		return jQuery.grep( elements, function( elem ) {
			return ( indexOf.call( qualifier, elem ) > -1 ) !== not;
		} );
	}

	jQuery.filter = function( expr, elems, not ) {
		var elem = elems[ 0 ];

		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 && elem.nodeType === 1 ?
			jQuery.find.matchesSelector( elem, expr ) ? [ elem ] : [] :
			jQuery.find.matches( expr, jQuery.grep( elems, function( elem ) {
				return elem.nodeType === 1;
			} ) );
	};

	jQuery.fn.extend( {
		find: function( selector ) {
			var i,
				len = this.length,
				ret = [],
				self = this;

			if ( typeof selector !== "string" ) {
				return this.pushStack( jQuery( selector ).filter( function() {
					for ( i = 0; i < len; i++ ) {
						if ( jQuery.contains( self[ i ], this ) ) {
							return true;
						}
					}
				} ) );
			}

			for ( i = 0; i < len; i++ ) {
				jQuery.find( selector, self[ i ], ret );
			}

			// Needed because $( selector, context ) becomes $( context ).find( selector )
			ret = this.pushStack( len > 1 ? jQuery.unique( ret ) : ret );
			ret.selector = this.selector ? this.selector + " " + selector : selector;
			return ret;
		},
		filter: function( selector ) {
			return this.pushStack( winnow( this, selector || [], false ) );
		},
		not: function( selector ) {
			return this.pushStack( winnow( this, selector || [], true ) );
		},
		is: function( selector ) {
			return !!winnow(
				this,

				// If this is a positional/relative selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				typeof selector === "string" && rneedsContext.test( selector ) ?
					jQuery( selector ) :
					selector || [],
				false
			).length;
		}
	} );


	// Initialize a jQuery object


	// A central reference to the root jQuery(document)
	var rootjQuery,

		// A simple way to check for HTML strings
		// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
		// Strict HTML recognition (#11290: must start with <)
		rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,

		init = jQuery.fn.init = function( selector, context, root ) {
			var match, elem;

			// HANDLE: $(""), $(null), $(undefined), $(false)
			if ( !selector ) {
				return this;
			}

			// Method init() accepts an alternate rootjQuery
			// so migrate can support jQuery.sub (gh-2101)
			root = root || rootjQuery;

			// Handle HTML strings
			if ( typeof selector === "string" ) {
				if ( selector[ 0 ] === "<" &&
					selector[ selector.length - 1 ] === ">" &&
					selector.length >= 3 ) {

					// Assume that strings that start and end with <> are HTML and skip the regex check
					match = [ null, selector, null ];

				} else {
					match = rquickExpr.exec( selector );
				}

				// Match html or make sure no context is specified for #id
				if ( match && ( match[ 1 ] || !context ) ) {

					// HANDLE: $(html) -> $(array)
					if ( match[ 1 ] ) {
						context = context instanceof jQuery ? context[ 0 ] : context;

						// Option to run scripts is true for back-compat
						// Intentionally let the error be thrown if parseHTML is not present
						jQuery.merge( this, jQuery.parseHTML(
							match[ 1 ],
							context && context.nodeType ? context.ownerDocument || context : document,
							true
						) );

						// HANDLE: $(html, props)
						if ( rsingleTag.test( match[ 1 ] ) && jQuery.isPlainObject( context ) ) {
							for ( match in context ) {

								// Properties of context are called as methods if possible
								if ( jQuery.isFunction( this[ match ] ) ) {
									this[ match ]( context[ match ] );

								// ...and otherwise set as attributes
								} else {
									this.attr( match, context[ match ] );
								}
							}
						}

						return this;

					// HANDLE: $(#id)
					} else {
						elem = document.getElementById( match[ 2 ] );

						// Support: Blackberry 4.6
						// gEBID returns nodes no longer in the document (#6963)
						if ( elem && elem.parentNode ) {

							// Inject the element directly into the jQuery object
							this.length = 1;
							this[ 0 ] = elem;
						}

						this.context = document;
						this.selector = selector;
						return this;
					}

				// HANDLE: $(expr, $(...))
				} else if ( !context || context.jquery ) {
					return ( context || root ).find( selector );

				// HANDLE: $(expr, context)
				// (which is just equivalent to: $(context).find(expr)
				} else {
					return this.constructor( context ).find( selector );
				}

			// HANDLE: $(DOMElement)
			} else if ( selector.nodeType ) {
				this.context = this[ 0 ] = selector;
				this.length = 1;
				return this;

			// HANDLE: $(function)
			// Shortcut for document ready
			} else if ( jQuery.isFunction( selector ) ) {
				return root.ready !== undefined ?
					root.ready( selector ) :

					// Execute immediately if ready is not present
					selector( jQuery );
			}

			if ( selector.selector !== undefined ) {
				this.selector = selector.selector;
				this.context = selector.context;
			}

			return jQuery.makeArray( selector, this );
		};

	// Give the init function the jQuery prototype for later instantiation
	init.prototype = jQuery.fn;

	// Initialize central reference
	rootjQuery = jQuery( document );


	var rparentsprev = /^(?:parents|prev(?:Until|All))/,

		// Methods guaranteed to produce a unique set when starting from a unique set
		guaranteedUnique = {
			children: true,
			contents: true,
			next: true,
			prev: true
		};

	jQuery.fn.extend( {
		has: function( target ) {
			var targets = jQuery( target, this ),
				l = targets.length;

			return this.filter( function() {
				var i = 0;
				for ( ; i < l; i++ ) {
					if ( jQuery.contains( this, targets[ i ] ) ) {
						return true;
					}
				}
			} );
		},

		closest: function( selectors, context ) {
			var cur,
				i = 0,
				l = this.length,
				matched = [],
				pos = rneedsContext.test( selectors ) || typeof selectors !== "string" ?
					jQuery( selectors, context || this.context ) :
					0;

			for ( ; i < l; i++ ) {
				for ( cur = this[ i ]; cur && cur !== context; cur = cur.parentNode ) {

					// Always skip document fragments
					if ( cur.nodeType < 11 && ( pos ?
						pos.index( cur ) > -1 :

						// Don't pass non-elements to Sizzle
						cur.nodeType === 1 &&
							jQuery.find.matchesSelector( cur, selectors ) ) ) {

						matched.push( cur );
						break;
					}
				}
			}

			return this.pushStack( matched.length > 1 ? jQuery.uniqueSort( matched ) : matched );
		},

		// Determine the position of an element within the set
		index: function( elem ) {

			// No argument, return index in parent
			if ( !elem ) {
				return ( this[ 0 ] && this[ 0 ].parentNode ) ? this.first().prevAll().length : -1;
			}

			// Index in selector
			if ( typeof elem === "string" ) {
				return indexOf.call( jQuery( elem ), this[ 0 ] );
			}

			// Locate the position of the desired element
			return indexOf.call( this,

				// If it receives a jQuery object, the first element is used
				elem.jquery ? elem[ 0 ] : elem
			);
		},

		add: function( selector, context ) {
			return this.pushStack(
				jQuery.uniqueSort(
					jQuery.merge( this.get(), jQuery( selector, context ) )
				)
			);
		},

		addBack: function( selector ) {
			return this.add( selector == null ?
				this.prevObject : this.prevObject.filter( selector )
			);
		}
	} );

	function sibling( cur, dir ) {
		while ( ( cur = cur[ dir ] ) && cur.nodeType !== 1 ) {}
		return cur;
	}

	jQuery.each( {
		parent: function( elem ) {
			var parent = elem.parentNode;
			return parent && parent.nodeType !== 11 ? parent : null;
		},
		parents: function( elem ) {
			return dir( elem, "parentNode" );
		},
		parentsUntil: function( elem, i, until ) {
			return dir( elem, "parentNode", until );
		},
		next: function( elem ) {
			return sibling( elem, "nextSibling" );
		},
		prev: function( elem ) {
			return sibling( elem, "previousSibling" );
		},
		nextAll: function( elem ) {
			return dir( elem, "nextSibling" );
		},
		prevAll: function( elem ) {
			return dir( elem, "previousSibling" );
		},
		nextUntil: function( elem, i, until ) {
			return dir( elem, "nextSibling", until );
		},
		prevUntil: function( elem, i, until ) {
			return dir( elem, "previousSibling", until );
		},
		siblings: function( elem ) {
			return siblings( ( elem.parentNode || {} ).firstChild, elem );
		},
		children: function( elem ) {
			return siblings( elem.firstChild );
		},
		contents: function( elem ) {
			return elem.contentDocument || jQuery.merge( [], elem.childNodes );
		}
	}, function( name, fn ) {
		jQuery.fn[ name ] = function( until, selector ) {
			var matched = jQuery.map( this, fn, until );

			if ( name.slice( -5 ) !== "Until" ) {
				selector = until;
			}

			if ( selector && typeof selector === "string" ) {
				matched = jQuery.filter( selector, matched );
			}

			if ( this.length > 1 ) {

				// Remove duplicates
				if ( !guaranteedUnique[ name ] ) {
					jQuery.uniqueSort( matched );
				}

				// Reverse order for parents* and prev-derivatives
				if ( rparentsprev.test( name ) ) {
					matched.reverse();
				}
			}

			return this.pushStack( matched );
		};
	} );
	var rnotwhite = ( /\S+/g );



	// Convert String-formatted options into Object-formatted ones
	function createOptions( options ) {
		var object = {};
		jQuery.each( options.match( rnotwhite ) || [], function( _, flag ) {
			object[ flag ] = true;
		} );
		return object;
	}

	/*
	 * Create a callback list using the following parameters:
	 *
	 *	options: an optional list of space-separated options that will change how
	 *			the callback list behaves or a more traditional option object
	 *
	 * By default a callback list will act like an event callback list and can be
	 * "fired" multiple times.
	 *
	 * Possible options:
	 *
	 *	once:			will ensure the callback list can only be fired once (like a Deferred)
	 *
	 *	memory:			will keep track of previous values and will call any callback added
	 *					after the list has been fired right away with the latest "memorized"
	 *					values (like a Deferred)
	 *
	 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
	 *
	 *	stopOnFalse:	interrupt callings when a callback returns false
	 *
	 */
	jQuery.Callbacks = function( options ) {

		// Convert options from String-formatted to Object-formatted if needed
		// (we check in cache first)
		options = typeof options === "string" ?
			createOptions( options ) :
			jQuery.extend( {}, options );

		var // Flag to know if list is currently firing
			firing,

			// Last fire value for non-forgettable lists
			memory,

			// Flag to know if list was already fired
			fired,

			// Flag to prevent firing
			locked,

			// Actual callback list
			list = [],

			// Queue of execution data for repeatable lists
			queue = [],

			// Index of currently firing callback (modified by add/remove as needed)
			firingIndex = -1,

			// Fire callbacks
			fire = function() {

				// Enforce single-firing
				locked = options.once;

				// Execute callbacks for all pending executions,
				// respecting firingIndex overrides and runtime changes
				fired = firing = true;
				for ( ; queue.length; firingIndex = -1 ) {
					memory = queue.shift();
					while ( ++firingIndex < list.length ) {

						// Run callback and check for early termination
						if ( list[ firingIndex ].apply( memory[ 0 ], memory[ 1 ] ) === false &&
							options.stopOnFalse ) {

							// Jump to end and forget the data so .add doesn't re-fire
							firingIndex = list.length;
							memory = false;
						}
					}
				}

				// Forget the data if we're done with it
				if ( !options.memory ) {
					memory = false;
				}

				firing = false;

				// Clean up if we're done firing for good
				if ( locked ) {

					// Keep an empty list if we have data for future add calls
					if ( memory ) {
						list = [];

					// Otherwise, this object is spent
					} else {
						list = "";
					}
				}
			},

			// Actual Callbacks object
			self = {

				// Add a callback or a collection of callbacks to the list
				add: function() {
					if ( list ) {

						// If we have memory from a past run, we should fire after adding
						if ( memory && !firing ) {
							firingIndex = list.length - 1;
							queue.push( memory );
						}

						( function add( args ) {
							jQuery.each( args, function( _, arg ) {
								if ( jQuery.isFunction( arg ) ) {
									if ( !options.unique || !self.has( arg ) ) {
										list.push( arg );
									}
								} else if ( arg && arg.length && jQuery.type( arg ) !== "string" ) {

									// Inspect recursively
									add( arg );
								}
							} );
						} )( arguments );

						if ( memory && !firing ) {
							fire();
						}
					}
					return this;
				},

				// Remove a callback from the list
				remove: function() {
					jQuery.each( arguments, function( _, arg ) {
						var index;
						while ( ( index = jQuery.inArray( arg, list, index ) ) > -1 ) {
							list.splice( index, 1 );

							// Handle firing indexes
							if ( index <= firingIndex ) {
								firingIndex--;
							}
						}
					} );
					return this;
				},

				// Check if a given callback is in the list.
				// If no argument is given, return whether or not list has callbacks attached.
				has: function( fn ) {
					return fn ?
						jQuery.inArray( fn, list ) > -1 :
						list.length > 0;
				},

				// Remove all callbacks from the list
				empty: function() {
					if ( list ) {
						list = [];
					}
					return this;
				},

				// Disable .fire and .add
				// Abort any current/pending executions
				// Clear all callbacks and values
				disable: function() {
					locked = queue = [];
					list = memory = "";
					return this;
				},
				disabled: function() {
					return !list;
				},

				// Disable .fire
				// Also disable .add unless we have memory (since it would have no effect)
				// Abort any pending executions
				lock: function() {
					locked = queue = [];
					if ( !memory ) {
						list = memory = "";
					}
					return this;
				},
				locked: function() {
					return !!locked;
				},

				// Call all callbacks with the given context and arguments
				fireWith: function( context, args ) {
					if ( !locked ) {
						args = args || [];
						args = [ context, args.slice ? args.slice() : args ];
						queue.push( args );
						if ( !firing ) {
							fire();
						}
					}
					return this;
				},

				// Call all the callbacks with the given arguments
				fire: function() {
					self.fireWith( this, arguments );
					return this;
				},

				// To know if the callbacks have already been called at least once
				fired: function() {
					return !!fired;
				}
			};

		return self;
	};


	jQuery.extend( {

		Deferred: function( func ) {
			var tuples = [

					// action, add listener, listener list, final state
					[ "resolve", "done", jQuery.Callbacks( "once memory" ), "resolved" ],
					[ "reject", "fail", jQuery.Callbacks( "once memory" ), "rejected" ],
					[ "notify", "progress", jQuery.Callbacks( "memory" ) ]
				],
				state = "pending",
				promise = {
					state: function() {
						return state;
					},
					always: function() {
						deferred.done( arguments ).fail( arguments );
						return this;
					},
					then: function( /* fnDone, fnFail, fnProgress */ ) {
						var fns = arguments;
						return jQuery.Deferred( function( newDefer ) {
							jQuery.each( tuples, function( i, tuple ) {
								var fn = jQuery.isFunction( fns[ i ] ) && fns[ i ];

								// deferred[ done | fail | progress ] for forwarding actions to newDefer
								deferred[ tuple[ 1 ] ]( function() {
									var returned = fn && fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise()
											.progress( newDefer.notify )
											.done( newDefer.resolve )
											.fail( newDefer.reject );
									} else {
										newDefer[ tuple[ 0 ] + "With" ](
											this === promise ? newDefer.promise() : this,
											fn ? [ returned ] : arguments
										);
									}
								} );
							} );
							fns = null;
						} ).promise();
					},

					// Get a promise for this deferred
					// If obj is provided, the promise aspect is added to the object
					promise: function( obj ) {
						return obj != null ? jQuery.extend( obj, promise ) : promise;
					}
				},
				deferred = {};

			// Keep pipe for back-compat
			promise.pipe = promise.then;

			// Add list-specific methods
			jQuery.each( tuples, function( i, tuple ) {
				var list = tuple[ 2 ],
					stateString = tuple[ 3 ];

				// promise[ done | fail | progress ] = list.add
				promise[ tuple[ 1 ] ] = list.add;

				// Handle state
				if ( stateString ) {
					list.add( function() {

						// state = [ resolved | rejected ]
						state = stateString;

					// [ reject_list | resolve_list ].disable; progress_list.lock
					}, tuples[ i ^ 1 ][ 2 ].disable, tuples[ 2 ][ 2 ].lock );
				}

				// deferred[ resolve | reject | notify ]
				deferred[ tuple[ 0 ] ] = function() {
					deferred[ tuple[ 0 ] + "With" ]( this === deferred ? promise : this, arguments );
					return this;
				};
				deferred[ tuple[ 0 ] + "With" ] = list.fireWith;
			} );

			// Make the deferred a promise
			promise.promise( deferred );

			// Call given func if any
			if ( func ) {
				func.call( deferred, deferred );
			}

			// All done!
			return deferred;
		},

		// Deferred helper
		when: function( subordinate /* , ..., subordinateN */ ) {
			var i = 0,
				resolveValues = slice.call( arguments ),
				length = resolveValues.length,

				// the count of uncompleted subordinates
				remaining = length !== 1 ||
					( subordinate && jQuery.isFunction( subordinate.promise ) ) ? length : 0,

				// the master Deferred.
				// If resolveValues consist of only a single Deferred, just use that.
				deferred = remaining === 1 ? subordinate : jQuery.Deferred(),

				// Update function for both resolve and progress values
				updateFunc = function( i, contexts, values ) {
					return function( value ) {
						contexts[ i ] = this;
						values[ i ] = arguments.length > 1 ? slice.call( arguments ) : value;
						if ( values === progressValues ) {
							deferred.notifyWith( contexts, values );
						} else if ( !( --remaining ) ) {
							deferred.resolveWith( contexts, values );
						}
					};
				},

				progressValues, progressContexts, resolveContexts;

			// Add listeners to Deferred subordinates; treat others as resolved
			if ( length > 1 ) {
				progressValues = new Array( length );
				progressContexts = new Array( length );
				resolveContexts = new Array( length );
				for ( ; i < length; i++ ) {
					if ( resolveValues[ i ] && jQuery.isFunction( resolveValues[ i ].promise ) ) {
						resolveValues[ i ].promise()
							.progress( updateFunc( i, progressContexts, progressValues ) )
							.done( updateFunc( i, resolveContexts, resolveValues ) )
							.fail( deferred.reject );
					} else {
						--remaining;
					}
				}
			}

			// If we're not waiting on anything, resolve the master
			if ( !remaining ) {
				deferred.resolveWith( resolveContexts, resolveValues );
			}

			return deferred.promise();
		}
	} );


	// The deferred used on DOM ready
	var readyList;

	jQuery.fn.ready = function( fn ) {

		// Add the callback
		jQuery.ready.promise().done( fn );

		return this;
	};

	jQuery.extend( {

		// Is the DOM ready to be used? Set to true once it occurs.
		isReady: false,

		// A counter to track how many items to wait for before
		// the ready event fires. See #6781
		readyWait: 1,

		// Hold (or release) the ready event
		holdReady: function( hold ) {
			if ( hold ) {
				jQuery.readyWait++;
			} else {
				jQuery.ready( true );
			}
		},

		// Handle when the DOM is ready
		ready: function( wait ) {

			// Abort if there are pending holds or we're already ready
			if ( wait === true ? --jQuery.readyWait : jQuery.isReady ) {
				return;
			}

			// Remember that the DOM is ready
			jQuery.isReady = true;

			// If a normal DOM Ready event fired, decrement, and wait if need be
			if ( wait !== true && --jQuery.readyWait > 0 ) {
				return;
			}

			// If there are functions bound, to execute
			readyList.resolveWith( document, [ jQuery ] );

			// Trigger any bound ready events
			if ( jQuery.fn.triggerHandler ) {
				jQuery( document ).triggerHandler( "ready" );
				jQuery( document ).off( "ready" );
			}
		}
	} );

	/**
	 * The ready event handler and self cleanup method
	 */
	function completed() {
		document.removeEventListener( "DOMContentLoaded", completed );
		window.removeEventListener( "load", completed );
		jQuery.ready();
	}

	jQuery.ready.promise = function( obj ) {
		if ( !readyList ) {

			readyList = jQuery.Deferred();

			// Catch cases where $(document).ready() is called
			// after the browser event has already occurred.
			// Support: IE9-10 only
			// Older IE sometimes signals "interactive" too soon
			if ( document.readyState === "complete" ||
				( document.readyState !== "loading" && !document.documentElement.doScroll ) ) {

				// Handle it asynchronously to allow scripts the opportunity to delay ready
				window.setTimeout( jQuery.ready );

			} else {

				// Use the handy event callback
				document.addEventListener( "DOMContentLoaded", completed );

				// A fallback to window.onload, that will always work
				window.addEventListener( "load", completed );
			}
		}
		return readyList.promise( obj );
	};

	// Kick off the DOM ready check even if the user does not
	jQuery.ready.promise();




	// Multifunctional method to get and set values of a collection
	// The value/s can optionally be executed if it's a function
	var access = function( elems, fn, key, value, chainable, emptyGet, raw ) {
		var i = 0,
			len = elems.length,
			bulk = key == null;

		// Sets many values
		if ( jQuery.type( key ) === "object" ) {
			chainable = true;
			for ( i in key ) {
				access( elems, fn, i, key[ i ], true, emptyGet, raw );
			}

		// Sets one value
		} else if ( value !== undefined ) {
			chainable = true;

			if ( !jQuery.isFunction( value ) ) {
				raw = true;
			}

			if ( bulk ) {

				// Bulk operations run against the entire set
				if ( raw ) {
					fn.call( elems, value );
					fn = null;

				// ...except when executing function values
				} else {
					bulk = fn;
					fn = function( elem, key, value ) {
						return bulk.call( jQuery( elem ), value );
					};
				}
			}

			if ( fn ) {
				for ( ; i < len; i++ ) {
					fn(
						elems[ i ], key, raw ?
						value :
						value.call( elems[ i ], i, fn( elems[ i ], key ) )
					);
				}
			}
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				len ? fn( elems[ 0 ], key ) : emptyGet;
	};
	var acceptData = function( owner ) {

		// Accepts only:
		//  - Node
		//    - Node.ELEMENT_NODE
		//    - Node.DOCUMENT_NODE
		//  - Object
		//    - Any
		/* jshint -W018 */
		return owner.nodeType === 1 || owner.nodeType === 9 || !( +owner.nodeType );
	};




	function Data() {
		this.expando = jQuery.expando + Data.uid++;
	}

	Data.uid = 1;

	Data.prototype = {

		register: function( owner, initial ) {
			var value = initial || {};

			// If it is a node unlikely to be stringify-ed or looped over
			// use plain assignment
			if ( owner.nodeType ) {
				owner[ this.expando ] = value;

			// Otherwise secure it in a non-enumerable, non-writable property
			// configurability must be true to allow the property to be
			// deleted with the delete operator
			} else {
				Object.defineProperty( owner, this.expando, {
					value: value,
					writable: true,
					configurable: true
				} );
			}
			return owner[ this.expando ];
		},
		cache: function( owner ) {

			// We can accept data for non-element nodes in modern browsers,
			// but we should not, see #8335.
			// Always return an empty object.
			if ( !acceptData( owner ) ) {
				return {};
			}

			// Check if the owner object already has a cache
			var value = owner[ this.expando ];

			// If not, create one
			if ( !value ) {
				value = {};

				// We can accept data for non-element nodes in modern browsers,
				// but we should not, see #8335.
				// Always return an empty object.
				if ( acceptData( owner ) ) {

					// If it is a node unlikely to be stringify-ed or looped over
					// use plain assignment
					if ( owner.nodeType ) {
						owner[ this.expando ] = value;

					// Otherwise secure it in a non-enumerable property
					// configurable must be true to allow the property to be
					// deleted when data is removed
					} else {
						Object.defineProperty( owner, this.expando, {
							value: value,
							configurable: true
						} );
					}
				}
			}

			return value;
		},
		set: function( owner, data, value ) {
			var prop,
				cache = this.cache( owner );

			// Handle: [ owner, key, value ] args
			if ( typeof data === "string" ) {
				cache[ data ] = value;

			// Handle: [ owner, { properties } ] args
			} else {

				// Copy the properties one-by-one to the cache object
				for ( prop in data ) {
					cache[ prop ] = data[ prop ];
				}
			}
			return cache;
		},
		get: function( owner, key ) {
			return key === undefined ?
				this.cache( owner ) :
				owner[ this.expando ] && owner[ this.expando ][ key ];
		},
		access: function( owner, key, value ) {
			var stored;

			// In cases where either:
			//
			//   1. No key was specified
			//   2. A string key was specified, but no value provided
			//
			// Take the "read" path and allow the get method to determine
			// which value to return, respectively either:
			//
			//   1. The entire cache object
			//   2. The data stored at the key
			//
			if ( key === undefined ||
					( ( key && typeof key === "string" ) && value === undefined ) ) {

				stored = this.get( owner, key );

				return stored !== undefined ?
					stored : this.get( owner, jQuery.camelCase( key ) );
			}

			// When the key is not a string, or both a key and value
			// are specified, set or extend (existing objects) with either:
			//
			//   1. An object of properties
			//   2. A key and value
			//
			this.set( owner, key, value );

			// Since the "set" path can have two possible entry points
			// return the expected data based on which path was taken[*]
			return value !== undefined ? value : key;
		},
		remove: function( owner, key ) {
			var i, name, camel,
				cache = owner[ this.expando ];

			if ( cache === undefined ) {
				return;
			}

			if ( key === undefined ) {
				this.register( owner );

			} else {

				// Support array or space separated string of keys
				if ( jQuery.isArray( key ) ) {

					// If "name" is an array of keys...
					// When data is initially created, via ("key", "val") signature,
					// keys will be converted to camelCase.
					// Since there is no way to tell _how_ a key was added, remove
					// both plain key and camelCase key. #12786
					// This will only penalize the array argument path.
					name = key.concat( key.map( jQuery.camelCase ) );
				} else {
					camel = jQuery.camelCase( key );

					// Try the string as a key before any manipulation
					if ( key in cache ) {
						name = [ key, camel ];
					} else {

						// If a key with the spaces exists, use it.
						// Otherwise, create an array by matching non-whitespace
						name = camel;
						name = name in cache ?
							[ name ] : ( name.match( rnotwhite ) || [] );
					}
				}

				i = name.length;

				while ( i-- ) {
					delete cache[ name[ i ] ];
				}
			}

			// Remove the expando if there's no more data
			if ( key === undefined || jQuery.isEmptyObject( cache ) ) {

				// Support: Chrome <= 35-45+
				// Webkit & Blink performance suffers when deleting properties
				// from DOM nodes, so set to undefined instead
				// https://code.google.com/p/chromium/issues/detail?id=378607
				if ( owner.nodeType ) {
					owner[ this.expando ] = undefined;
				} else {
					delete owner[ this.expando ];
				}
			}
		},
		hasData: function( owner ) {
			var cache = owner[ this.expando ];
			return cache !== undefined && !jQuery.isEmptyObject( cache );
		}
	};
	var dataPriv = new Data();

	var dataUser = new Data();



	//	Implementation Summary
	//
	//	1. Enforce API surface and semantic compatibility with 1.9.x branch
	//	2. Improve the module's maintainability by reducing the storage
	//		paths to a single mechanism.
	//	3. Use the same single mechanism to support "private" and "user" data.
	//	4. _Never_ expose "private" data to user code (TODO: Drop _data, _removeData)
	//	5. Avoid exposing implementation details on user objects (eg. expando properties)
	//	6. Provide a clear path for implementation upgrade to WeakMap in 2014

	var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
		rmultiDash = /[A-Z]/g;

	function dataAttr( elem, key, data ) {
		var name;

		// If nothing was found internally, try to fetch any
		// data from the HTML5 data-* attribute
		if ( data === undefined && elem.nodeType === 1 ) {
			name = "data-" + key.replace( rmultiDash, "-$&" ).toLowerCase();
			data = elem.getAttribute( name );

			if ( typeof data === "string" ) {
				try {
					data = data === "true" ? true :
						data === "false" ? false :
						data === "null" ? null :

						// Only convert to a number if it doesn't change the string
						+data + "" === data ? +data :
						rbrace.test( data ) ? jQuery.parseJSON( data ) :
						data;
				} catch ( e ) {}

				// Make sure we set the data so it isn't changed later
				dataUser.set( elem, key, data );
			} else {
				data = undefined;
			}
		}
		return data;
	}

	jQuery.extend( {
		hasData: function( elem ) {
			return dataUser.hasData( elem ) || dataPriv.hasData( elem );
		},

		data: function( elem, name, data ) {
			return dataUser.access( elem, name, data );
		},

		removeData: function( elem, name ) {
			dataUser.remove( elem, name );
		},

		// TODO: Now that all calls to _data and _removeData have been replaced
		// with direct calls to dataPriv methods, these can be deprecated.
		_data: function( elem, name, data ) {
			return dataPriv.access( elem, name, data );
		},

		_removeData: function( elem, name ) {
			dataPriv.remove( elem, name );
		}
	} );

	jQuery.fn.extend( {
		data: function( key, value ) {
			var i, name, data,
				elem = this[ 0 ],
				attrs = elem && elem.attributes;

			// Gets all values
			if ( key === undefined ) {
				if ( this.length ) {
					data = dataUser.get( elem );

					if ( elem.nodeType === 1 && !dataPriv.get( elem, "hasDataAttrs" ) ) {
						i = attrs.length;
						while ( i-- ) {

							// Support: IE11+
							// The attrs elements can be null (#14894)
							if ( attrs[ i ] ) {
								name = attrs[ i ].name;
								if ( name.indexOf( "data-" ) === 0 ) {
									name = jQuery.camelCase( name.slice( 5 ) );
									dataAttr( elem, name, data[ name ] );
								}
							}
						}
						dataPriv.set( elem, "hasDataAttrs", true );
					}
				}

				return data;
			}

			// Sets multiple values
			if ( typeof key === "object" ) {
				return this.each( function() {
					dataUser.set( this, key );
				} );
			}

			return access( this, function( value ) {
				var data, camelKey;

				// The calling jQuery object (element matches) is not empty
				// (and therefore has an element appears at this[ 0 ]) and the
				// `value` parameter was not undefined. An empty jQuery object
				// will result in `undefined` for elem = this[ 0 ] which will
				// throw an exception if an attempt to read a data cache is made.
				if ( elem && value === undefined ) {

					// Attempt to get data from the cache
					// with the key as-is
					data = dataUser.get( elem, key ) ||

						// Try to find dashed key if it exists (gh-2779)
						// This is for 2.2.x only
						dataUser.get( elem, key.replace( rmultiDash, "-$&" ).toLowerCase() );

					if ( data !== undefined ) {
						return data;
					}

					camelKey = jQuery.camelCase( key );

					// Attempt to get data from the cache
					// with the key camelized
					data = dataUser.get( elem, camelKey );
					if ( data !== undefined ) {
						return data;
					}

					// Attempt to "discover" the data in
					// HTML5 custom data-* attrs
					data = dataAttr( elem, camelKey, undefined );
					if ( data !== undefined ) {
						return data;
					}

					// We tried really hard, but the data doesn't exist.
					return;
				}

				// Set the data...
				camelKey = jQuery.camelCase( key );
				this.each( function() {

					// First, attempt to store a copy or reference of any
					// data that might've been store with a camelCased key.
					var data = dataUser.get( this, camelKey );

					// For HTML5 data-* attribute interop, we have to
					// store property names with dashes in a camelCase form.
					// This might not apply to all properties...*
					dataUser.set( this, camelKey, value );

					// *... In the case of properties that might _actually_
					// have dashes, we need to also store a copy of that
					// unchanged property.
					if ( key.indexOf( "-" ) > -1 && data !== undefined ) {
						dataUser.set( this, key, value );
					}
				} );
			}, null, value, arguments.length > 1, null, true );
		},

		removeData: function( key ) {
			return this.each( function() {
				dataUser.remove( this, key );
			} );
		}
	} );


	jQuery.extend( {
		queue: function( elem, type, data ) {
			var queue;

			if ( elem ) {
				type = ( type || "fx" ) + "queue";
				queue = dataPriv.get( elem, type );

				// Speed up dequeue by getting out quickly if this is just a lookup
				if ( data ) {
					if ( !queue || jQuery.isArray( data ) ) {
						queue = dataPriv.access( elem, type, jQuery.makeArray( data ) );
					} else {
						queue.push( data );
					}
				}
				return queue || [];
			}
		},

		dequeue: function( elem, type ) {
			type = type || "fx";

			var queue = jQuery.queue( elem, type ),
				startLength = queue.length,
				fn = queue.shift(),
				hooks = jQuery._queueHooks( elem, type ),
				next = function() {
					jQuery.dequeue( elem, type );
				};

			// If the fx queue is dequeued, always remove the progress sentinel
			if ( fn === "inprogress" ) {
				fn = queue.shift();
				startLength--;
			}

			if ( fn ) {

				// Add a progress sentinel to prevent the fx queue from being
				// automatically dequeued
				if ( type === "fx" ) {
					queue.unshift( "inprogress" );
				}

				// Clear up the last queue stop function
				delete hooks.stop;
				fn.call( elem, next, hooks );
			}

			if ( !startLength && hooks ) {
				hooks.empty.fire();
			}
		},

		// Not public - generate a queueHooks object, or return the current one
		_queueHooks: function( elem, type ) {
			var key = type + "queueHooks";
			return dataPriv.get( elem, key ) || dataPriv.access( elem, key, {
				empty: jQuery.Callbacks( "once memory" ).add( function() {
					dataPriv.remove( elem, [ type + "queue", key ] );
				} )
			} );
		}
	} );

	jQuery.fn.extend( {
		queue: function( type, data ) {
			var setter = 2;

			if ( typeof type !== "string" ) {
				data = type;
				type = "fx";
				setter--;
			}

			if ( arguments.length < setter ) {
				return jQuery.queue( this[ 0 ], type );
			}

			return data === undefined ?
				this :
				this.each( function() {
					var queue = jQuery.queue( this, type, data );

					// Ensure a hooks for this queue
					jQuery._queueHooks( this, type );

					if ( type === "fx" && queue[ 0 ] !== "inprogress" ) {
						jQuery.dequeue( this, type );
					}
				} );
		},
		dequeue: function( type ) {
			return this.each( function() {
				jQuery.dequeue( this, type );
			} );
		},
		clearQueue: function( type ) {
			return this.queue( type || "fx", [] );
		},

		// Get a promise resolved when queues of a certain type
		// are emptied (fx is the type by default)
		promise: function( type, obj ) {
			var tmp,
				count = 1,
				defer = jQuery.Deferred(),
				elements = this,
				i = this.length,
				resolve = function() {
					if ( !( --count ) ) {
						defer.resolveWith( elements, [ elements ] );
					}
				};

			if ( typeof type !== "string" ) {
				obj = type;
				type = undefined;
			}
			type = type || "fx";

			while ( i-- ) {
				tmp = dataPriv.get( elements[ i ], type + "queueHooks" );
				if ( tmp && tmp.empty ) {
					count++;
					tmp.empty.add( resolve );
				}
			}
			resolve();
			return defer.promise( obj );
		}
	} );
	var pnum = ( /[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/ ).source;

	var rcssNum = new RegExp( "^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i" );


	var cssExpand = [ "Top", "Right", "Bottom", "Left" ];

	var isHidden = function( elem, el ) {

			// isHidden might be called from jQuery#filter function;
			// in that case, element will be second argument
			elem = el || elem;
			return jQuery.css( elem, "display" ) === "none" ||
				!jQuery.contains( elem.ownerDocument, elem );
		};



	function adjustCSS( elem, prop, valueParts, tween ) {
		var adjusted,
			scale = 1,
			maxIterations = 20,
			currentValue = tween ?
				function() { return tween.cur(); } :
				function() { return jQuery.css( elem, prop, "" ); },
			initial = currentValue(),
			unit = valueParts && valueParts[ 3 ] || ( jQuery.cssNumber[ prop ] ? "" : "px" ),

			// Starting value computation is required for potential unit mismatches
			initialInUnit = ( jQuery.cssNumber[ prop ] || unit !== "px" && +initial ) &&
				rcssNum.exec( jQuery.css( elem, prop ) );

		if ( initialInUnit && initialInUnit[ 3 ] !== unit ) {

			// Trust units reported by jQuery.css
			unit = unit || initialInUnit[ 3 ];

			// Make sure we update the tween properties later on
			valueParts = valueParts || [];

			// Iteratively approximate from a nonzero starting point
			initialInUnit = +initial || 1;

			do {

				// If previous iteration zeroed out, double until we get *something*.
				// Use string for doubling so we don't accidentally see scale as unchanged below
				scale = scale || ".5";

				// Adjust and apply
				initialInUnit = initialInUnit / scale;
				jQuery.style( elem, prop, initialInUnit + unit );

			// Update scale, tolerating zero or NaN from tween.cur()
			// Break the loop if scale is unchanged or perfect, or if we've just had enough.
			} while (
				scale !== ( scale = currentValue() / initial ) && scale !== 1 && --maxIterations
			);
		}

		if ( valueParts ) {
			initialInUnit = +initialInUnit || +initial || 0;

			// Apply relative offset (+=/-=) if specified
			adjusted = valueParts[ 1 ] ?
				initialInUnit + ( valueParts[ 1 ] + 1 ) * valueParts[ 2 ] :
				+valueParts[ 2 ];
			if ( tween ) {
				tween.unit = unit;
				tween.start = initialInUnit;
				tween.end = adjusted;
			}
		}
		return adjusted;
	}
	var rcheckableType = ( /^(?:checkbox|radio)$/i );

	var rtagName = ( /<([\w:-]+)/ );

	var rscriptType = ( /^$|\/(?:java|ecma)script/i );



	// We have to close these tags to support XHTML (#13200)
	var wrapMap = {

		// Support: IE9
		option: [ 1, "<select multiple='multiple'>", "</select>" ],

		// XHTML parsers do not magically insert elements in the
		// same way that tag soup parsers do. So we cannot shorten
		// this by omitting <tbody> or other required elements.
		thead: [ 1, "<table>", "</table>" ],
		col: [ 2, "<table><colgroup>", "</colgroup></table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],

		_default: [ 0, "", "" ]
	};

	// Support: IE9
	wrapMap.optgroup = wrapMap.option;

	wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
	wrapMap.th = wrapMap.td;


	function getAll( context, tag ) {

		// Support: IE9-11+
		// Use typeof to avoid zero-argument method invocation on host objects (#15151)
		var ret = typeof context.getElementsByTagName !== "undefined" ?
				context.getElementsByTagName( tag || "*" ) :
				typeof context.querySelectorAll !== "undefined" ?
					context.querySelectorAll( tag || "*" ) :
				[];

		return tag === undefined || tag && jQuery.nodeName( context, tag ) ?
			jQuery.merge( [ context ], ret ) :
			ret;
	}


	// Mark scripts as having already been evaluated
	function setGlobalEval( elems, refElements ) {
		var i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			dataPriv.set(
				elems[ i ],
				"globalEval",
				!refElements || dataPriv.get( refElements[ i ], "globalEval" )
			);
		}
	}


	var rhtml = /<|&#?\w+;/;

	function buildFragment( elems, context, scripts, selection, ignored ) {
		var elem, tmp, tag, wrap, contains, j,
			fragment = context.createDocumentFragment(),
			nodes = [],
			i = 0,
			l = elems.length;

		for ( ; i < l; i++ ) {
			elem = elems[ i ];

			if ( elem || elem === 0 ) {

				// Add nodes directly
				if ( jQuery.type( elem ) === "object" ) {

					// Support: Android<4.1, PhantomJS<2
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, elem.nodeType ? [ elem ] : elem );

				// Convert non-html into a text node
				} else if ( !rhtml.test( elem ) ) {
					nodes.push( context.createTextNode( elem ) );

				// Convert html into DOM nodes
				} else {
					tmp = tmp || fragment.appendChild( context.createElement( "div" ) );

					// Deserialize a standard representation
					tag = ( rtagName.exec( elem ) || [ "", "" ] )[ 1 ].toLowerCase();
					wrap = wrapMap[ tag ] || wrapMap._default;
					tmp.innerHTML = wrap[ 1 ] + jQuery.htmlPrefilter( elem ) + wrap[ 2 ];

					// Descend through wrappers to the right content
					j = wrap[ 0 ];
					while ( j-- ) {
						tmp = tmp.lastChild;
					}

					// Support: Android<4.1, PhantomJS<2
					// push.apply(_, arraylike) throws on ancient WebKit
					jQuery.merge( nodes, tmp.childNodes );

					// Remember the top-level container
					tmp = fragment.firstChild;

					// Ensure the created nodes are orphaned (#12392)
					tmp.textContent = "";
				}
			}
		}

		// Remove wrapper from fragment
		fragment.textContent = "";

		i = 0;
		while ( ( elem = nodes[ i++ ] ) ) {

			// Skip elements already in the context collection (trac-4087)
			if ( selection && jQuery.inArray( elem, selection ) > -1 ) {
				if ( ignored ) {
					ignored.push( elem );
				}
				continue;
			}

			contains = jQuery.contains( elem.ownerDocument, elem );

			// Append to fragment
			tmp = getAll( fragment.appendChild( elem ), "script" );

			// Preserve script evaluation history
			if ( contains ) {
				setGlobalEval( tmp );
			}

			// Capture executables
			if ( scripts ) {
				j = 0;
				while ( ( elem = tmp[ j++ ] ) ) {
					if ( rscriptType.test( elem.type || "" ) ) {
						scripts.push( elem );
					}
				}
			}
		}

		return fragment;
	}


	( function() {
		var fragment = document.createDocumentFragment(),
			div = fragment.appendChild( document.createElement( "div" ) ),
			input = document.createElement( "input" );

		// Support: Android 4.0-4.3, Safari<=5.1
		// Check state lost if the name is set (#11217)
		// Support: Windows Web Apps (WWA)
		// `name` and `type` must use .setAttribute for WWA (#14901)
		input.setAttribute( "type", "radio" );
		input.setAttribute( "checked", "checked" );
		input.setAttribute( "name", "t" );

		div.appendChild( input );

		// Support: Safari<=5.1, Android<4.2
		// Older WebKit doesn't clone checked state correctly in fragments
		support.checkClone = div.cloneNode( true ).cloneNode( true ).lastChild.checked;

		// Support: IE<=11+
		// Make sure textarea (and checkbox) defaultValue is properly cloned
		div.innerHTML = "<textarea>x</textarea>";
		support.noCloneChecked = !!div.cloneNode( true ).lastChild.defaultValue;
	} )();


	var
		rkeyEvent = /^key/,
		rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
		rtypenamespace = /^([^.]*)(?:\.(.+)|)/;

	function returnTrue() {
		return true;
	}

	function returnFalse() {
		return false;
	}

	// Support: IE9
	// See #13393 for more info
	function safeActiveElement() {
		try {
			return document.activeElement;
		} catch ( err ) { }
	}

	function on( elem, types, selector, data, fn, one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {

			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) {

				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				on( elem, type, selector, data, types[ type ], one );
			}
			return elem;
		}

		if ( data == null && fn == null ) {

			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {

				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {

				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return elem;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {

				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};

			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return elem.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		} );
	}

	/*
	 * Helper functions for managing events -- not part of the public interface.
	 * Props to Dean Edwards' addEvent library for many of the ideas.
	 */
	jQuery.event = {

		global: {},

		add: function( elem, types, handler, data, selector ) {

			var handleObjIn, eventHandle, tmp,
				events, t, handleObj,
				special, handlers, type, namespaces, origType,
				elemData = dataPriv.get( elem );

			// Don't attach events to noData or text/comment nodes (but allow plain objects)
			if ( !elemData ) {
				return;
			}

			// Caller can pass in an object of custom data in lieu of the handler
			if ( handler.handler ) {
				handleObjIn = handler;
				handler = handleObjIn.handler;
				selector = handleObjIn.selector;
			}

			// Make sure that the handler has a unique ID, used to find/remove it later
			if ( !handler.guid ) {
				handler.guid = jQuery.guid++;
			}

			// Init the element's event structure and main handler, if this is the first
			if ( !( events = elemData.events ) ) {
				events = elemData.events = {};
			}
			if ( !( eventHandle = elemData.handle ) ) {
				eventHandle = elemData.handle = function( e ) {

					// Discard the second event of a jQuery.event.trigger() and
					// when an event is called after a page has unloaded
					return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ?
						jQuery.event.dispatch.apply( elem, arguments ) : undefined;
				};
			}

			// Handle multiple events separated by a space
			types = ( types || "" ).match( rnotwhite ) || [ "" ];
			t = types.length;
			while ( t-- ) {
				tmp = rtypenamespace.exec( types[ t ] ) || [];
				type = origType = tmp[ 1 ];
				namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

				// There *must* be a type, no attaching namespace-only handlers
				if ( !type ) {
					continue;
				}

				// If event changes its type, use the special event handlers for the changed type
				special = jQuery.event.special[ type ] || {};

				// If selector defined, determine special event api type, otherwise given type
				type = ( selector ? special.delegateType : special.bindType ) || type;

				// Update special based on newly reset type
				special = jQuery.event.special[ type ] || {};

				// handleObj is passed to all event handlers
				handleObj = jQuery.extend( {
					type: type,
					origType: origType,
					data: data,
					handler: handler,
					guid: handler.guid,
					selector: selector,
					needsContext: selector && jQuery.expr.match.needsContext.test( selector ),
					namespace: namespaces.join( "." )
				}, handleObjIn );

				// Init the event handler queue if we're the first
				if ( !( handlers = events[ type ] ) ) {
					handlers = events[ type ] = [];
					handlers.delegateCount = 0;

					// Only use addEventListener if the special events handler returns false
					if ( !special.setup ||
						special.setup.call( elem, data, namespaces, eventHandle ) === false ) {

						if ( elem.addEventListener ) {
							elem.addEventListener( type, eventHandle );
						}
					}
				}

				if ( special.add ) {
					special.add.call( elem, handleObj );

					if ( !handleObj.handler.guid ) {
						handleObj.handler.guid = handler.guid;
					}
				}

				// Add to the element's handler list, delegates in front
				if ( selector ) {
					handlers.splice( handlers.delegateCount++, 0, handleObj );
				} else {
					handlers.push( handleObj );
				}

				// Keep track of which events have ever been used, for event optimization
				jQuery.event.global[ type ] = true;
			}

		},

		// Detach an event or set of events from an element
		remove: function( elem, types, handler, selector, mappedTypes ) {

			var j, origCount, tmp,
				events, t, handleObj,
				special, handlers, type, namespaces, origType,
				elemData = dataPriv.hasData( elem ) && dataPriv.get( elem );

			if ( !elemData || !( events = elemData.events ) ) {
				return;
			}

			// Once for each type.namespace in types; type may be omitted
			types = ( types || "" ).match( rnotwhite ) || [ "" ];
			t = types.length;
			while ( t-- ) {
				tmp = rtypenamespace.exec( types[ t ] ) || [];
				type = origType = tmp[ 1 ];
				namespaces = ( tmp[ 2 ] || "" ).split( "." ).sort();

				// Unbind all events (on this namespace, if provided) for the element
				if ( !type ) {
					for ( type in events ) {
						jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
					}
					continue;
				}

				special = jQuery.event.special[ type ] || {};
				type = ( selector ? special.delegateType : special.bindType ) || type;
				handlers = events[ type ] || [];
				tmp = tmp[ 2 ] &&
					new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" );

				// Remove matching events
				origCount = j = handlers.length;
				while ( j-- ) {
					handleObj = handlers[ j ];

					if ( ( mappedTypes || origType === handleObj.origType ) &&
						( !handler || handler.guid === handleObj.guid ) &&
						( !tmp || tmp.test( handleObj.namespace ) ) &&
						( !selector || selector === handleObj.selector ||
							selector === "**" && handleObj.selector ) ) {
						handlers.splice( j, 1 );

						if ( handleObj.selector ) {
							handlers.delegateCount--;
						}
						if ( special.remove ) {
							special.remove.call( elem, handleObj );
						}
					}
				}

				// Remove generic event handler if we removed something and no more handlers exist
				// (avoids potential for endless recursion during removal of special event handlers)
				if ( origCount && !handlers.length ) {
					if ( !special.teardown ||
						special.teardown.call( elem, namespaces, elemData.handle ) === false ) {

						jQuery.removeEvent( elem, type, elemData.handle );
					}

					delete events[ type ];
				}
			}

			// Remove data and the expando if it's no longer used
			if ( jQuery.isEmptyObject( events ) ) {
				dataPriv.remove( elem, "handle events" );
			}
		},

		dispatch: function( event ) {

			// Make a writable jQuery.Event from the native event object
			event = jQuery.event.fix( event );

			var i, j, ret, matched, handleObj,
				handlerQueue = [],
				args = slice.call( arguments ),
				handlers = ( dataPriv.get( this, "events" ) || {} )[ event.type ] || [],
				special = jQuery.event.special[ event.type ] || {};

			// Use the fix-ed jQuery.Event rather than the (read-only) native event
			args[ 0 ] = event;
			event.delegateTarget = this;

			// Call the preDispatch hook for the mapped type, and let it bail if desired
			if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
				return;
			}

			// Determine handlers
			handlerQueue = jQuery.event.handlers.call( this, event, handlers );

			// Run delegates first; they may want to stop propagation beneath us
			i = 0;
			while ( ( matched = handlerQueue[ i++ ] ) && !event.isPropagationStopped() ) {
				event.currentTarget = matched.elem;

				j = 0;
				while ( ( handleObj = matched.handlers[ j++ ] ) &&
					!event.isImmediatePropagationStopped() ) {

					// Triggered event must either 1) have no namespace, or 2) have namespace(s)
					// a subset or equal to those in the bound event (both can have no namespace).
					if ( !event.rnamespace || event.rnamespace.test( handleObj.namespace ) ) {

						event.handleObj = handleObj;
						event.data = handleObj.data;

						ret = ( ( jQuery.event.special[ handleObj.origType ] || {} ).handle ||
							handleObj.handler ).apply( matched.elem, args );

						if ( ret !== undefined ) {
							if ( ( event.result = ret ) === false ) {
								event.preventDefault();
								event.stopPropagation();
							}
						}
					}
				}
			}

			// Call the postDispatch hook for the mapped type
			if ( special.postDispatch ) {
				special.postDispatch.call( this, event );
			}

			return event.result;
		},

		handlers: function( event, handlers ) {
			var i, matches, sel, handleObj,
				handlerQueue = [],
				delegateCount = handlers.delegateCount,
				cur = event.target;

			// Support (at least): Chrome, IE9
			// Find delegate handlers
			// Black-hole SVG <use> instance trees (#13180)
			//
			// Support: Firefox<=42+
			// Avoid non-left-click in FF but don't block IE radio events (#3861, gh-2343)
			if ( delegateCount && cur.nodeType &&
				( event.type !== "click" || isNaN( event.button ) || event.button < 1 ) ) {

				for ( ; cur !== this; cur = cur.parentNode || this ) {

					// Don't check non-elements (#13208)
					// Don't process clicks on disabled elements (#6911, #8165, #11382, #11764)
					if ( cur.nodeType === 1 && ( cur.disabled !== true || event.type !== "click" ) ) {
						matches = [];
						for ( i = 0; i < delegateCount; i++ ) {
							handleObj = handlers[ i ];

							// Don't conflict with Object.prototype properties (#13203)
							sel = handleObj.selector + " ";

							if ( matches[ sel ] === undefined ) {
								matches[ sel ] = handleObj.needsContext ?
									jQuery( sel, this ).index( cur ) > -1 :
									jQuery.find( sel, this, null, [ cur ] ).length;
							}
							if ( matches[ sel ] ) {
								matches.push( handleObj );
							}
						}
						if ( matches.length ) {
							handlerQueue.push( { elem: cur, handlers: matches } );
						}
					}
				}
			}

			// Add the remaining (directly-bound) handlers
			if ( delegateCount < handlers.length ) {
				handlerQueue.push( { elem: this, handlers: handlers.slice( delegateCount ) } );
			}

			return handlerQueue;
		},

		// Includes some event props shared by KeyEvent and MouseEvent
		props: ( "altKey bubbles cancelable ctrlKey currentTarget detail eventPhase " +
			"metaKey relatedTarget shiftKey target timeStamp view which" ).split( " " ),

		fixHooks: {},

		keyHooks: {
			props: "char charCode key keyCode".split( " " ),
			filter: function( event, original ) {

				// Add which for key events
				if ( event.which == null ) {
					event.which = original.charCode != null ? original.charCode : original.keyCode;
				}

				return event;
			}
		},

		mouseHooks: {
			props: ( "button buttons clientX clientY offsetX offsetY pageX pageY " +
				"screenX screenY toElement" ).split( " " ),
			filter: function( event, original ) {
				var eventDoc, doc, body,
					button = original.button;

				// Calculate pageX/Y if missing and clientX/Y available
				if ( event.pageX == null && original.clientX != null ) {
					eventDoc = event.target.ownerDocument || document;
					doc = eventDoc.documentElement;
					body = eventDoc.body;

					event.pageX = original.clientX +
						( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
						( doc && doc.clientLeft || body && body.clientLeft || 0 );
					event.pageY = original.clientY +
						( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) -
						( doc && doc.clientTop  || body && body.clientTop  || 0 );
				}

				// Add which for click: 1 === left; 2 === middle; 3 === right
				// Note: button is not normalized, so don't use it
				if ( !event.which && button !== undefined ) {
					event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
				}

				return event;
			}
		},

		fix: function( event ) {
			if ( event[ jQuery.expando ] ) {
				return event;
			}

			// Create a writable copy of the event object and normalize some properties
			var i, prop, copy,
				type = event.type,
				originalEvent = event,
				fixHook = this.fixHooks[ type ];

			if ( !fixHook ) {
				this.fixHooks[ type ] = fixHook =
					rmouseEvent.test( type ) ? this.mouseHooks :
					rkeyEvent.test( type ) ? this.keyHooks :
					{};
			}
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

			event = new jQuery.Event( originalEvent );

			i = copy.length;
			while ( i-- ) {
				prop = copy[ i ];
				event[ prop ] = originalEvent[ prop ];
			}

			// Support: Cordova 2.5 (WebKit) (#13255)
			// All events should have a target; Cordova deviceready doesn't
			if ( !event.target ) {
				event.target = document;
			}

			// Support: Safari 6.0+, Chrome<28
			// Target should not be a text node (#504, #13143)
			if ( event.target.nodeType === 3 ) {
				event.target = event.target.parentNode;
			}

			return fixHook.filter ? fixHook.filter( event, originalEvent ) : event;
		},

		special: {
			load: {

				// Prevent triggered image.load events from bubbling to window.load
				noBubble: true
			},
			focus: {

				// Fire native event if possible so blur/focus sequence is correct
				trigger: function() {
					if ( this !== safeActiveElement() && this.focus ) {
						this.focus();
						return false;
					}
				},
				delegateType: "focusin"
			},
			blur: {
				trigger: function() {
					if ( this === safeActiveElement() && this.blur ) {
						this.blur();
						return false;
					}
				},
				delegateType: "focusout"
			},
			click: {

				// For checkbox, fire native event so checked state will be right
				trigger: function() {
					if ( this.type === "checkbox" && this.click && jQuery.nodeName( this, "input" ) ) {
						this.click();
						return false;
					}
				},

				// For cross-browser consistency, don't fire native .click() on links
				_default: function( event ) {
					return jQuery.nodeName( event.target, "a" );
				}
			},

			beforeunload: {
				postDispatch: function( event ) {

					// Support: Firefox 20+
					// Firefox doesn't alert if the returnValue field is not set.
					if ( event.result !== undefined && event.originalEvent ) {
						event.originalEvent.returnValue = event.result;
					}
				}
			}
		}
	};

	jQuery.removeEvent = function( elem, type, handle ) {

		// This "if" is needed for plain objects
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle );
		}
	};

	jQuery.Event = function( src, props ) {

		// Allow instantiation without the 'new' keyword
		if ( !( this instanceof jQuery.Event ) ) {
			return new jQuery.Event( src, props );
		}

		// Event object
		if ( src && src.type ) {
			this.originalEvent = src;
			this.type = src.type;

			// Events bubbling up the document may have been marked as prevented
			// by a handler lower down the tree; reflect the correct value.
			this.isDefaultPrevented = src.defaultPrevented ||
					src.defaultPrevented === undefined &&

					// Support: Android<4.0
					src.returnValue === false ?
				returnTrue :
				returnFalse;

		// Event type
		} else {
			this.type = src;
		}

		// Put explicitly provided properties onto the event object
		if ( props ) {
			jQuery.extend( this, props );
		}

		// Create a timestamp if incoming event doesn't have one
		this.timeStamp = src && src.timeStamp || jQuery.now();

		// Mark it as fixed
		this[ jQuery.expando ] = true;
	};

	// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
	// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
	jQuery.Event.prototype = {
		constructor: jQuery.Event,
		isDefaultPrevented: returnFalse,
		isPropagationStopped: returnFalse,
		isImmediatePropagationStopped: returnFalse,
		isSimulated: false,

		preventDefault: function() {
			var e = this.originalEvent;

			this.isDefaultPrevented = returnTrue;

			if ( e && !this.isSimulated ) {
				e.preventDefault();
			}
		},
		stopPropagation: function() {
			var e = this.originalEvent;

			this.isPropagationStopped = returnTrue;

			if ( e && !this.isSimulated ) {
				e.stopPropagation();
			}
		},
		stopImmediatePropagation: function() {
			var e = this.originalEvent;

			this.isImmediatePropagationStopped = returnTrue;

			if ( e && !this.isSimulated ) {
				e.stopImmediatePropagation();
			}

			this.stopPropagation();
		}
	};

	// Create mouseenter/leave events using mouseover/out and event-time checks
	// so that event delegation works in jQuery.
	// Do the same for pointerenter/pointerleave and pointerover/pointerout
	//
	// Support: Safari 7 only
	// Safari sends mouseenter too often; see:
	// https://code.google.com/p/chromium/issues/detail?id=470258
	// for the description of the bug (it existed in older Chrome versions as well).
	jQuery.each( {
		mouseenter: "mouseover",
		mouseleave: "mouseout",
		pointerenter: "pointerover",
		pointerleave: "pointerout"
	}, function( orig, fix ) {
		jQuery.event.special[ orig ] = {
			delegateType: fix,
			bindType: fix,

			handle: function( event ) {
				var ret,
					target = this,
					related = event.relatedTarget,
					handleObj = event.handleObj;

				// For mouseenter/leave call the handler if related is outside the target.
				// NB: No relatedTarget if the mouse left/entered the browser window
				if ( !related || ( related !== target && !jQuery.contains( target, related ) ) ) {
					event.type = handleObj.origType;
					ret = handleObj.handler.apply( this, arguments );
					event.type = fix;
				}
				return ret;
			}
		};
	} );

	jQuery.fn.extend( {
		on: function( types, selector, data, fn ) {
			return on( this, types, selector, data, fn );
		},
		one: function( types, selector, data, fn ) {
			return on( this, types, selector, data, fn, 1 );
		},
		off: function( types, selector, fn ) {
			var handleObj, type;
			if ( types && types.preventDefault && types.handleObj ) {

				// ( event )  dispatched jQuery.Event
				handleObj = types.handleObj;
				jQuery( types.delegateTarget ).off(
					handleObj.namespace ?
						handleObj.origType + "." + handleObj.namespace :
						handleObj.origType,
					handleObj.selector,
					handleObj.handler
				);
				return this;
			}
			if ( typeof types === "object" ) {

				// ( types-object [, selector] )
				for ( type in types ) {
					this.off( type, selector, types[ type ] );
				}
				return this;
			}
			if ( selector === false || typeof selector === "function" ) {

				// ( types [, fn] )
				fn = selector;
				selector = undefined;
			}
			if ( fn === false ) {
				fn = returnFalse;
			}
			return this.each( function() {
				jQuery.event.remove( this, types, fn, selector );
			} );
		}
	} );


	var
		rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:-]+)[^>]*)\/>/gi,

		// Support: IE 10-11, Edge 10240+
		// In IE/Edge using regex groups here causes severe slowdowns.
		// See https://connect.microsoft.com/IE/feedback/details/1736512/
		rnoInnerhtml = /<script|<style|<link/i,

		// checked="checked" or checked
		rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
		rscriptTypeMasked = /^true\/(.*)/,
		rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;

	// Manipulating tables requires a tbody
	function manipulationTarget( elem, content ) {
		return jQuery.nodeName( elem, "table" ) &&
			jQuery.nodeName( content.nodeType !== 11 ? content : content.firstChild, "tr" ) ?

			elem.getElementsByTagName( "tbody" )[ 0 ] ||
				elem.appendChild( elem.ownerDocument.createElement( "tbody" ) ) :
			elem;
	}

	// Replace/restore the type attribute of script elements for safe DOM manipulation
	function disableScript( elem ) {
		elem.type = ( elem.getAttribute( "type" ) !== null ) + "/" + elem.type;
		return elem;
	}
	function restoreScript( elem ) {
		var match = rscriptTypeMasked.exec( elem.type );

		if ( match ) {
			elem.type = match[ 1 ];
		} else {
			elem.removeAttribute( "type" );
		}

		return elem;
	}

	function cloneCopyEvent( src, dest ) {
		var i, l, type, pdataOld, pdataCur, udataOld, udataCur, events;

		if ( dest.nodeType !== 1 ) {
			return;
		}

		// 1. Copy private data: events, handlers, etc.
		if ( dataPriv.hasData( src ) ) {
			pdataOld = dataPriv.access( src );
			pdataCur = dataPriv.set( dest, pdataOld );
			events = pdataOld.events;

			if ( events ) {
				delete pdataCur.handle;
				pdataCur.events = {};

				for ( type in events ) {
					for ( i = 0, l = events[ type ].length; i < l; i++ ) {
						jQuery.event.add( dest, type, events[ type ][ i ] );
					}
				}
			}
		}

		// 2. Copy user data
		if ( dataUser.hasData( src ) ) {
			udataOld = dataUser.access( src );
			udataCur = jQuery.extend( {}, udataOld );

			dataUser.set( dest, udataCur );
		}
	}

	// Fix IE bugs, see support tests
	function fixInput( src, dest ) {
		var nodeName = dest.nodeName.toLowerCase();

		// Fails to persist the checked state of a cloned checkbox or radio button.
		if ( nodeName === "input" && rcheckableType.test( src.type ) ) {
			dest.checked = src.checked;

		// Fails to return the selected option to the default selected state when cloning options
		} else if ( nodeName === "input" || nodeName === "textarea" ) {
			dest.defaultValue = src.defaultValue;
		}
	}

	function domManip( collection, args, callback, ignored ) {

		// Flatten any nested arrays
		args = concat.apply( [], args );

		var fragment, first, scripts, hasScripts, node, doc,
			i = 0,
			l = collection.length,
			iNoClone = l - 1,
			value = args[ 0 ],
			isFunction = jQuery.isFunction( value );

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( isFunction ||
				( l > 1 && typeof value === "string" &&
					!support.checkClone && rchecked.test( value ) ) ) {
			return collection.each( function( index ) {
				var self = collection.eq( index );
				if ( isFunction ) {
					args[ 0 ] = value.call( this, index, self.html() );
				}
				domManip( self, args, callback, ignored );
			} );
		}

		if ( l ) {
			fragment = buildFragment( args, collection[ 0 ].ownerDocument, false, collection, ignored );
			first = fragment.firstChild;

			if ( fragment.childNodes.length === 1 ) {
				fragment = first;
			}

			// Require either new content or an interest in ignored elements to invoke the callback
			if ( first || ignored ) {
				scripts = jQuery.map( getAll( fragment, "script" ), disableScript );
				hasScripts = scripts.length;

				// Use the original fragment for the last item
				// instead of the first because it can end up
				// being emptied incorrectly in certain situations (#8070).
				for ( ; i < l; i++ ) {
					node = fragment;

					if ( i !== iNoClone ) {
						node = jQuery.clone( node, true, true );

						// Keep references to cloned scripts for later restoration
						if ( hasScripts ) {

							// Support: Android<4.1, PhantomJS<2
							// push.apply(_, arraylike) throws on ancient WebKit
							jQuery.merge( scripts, getAll( node, "script" ) );
						}
					}

					callback.call( collection[ i ], node, i );
				}

				if ( hasScripts ) {
					doc = scripts[ scripts.length - 1 ].ownerDocument;

					// Reenable scripts
					jQuery.map( scripts, restoreScript );

					// Evaluate executable scripts on first document insertion
					for ( i = 0; i < hasScripts; i++ ) {
						node = scripts[ i ];
						if ( rscriptType.test( node.type || "" ) &&
							!dataPriv.access( node, "globalEval" ) &&
							jQuery.contains( doc, node ) ) {

							if ( node.src ) {

								// Optional AJAX dependency, but won't run scripts if not present
								if ( jQuery._evalUrl ) {
									jQuery._evalUrl( node.src );
								}
							} else {
								jQuery.globalEval( node.textContent.replace( rcleanScript, "" ) );
							}
						}
					}
				}
			}
		}

		return collection;
	}

	function remove( elem, selector, keepData ) {
		var node,
			nodes = selector ? jQuery.filter( selector, elem ) : elem,
			i = 0;

		for ( ; ( node = nodes[ i ] ) != null; i++ ) {
			if ( !keepData && node.nodeType === 1 ) {
				jQuery.cleanData( getAll( node ) );
			}

			if ( node.parentNode ) {
				if ( keepData && jQuery.contains( node.ownerDocument, node ) ) {
					setGlobalEval( getAll( node, "script" ) );
				}
				node.parentNode.removeChild( node );
			}
		}

		return elem;
	}

	jQuery.extend( {
		htmlPrefilter: function( html ) {
			return html.replace( rxhtmlTag, "<$1></$2>" );
		},

		clone: function( elem, dataAndEvents, deepDataAndEvents ) {
			var i, l, srcElements, destElements,
				clone = elem.cloneNode( true ),
				inPage = jQuery.contains( elem.ownerDocument, elem );

			// Fix IE cloning issues
			if ( !support.noCloneChecked && ( elem.nodeType === 1 || elem.nodeType === 11 ) &&
					!jQuery.isXMLDoc( elem ) ) {

				// We eschew Sizzle here for performance reasons: http://jsperf.com/getall-vs-sizzle/2
				destElements = getAll( clone );
				srcElements = getAll( elem );

				for ( i = 0, l = srcElements.length; i < l; i++ ) {
					fixInput( srcElements[ i ], destElements[ i ] );
				}
			}

			// Copy the events from the original to the clone
			if ( dataAndEvents ) {
				if ( deepDataAndEvents ) {
					srcElements = srcElements || getAll( elem );
					destElements = destElements || getAll( clone );

					for ( i = 0, l = srcElements.length; i < l; i++ ) {
						cloneCopyEvent( srcElements[ i ], destElements[ i ] );
					}
				} else {
					cloneCopyEvent( elem, clone );
				}
			}

			// Preserve script evaluation history
			destElements = getAll( clone, "script" );
			if ( destElements.length > 0 ) {
				setGlobalEval( destElements, !inPage && getAll( elem, "script" ) );
			}

			// Return the cloned set
			return clone;
		},

		cleanData: function( elems ) {
			var data, elem, type,
				special = jQuery.event.special,
				i = 0;

			for ( ; ( elem = elems[ i ] ) !== undefined; i++ ) {
				if ( acceptData( elem ) ) {
					if ( ( data = elem[ dataPriv.expando ] ) ) {
						if ( data.events ) {
							for ( type in data.events ) {
								if ( special[ type ] ) {
									jQuery.event.remove( elem, type );

								// This is a shortcut to avoid jQuery.event.remove's overhead
								} else {
									jQuery.removeEvent( elem, type, data.handle );
								}
							}
						}

						// Support: Chrome <= 35-45+
						// Assign undefined instead of using delete, see Data#remove
						elem[ dataPriv.expando ] = undefined;
					}
					if ( elem[ dataUser.expando ] ) {

						// Support: Chrome <= 35-45+
						// Assign undefined instead of using delete, see Data#remove
						elem[ dataUser.expando ] = undefined;
					}
				}
			}
		}
	} );

	jQuery.fn.extend( {

		// Keep domManip exposed until 3.0 (gh-2225)
		domManip: domManip,

		detach: function( selector ) {
			return remove( this, selector, true );
		},

		remove: function( selector ) {
			return remove( this, selector );
		},

		text: function( value ) {
			return access( this, function( value ) {
				return value === undefined ?
					jQuery.text( this ) :
					this.empty().each( function() {
						if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
							this.textContent = value;
						}
					} );
			}, null, value, arguments.length );
		},

		append: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
					var target = manipulationTarget( this, elem );
					target.appendChild( elem );
				}
			} );
		},

		prepend: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9 ) {
					var target = manipulationTarget( this, elem );
					target.insertBefore( elem, target.firstChild );
				}
			} );
		},

		before: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.parentNode ) {
					this.parentNode.insertBefore( elem, this );
				}
			} );
		},

		after: function() {
			return domManip( this, arguments, function( elem ) {
				if ( this.parentNode ) {
					this.parentNode.insertBefore( elem, this.nextSibling );
				}
			} );
		},

		empty: function() {
			var elem,
				i = 0;

			for ( ; ( elem = this[ i ] ) != null; i++ ) {
				if ( elem.nodeType === 1 ) {

					// Prevent memory leaks
					jQuery.cleanData( getAll( elem, false ) );

					// Remove any remaining nodes
					elem.textContent = "";
				}
			}

			return this;
		},

		clone: function( dataAndEvents, deepDataAndEvents ) {
			dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
			deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

			return this.map( function() {
				return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
			} );
		},

		html: function( value ) {
			return access( this, function( value ) {
				var elem = this[ 0 ] || {},
					i = 0,
					l = this.length;

				if ( value === undefined && elem.nodeType === 1 ) {
					return elem.innerHTML;
				}

				// See if we can take a shortcut and just use innerHTML
				if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
					!wrapMap[ ( rtagName.exec( value ) || [ "", "" ] )[ 1 ].toLowerCase() ] ) {

					value = jQuery.htmlPrefilter( value );

					try {
						for ( ; i < l; i++ ) {
							elem = this[ i ] || {};

							// Remove element nodes and prevent memory leaks
							if ( elem.nodeType === 1 ) {
								jQuery.cleanData( getAll( elem, false ) );
								elem.innerHTML = value;
							}
						}

						elem = 0;

					// If using innerHTML throws an exception, use the fallback method
					} catch ( e ) {}
				}

				if ( elem ) {
					this.empty().append( value );
				}
			}, null, value, arguments.length );
		},

		replaceWith: function() {
			var ignored = [];

			// Make the changes, replacing each non-ignored context element with the new content
			return domManip( this, arguments, function( elem ) {
				var parent = this.parentNode;

				if ( jQuery.inArray( this, ignored ) < 0 ) {
					jQuery.cleanData( getAll( this ) );
					if ( parent ) {
						parent.replaceChild( elem, this );
					}
				}

			// Force callback invocation
			}, ignored );
		}
	} );

	jQuery.each( {
		appendTo: "append",
		prependTo: "prepend",
		insertBefore: "before",
		insertAfter: "after",
		replaceAll: "replaceWith"
	}, function( name, original ) {
		jQuery.fn[ name ] = function( selector ) {
			var elems,
				ret = [],
				insert = jQuery( selector ),
				last = insert.length - 1,
				i = 0;

			for ( ; i <= last; i++ ) {
				elems = i === last ? this : this.clone( true );
				jQuery( insert[ i ] )[ original ]( elems );

				// Support: QtWebKit
				// .get() because push.apply(_, arraylike) throws
				push.apply( ret, elems.get() );
			}

			return this.pushStack( ret );
		};
	} );


	var iframe,
		elemdisplay = {

			// Support: Firefox
			// We have to pre-define these values for FF (#10227)
			HTML: "block",
			BODY: "block"
		};

	/**
	 * Retrieve the actual display of a element
	 * @param {String} name nodeName of the element
	 * @param {Object} doc Document object
	 */

	// Called only from within defaultDisplay
	function actualDisplay( name, doc ) {
		var elem = jQuery( doc.createElement( name ) ).appendTo( doc.body ),

			display = jQuery.css( elem[ 0 ], "display" );

		// We don't have any data stored on the element,
		// so use "detach" method as fast way to get rid of the element
		elem.detach();

		return display;
	}

	/**
	 * Try to determine the default display value of an element
	 * @param {String} nodeName
	 */
	function defaultDisplay( nodeName ) {
		var doc = document,
			display = elemdisplay[ nodeName ];

		if ( !display ) {
			display = actualDisplay( nodeName, doc );

			// If the simple way fails, read from inside an iframe
			if ( display === "none" || !display ) {

				// Use the already-created iframe if possible
				iframe = ( iframe || jQuery( "<iframe frameborder='0' width='0' height='0'/>" ) )
					.appendTo( doc.documentElement );

				// Always write a new HTML skeleton so Webkit and Firefox don't choke on reuse
				doc = iframe[ 0 ].contentDocument;

				// Support: IE
				doc.write();
				doc.close();

				display = actualDisplay( nodeName, doc );
				iframe.detach();
			}

			// Store the correct default display
			elemdisplay[ nodeName ] = display;
		}

		return display;
	}
	var rmargin = ( /^margin/ );

	var rnumnonpx = new RegExp( "^(" + pnum + ")(?!px)[a-z%]+$", "i" );

	var getStyles = function( elem ) {

			// Support: IE<=11+, Firefox<=30+ (#15098, #14150)
			// IE throws on elements created in popups
			// FF meanwhile throws on frame elements through "defaultView.getComputedStyle"
			var view = elem.ownerDocument.defaultView;

			if ( !view || !view.opener ) {
				view = window;
			}

			return view.getComputedStyle( elem );
		};

	var swap = function( elem, options, callback, args ) {
		var ret, name,
			old = {};

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.apply( elem, args || [] );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	};


	var documentElement = document.documentElement;



	( function() {
		var pixelPositionVal, boxSizingReliableVal, pixelMarginRightVal, reliableMarginLeftVal,
			container = document.createElement( "div" ),
			div = document.createElement( "div" );

		// Finish early in limited (non-browser) environments
		if ( !div.style ) {
			return;
		}

		// Support: IE9-11+
		// Style of cloned element affects source element cloned (#8908)
		div.style.backgroundClip = "content-box";
		div.cloneNode( true ).style.backgroundClip = "";
		support.clearCloneStyle = div.style.backgroundClip === "content-box";

		container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" +
			"padding:0;margin-top:1px;position:absolute";
		container.appendChild( div );

		// Executing both pixelPosition & boxSizingReliable tests require only one layout
		// so they're executed at the same time to save the second computation.
		function computeStyleTests() {
			div.style.cssText =

				// Support: Firefox<29, Android 2.3
				// Vendor-prefix box-sizing
				"-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;" +
				"position:relative;display:block;" +
				"margin:auto;border:1px;padding:1px;" +
				"top:1%;width:50%";
			div.innerHTML = "";
			documentElement.appendChild( container );

			var divStyle = window.getComputedStyle( div );
			pixelPositionVal = divStyle.top !== "1%";
			reliableMarginLeftVal = divStyle.marginLeft === "2px";
			boxSizingReliableVal = divStyle.width === "4px";

			// Support: Android 4.0 - 4.3 only
			// Some styles come back with percentage values, even though they shouldn't
			div.style.marginRight = "50%";
			pixelMarginRightVal = divStyle.marginRight === "4px";

			documentElement.removeChild( container );
		}

		jQuery.extend( support, {
			pixelPosition: function() {

				// This test is executed only once but we still do memoizing
				// since we can use the boxSizingReliable pre-computing.
				// No need to check if the test was already performed, though.
				computeStyleTests();
				return pixelPositionVal;
			},
			boxSizingReliable: function() {
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return boxSizingReliableVal;
			},
			pixelMarginRight: function() {

				// Support: Android 4.0-4.3
				// We're checking for boxSizingReliableVal here instead of pixelMarginRightVal
				// since that compresses better and they're computed together anyway.
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return pixelMarginRightVal;
			},
			reliableMarginLeft: function() {

				// Support: IE <=8 only, Android 4.0 - 4.3 only, Firefox <=3 - 37
				if ( boxSizingReliableVal == null ) {
					computeStyleTests();
				}
				return reliableMarginLeftVal;
			},
			reliableMarginRight: function() {

				// Support: Android 2.3
				// Check if div with explicit width and no margin-right incorrectly
				// gets computed margin-right based on width of container. (#3333)
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// This support function is only executed once so no memoizing is needed.
				var ret,
					marginDiv = div.appendChild( document.createElement( "div" ) );

				// Reset CSS: box-sizing; display; margin; border; padding
				marginDiv.style.cssText = div.style.cssText =

					// Support: Android 2.3
					// Vendor-prefix box-sizing
					"-webkit-box-sizing:content-box;box-sizing:content-box;" +
					"display:block;margin:0;border:0;padding:0";
				marginDiv.style.marginRight = marginDiv.style.width = "0";
				div.style.width = "1px";
				documentElement.appendChild( container );

				ret = !parseFloat( window.getComputedStyle( marginDiv ).marginRight );

				documentElement.removeChild( container );
				div.removeChild( marginDiv );

				return ret;
			}
		} );
	} )();


	function curCSS( elem, name, computed ) {
		var width, minWidth, maxWidth, ret,
			style = elem.style;

		computed = computed || getStyles( elem );
		ret = computed ? computed.getPropertyValue( name ) || computed[ name ] : undefined;

		// Support: Opera 12.1x only
		// Fall back to style even without computed
		// computed is undefined for elems on document fragments
		if ( ( ret === "" || ret === undefined ) && !jQuery.contains( elem.ownerDocument, elem ) ) {
			ret = jQuery.style( elem, name );
		}

		// Support: IE9
		// getPropertyValue is only needed for .css('filter') (#12537)
		if ( computed ) {

			// A tribute to the "awesome hack by Dean Edwards"
			// Android Browser returns percentage for some values,
			// but width seems to be reliably pixels.
			// This is against the CSSOM draft spec:
			// http://dev.w3.org/csswg/cssom/#resolved-values
			if ( !support.pixelMarginRight() && rnumnonpx.test( ret ) && rmargin.test( name ) ) {

				// Remember the original values
				width = style.width;
				minWidth = style.minWidth;
				maxWidth = style.maxWidth;

				// Put in the new values to get a computed value out
				style.minWidth = style.maxWidth = style.width = ret;
				ret = computed.width;

				// Revert the changed values
				style.width = width;
				style.minWidth = minWidth;
				style.maxWidth = maxWidth;
			}
		}

		return ret !== undefined ?

			// Support: IE9-11+
			// IE returns zIndex value as an integer.
			ret + "" :
			ret;
	}


	function addGetHookIf( conditionFn, hookFn ) {

		// Define the hook, we'll check on the first run if it's really needed.
		return {
			get: function() {
				if ( conditionFn() ) {

					// Hook not needed (or it's not possible to use it due
					// to missing dependency), remove it.
					delete this.get;
					return;
				}

				// Hook needed; redefine it so that the support test is not executed again.
				return ( this.get = hookFn ).apply( this, arguments );
			}
		};
	}


	var

		// Swappable if display is none or starts with table
		// except "table", "table-cell", or "table-caption"
		// See here for display values: https://developer.mozilla.org/en-US/docs/CSS/display
		rdisplayswap = /^(none|table(?!-c[ea]).+)/,

		cssShow = { position: "absolute", visibility: "hidden", display: "block" },
		cssNormalTransform = {
			letterSpacing: "0",
			fontWeight: "400"
		},

		cssPrefixes = [ "Webkit", "O", "Moz", "ms" ],
		emptyStyle = document.createElement( "div" ).style;

	// Return a css property mapped to a potentially vendor prefixed property
	function vendorPropName( name ) {

		// Shortcut for names that are not vendor prefixed
		if ( name in emptyStyle ) {
			return name;
		}

		// Check for vendor prefixed names
		var capName = name[ 0 ].toUpperCase() + name.slice( 1 ),
			i = cssPrefixes.length;

		while ( i-- ) {
			name = cssPrefixes[ i ] + capName;
			if ( name in emptyStyle ) {
				return name;
			}
		}
	}

	function setPositiveNumber( elem, value, subtract ) {

		// Any relative (+/-) values have already been
		// normalized at this point
		var matches = rcssNum.exec( value );
		return matches ?

			// Guard against undefined "subtract", e.g., when used as in cssHooks
			Math.max( 0, matches[ 2 ] - ( subtract || 0 ) ) + ( matches[ 3 ] || "px" ) :
			value;
	}

	function augmentWidthOrHeight( elem, name, extra, isBorderBox, styles ) {
		var i = extra === ( isBorderBox ? "border" : "content" ) ?

			// If we already have the right measurement, avoid augmentation
			4 :

			// Otherwise initialize for horizontal or vertical properties
			name === "width" ? 1 : 0,

			val = 0;

		for ( ; i < 4; i += 2 ) {

			// Both box models exclude margin, so add it if we want it
			if ( extra === "margin" ) {
				val += jQuery.css( elem, extra + cssExpand[ i ], true, styles );
			}

			if ( isBorderBox ) {

				// border-box includes padding, so remove it if we want content
				if ( extra === "content" ) {
					val -= jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );
				}

				// At this point, extra isn't border nor margin, so remove border
				if ( extra !== "margin" ) {
					val -= jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
				}
			} else {

				// At this point, extra isn't content, so add padding
				val += jQuery.css( elem, "padding" + cssExpand[ i ], true, styles );

				// At this point, extra isn't content nor padding, so add border
				if ( extra !== "padding" ) {
					val += jQuery.css( elem, "border" + cssExpand[ i ] + "Width", true, styles );
				}
			}
		}

		return val;
	}

	function getWidthOrHeight( elem, name, extra ) {

		// Start with offset property, which is equivalent to the border-box value
		var valueIsBorderBox = true,
			val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
			styles = getStyles( elem ),
			isBorderBox = jQuery.css( elem, "boxSizing", false, styles ) === "border-box";

		// Some non-html elements return undefined for offsetWidth, so check for null/undefined
		// svg - https://bugzilla.mozilla.org/show_bug.cgi?id=649285
		// MathML - https://bugzilla.mozilla.org/show_bug.cgi?id=491668
		if ( val <= 0 || val == null ) {

			// Fall back to computed then uncomputed css if necessary
			val = curCSS( elem, name, styles );
			if ( val < 0 || val == null ) {
				val = elem.style[ name ];
			}

			// Computed unit is not pixels. Stop here and return.
			if ( rnumnonpx.test( val ) ) {
				return val;
			}

			// Check for style in case a browser which returns unreliable values
			// for getComputedStyle silently falls back to the reliable elem.style
			valueIsBorderBox = isBorderBox &&
				( support.boxSizingReliable() || val === elem.style[ name ] );

			// Normalize "", auto, and prepare for extra
			val = parseFloat( val ) || 0;
		}

		// Use the active box-sizing model to add/subtract irrelevant styles
		return ( val +
			augmentWidthOrHeight(
				elem,
				name,
				extra || ( isBorderBox ? "border" : "content" ),
				valueIsBorderBox,
				styles
			)
		) + "px";
	}

	function showHide( elements, show ) {
		var display, elem, hidden,
			values = [],
			index = 0,
			length = elements.length;

		for ( ; index < length; index++ ) {
			elem = elements[ index ];
			if ( !elem.style ) {
				continue;
			}

			values[ index ] = dataPriv.get( elem, "olddisplay" );
			display = elem.style.display;
			if ( show ) {

				// Reset the inline display of this element to learn if it is
				// being hidden by cascaded rules or not
				if ( !values[ index ] && display === "none" ) {
					elem.style.display = "";
				}

				// Set elements which have been overridden with display: none
				// in a stylesheet to whatever the default browser style is
				// for such an element
				if ( elem.style.display === "" && isHidden( elem ) ) {
					values[ index ] = dataPriv.access(
						elem,
						"olddisplay",
						defaultDisplay( elem.nodeName )
					);
				}
			} else {
				hidden = isHidden( elem );

				if ( display !== "none" || !hidden ) {
					dataPriv.set(
						elem,
						"olddisplay",
						hidden ? display : jQuery.css( elem, "display" )
					);
				}
			}
		}

		// Set the display of most of the elements in a second loop
		// to avoid the constant reflow
		for ( index = 0; index < length; index++ ) {
			elem = elements[ index ];
			if ( !elem.style ) {
				continue;
			}
			if ( !show || elem.style.display === "none" || elem.style.display === "" ) {
				elem.style.display = show ? values[ index ] || "" : "none";
			}
		}

		return elements;
	}

	jQuery.extend( {

		// Add in style property hooks for overriding the default
		// behavior of getting and setting a style property
		cssHooks: {
			opacity: {
				get: function( elem, computed ) {
					if ( computed ) {

						// We should always get a number back from opacity
						var ret = curCSS( elem, "opacity" );
						return ret === "" ? "1" : ret;
					}
				}
			}
		},

		// Don't automatically add "px" to these possibly-unitless properties
		cssNumber: {
			"animationIterationCount": true,
			"columnCount": true,
			"fillOpacity": true,
			"flexGrow": true,
			"flexShrink": true,
			"fontWeight": true,
			"lineHeight": true,
			"opacity": true,
			"order": true,
			"orphans": true,
			"widows": true,
			"zIndex": true,
			"zoom": true
		},

		// Add in properties whose names you wish to fix before
		// setting or getting the value
		cssProps: {
			"float": "cssFloat"
		},

		// Get and set the style property on a DOM Node
		style: function( elem, name, value, extra ) {

			// Don't set styles on text and comment nodes
			if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
				return;
			}

			// Make sure that we're working with the right name
			var ret, type, hooks,
				origName = jQuery.camelCase( name ),
				style = elem.style;

			name = jQuery.cssProps[ origName ] ||
				( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

			// Gets hook for the prefixed version, then unprefixed version
			hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

			// Check if we're setting a value
			if ( value !== undefined ) {
				type = typeof value;

				// Convert "+=" or "-=" to relative numbers (#7345)
				if ( type === "string" && ( ret = rcssNum.exec( value ) ) && ret[ 1 ] ) {
					value = adjustCSS( elem, name, ret );

					// Fixes bug #9237
					type = "number";
				}

				// Make sure that null and NaN values aren't set (#7116)
				if ( value == null || value !== value ) {
					return;
				}

				// If a number was passed in, add the unit (except for certain CSS properties)
				if ( type === "number" ) {
					value += ret && ret[ 3 ] || ( jQuery.cssNumber[ origName ] ? "" : "px" );
				}

				// Support: IE9-11+
				// background-* props affect original clone's values
				if ( !support.clearCloneStyle && value === "" && name.indexOf( "background" ) === 0 ) {
					style[ name ] = "inherit";
				}

				// If a hook was provided, use that value, otherwise just set the specified value
				if ( !hooks || !( "set" in hooks ) ||
					( value = hooks.set( elem, value, extra ) ) !== undefined ) {

					style[ name ] = value;
				}

			} else {

				// If a hook was provided get the non-computed value from there
				if ( hooks && "get" in hooks &&
					( ret = hooks.get( elem, false, extra ) ) !== undefined ) {

					return ret;
				}

				// Otherwise just get the value from the style object
				return style[ name ];
			}
		},

		css: function( elem, name, extra, styles ) {
			var val, num, hooks,
				origName = jQuery.camelCase( name );

			// Make sure that we're working with the right name
			name = jQuery.cssProps[ origName ] ||
				( jQuery.cssProps[ origName ] = vendorPropName( origName ) || origName );

			// Try prefixed name followed by the unprefixed name
			hooks = jQuery.cssHooks[ name ] || jQuery.cssHooks[ origName ];

			// If a hook was provided get the computed value from there
			if ( hooks && "get" in hooks ) {
				val = hooks.get( elem, true, extra );
			}

			// Otherwise, if a way to get the computed value exists, use that
			if ( val === undefined ) {
				val = curCSS( elem, name, styles );
			}

			// Convert "normal" to computed value
			if ( val === "normal" && name in cssNormalTransform ) {
				val = cssNormalTransform[ name ];
			}

			// Make numeric if forced or a qualifier was provided and val looks numeric
			if ( extra === "" || extra ) {
				num = parseFloat( val );
				return extra === true || isFinite( num ) ? num || 0 : val;
			}
			return val;
		}
	} );

	jQuery.each( [ "height", "width" ], function( i, name ) {
		jQuery.cssHooks[ name ] = {
			get: function( elem, computed, extra ) {
				if ( computed ) {

					// Certain elements can have dimension info if we invisibly show them
					// but it must have a current display style that would benefit
					return rdisplayswap.test( jQuery.css( elem, "display" ) ) &&
						elem.offsetWidth === 0 ?
							swap( elem, cssShow, function() {
								return getWidthOrHeight( elem, name, extra );
							} ) :
							getWidthOrHeight( elem, name, extra );
				}
			},

			set: function( elem, value, extra ) {
				var matches,
					styles = extra && getStyles( elem ),
					subtract = extra && augmentWidthOrHeight(
						elem,
						name,
						extra,
						jQuery.css( elem, "boxSizing", false, styles ) === "border-box",
						styles
					);

				// Convert to pixels if value adjustment is needed
				if ( subtract && ( matches = rcssNum.exec( value ) ) &&
					( matches[ 3 ] || "px" ) !== "px" ) {

					elem.style[ name ] = value;
					value = jQuery.css( elem, name );
				}

				return setPositiveNumber( elem, value, subtract );
			}
		};
	} );

	jQuery.cssHooks.marginLeft = addGetHookIf( support.reliableMarginLeft,
		function( elem, computed ) {
			if ( computed ) {
				return ( parseFloat( curCSS( elem, "marginLeft" ) ) ||
					elem.getBoundingClientRect().left -
						swap( elem, { marginLeft: 0 }, function() {
							return elem.getBoundingClientRect().left;
						} )
					) + "px";
			}
		}
	);

	// Support: Android 2.3
	jQuery.cssHooks.marginRight = addGetHookIf( support.reliableMarginRight,
		function( elem, computed ) {
			if ( computed ) {
				return swap( elem, { "display": "inline-block" },
					curCSS, [ elem, "marginRight" ] );
			}
		}
	);

	// These hooks are used by animate to expand properties
	jQuery.each( {
		margin: "",
		padding: "",
		border: "Width"
	}, function( prefix, suffix ) {
		jQuery.cssHooks[ prefix + suffix ] = {
			expand: function( value ) {
				var i = 0,
					expanded = {},

					// Assumes a single number if not a string
					parts = typeof value === "string" ? value.split( " " ) : [ value ];

				for ( ; i < 4; i++ ) {
					expanded[ prefix + cssExpand[ i ] + suffix ] =
						parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
				}

				return expanded;
			}
		};

		if ( !rmargin.test( prefix ) ) {
			jQuery.cssHooks[ prefix + suffix ].set = setPositiveNumber;
		}
	} );

	jQuery.fn.extend( {
		css: function( name, value ) {
			return access( this, function( elem, name, value ) {
				var styles, len,
					map = {},
					i = 0;

				if ( jQuery.isArray( name ) ) {
					styles = getStyles( elem );
					len = name.length;

					for ( ; i < len; i++ ) {
						map[ name[ i ] ] = jQuery.css( elem, name[ i ], false, styles );
					}

					return map;
				}

				return value !== undefined ?
					jQuery.style( elem, name, value ) :
					jQuery.css( elem, name );
			}, name, value, arguments.length > 1 );
		},
		show: function() {
			return showHide( this, true );
		},
		hide: function() {
			return showHide( this );
		},
		toggle: function( state ) {
			if ( typeof state === "boolean" ) {
				return state ? this.show() : this.hide();
			}

			return this.each( function() {
				if ( isHidden( this ) ) {
					jQuery( this ).show();
				} else {
					jQuery( this ).hide();
				}
			} );
		}
	} );


	function Tween( elem, options, prop, end, easing ) {
		return new Tween.prototype.init( elem, options, prop, end, easing );
	}
	jQuery.Tween = Tween;

	Tween.prototype = {
		constructor: Tween,
		init: function( elem, options, prop, end, easing, unit ) {
			this.elem = elem;
			this.prop = prop;
			this.easing = easing || jQuery.easing._default;
			this.options = options;
			this.start = this.now = this.cur();
			this.end = end;
			this.unit = unit || ( jQuery.cssNumber[ prop ] ? "" : "px" );
		},
		cur: function() {
			var hooks = Tween.propHooks[ this.prop ];

			return hooks && hooks.get ?
				hooks.get( this ) :
				Tween.propHooks._default.get( this );
		},
		run: function( percent ) {
			var eased,
				hooks = Tween.propHooks[ this.prop ];

			if ( this.options.duration ) {
				this.pos = eased = jQuery.easing[ this.easing ](
					percent, this.options.duration * percent, 0, 1, this.options.duration
				);
			} else {
				this.pos = eased = percent;
			}
			this.now = ( this.end - this.start ) * eased + this.start;

			if ( this.options.step ) {
				this.options.step.call( this.elem, this.now, this );
			}

			if ( hooks && hooks.set ) {
				hooks.set( this );
			} else {
				Tween.propHooks._default.set( this );
			}
			return this;
		}
	};

	Tween.prototype.init.prototype = Tween.prototype;

	Tween.propHooks = {
		_default: {
			get: function( tween ) {
				var result;

				// Use a property on the element directly when it is not a DOM element,
				// or when there is no matching style property that exists.
				if ( tween.elem.nodeType !== 1 ||
					tween.elem[ tween.prop ] != null && tween.elem.style[ tween.prop ] == null ) {
					return tween.elem[ tween.prop ];
				}

				// Passing an empty string as a 3rd parameter to .css will automatically
				// attempt a parseFloat and fallback to a string if the parse fails.
				// Simple values such as "10px" are parsed to Float;
				// complex values such as "rotate(1rad)" are returned as-is.
				result = jQuery.css( tween.elem, tween.prop, "" );

				// Empty strings, null, undefined and "auto" are converted to 0.
				return !result || result === "auto" ? 0 : result;
			},
			set: function( tween ) {

				// Use step hook for back compat.
				// Use cssHook if its there.
				// Use .style if available and use plain properties where available.
				if ( jQuery.fx.step[ tween.prop ] ) {
					jQuery.fx.step[ tween.prop ]( tween );
				} else if ( tween.elem.nodeType === 1 &&
					( tween.elem.style[ jQuery.cssProps[ tween.prop ] ] != null ||
						jQuery.cssHooks[ tween.prop ] ) ) {
					jQuery.style( tween.elem, tween.prop, tween.now + tween.unit );
				} else {
					tween.elem[ tween.prop ] = tween.now;
				}
			}
		}
	};

	// Support: IE9
	// Panic based approach to setting things on disconnected nodes
	Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {
		set: function( tween ) {
			if ( tween.elem.nodeType && tween.elem.parentNode ) {
				tween.elem[ tween.prop ] = tween.now;
			}
		}
	};

	jQuery.easing = {
		linear: function( p ) {
			return p;
		},
		swing: function( p ) {
			return 0.5 - Math.cos( p * Math.PI ) / 2;
		},
		_default: "swing"
	};

	jQuery.fx = Tween.prototype.init;

	// Back Compat <1.8 extension point
	jQuery.fx.step = {};




	var
		fxNow, timerId,
		rfxtypes = /^(?:toggle|show|hide)$/,
		rrun = /queueHooks$/;

	// Animations created synchronously will run synchronously
	function createFxNow() {
		window.setTimeout( function() {
			fxNow = undefined;
		} );
		return ( fxNow = jQuery.now() );
	}

	// Generate parameters to create a standard animation
	function genFx( type, includeWidth ) {
		var which,
			i = 0,
			attrs = { height: type };

		// If we include width, step value is 1 to do all cssExpand values,
		// otherwise step value is 2 to skip over Left and Right
		includeWidth = includeWidth ? 1 : 0;
		for ( ; i < 4 ; i += 2 - includeWidth ) {
			which = cssExpand[ i ];
			attrs[ "margin" + which ] = attrs[ "padding" + which ] = type;
		}

		if ( includeWidth ) {
			attrs.opacity = attrs.width = type;
		}

		return attrs;
	}

	function createTween( value, prop, animation ) {
		var tween,
			collection = ( Animation.tweeners[ prop ] || [] ).concat( Animation.tweeners[ "*" ] ),
			index = 0,
			length = collection.length;
		for ( ; index < length; index++ ) {
			if ( ( tween = collection[ index ].call( animation, prop, value ) ) ) {

				// We're done with this property
				return tween;
			}
		}
	}

	function defaultPrefilter( elem, props, opts ) {
		/* jshint validthis: true */
		var prop, value, toggle, tween, hooks, oldfire, display, checkDisplay,
			anim = this,
			orig = {},
			style = elem.style,
			hidden = elem.nodeType && isHidden( elem ),
			dataShow = dataPriv.get( elem, "fxshow" );

		// Handle queue: false promises
		if ( !opts.queue ) {
			hooks = jQuery._queueHooks( elem, "fx" );
			if ( hooks.unqueued == null ) {
				hooks.unqueued = 0;
				oldfire = hooks.empty.fire;
				hooks.empty.fire = function() {
					if ( !hooks.unqueued ) {
						oldfire();
					}
				};
			}
			hooks.unqueued++;

			anim.always( function() {

				// Ensure the complete handler is called before this completes
				anim.always( function() {
					hooks.unqueued--;
					if ( !jQuery.queue( elem, "fx" ).length ) {
						hooks.empty.fire();
					}
				} );
			} );
		}

		// Height/width overflow pass
		if ( elem.nodeType === 1 && ( "height" in props || "width" in props ) ) {

			// Make sure that nothing sneaks out
			// Record all 3 overflow attributes because IE9-10 do not
			// change the overflow attribute when overflowX and
			// overflowY are set to the same value
			opts.overflow = [ style.overflow, style.overflowX, style.overflowY ];

			// Set display property to inline-block for height/width
			// animations on inline elements that are having width/height animated
			display = jQuery.css( elem, "display" );

			// Test default display if display is currently "none"
			checkDisplay = display === "none" ?
				dataPriv.get( elem, "olddisplay" ) || defaultDisplay( elem.nodeName ) : display;

			if ( checkDisplay === "inline" && jQuery.css( elem, "float" ) === "none" ) {
				style.display = "inline-block";
			}
		}

		if ( opts.overflow ) {
			style.overflow = "hidden";
			anim.always( function() {
				style.overflow = opts.overflow[ 0 ];
				style.overflowX = opts.overflow[ 1 ];
				style.overflowY = opts.overflow[ 2 ];
			} );
		}

		// show/hide pass
		for ( prop in props ) {
			value = props[ prop ];
			if ( rfxtypes.exec( value ) ) {
				delete props[ prop ];
				toggle = toggle || value === "toggle";
				if ( value === ( hidden ? "hide" : "show" ) ) {

					// If there is dataShow left over from a stopped hide or show
					// and we are going to proceed with show, we should pretend to be hidden
					if ( value === "show" && dataShow && dataShow[ prop ] !== undefined ) {
						hidden = true;
					} else {
						continue;
					}
				}
				orig[ prop ] = dataShow && dataShow[ prop ] || jQuery.style( elem, prop );

			// Any non-fx value stops us from restoring the original display value
			} else {
				display = undefined;
			}
		}

		if ( !jQuery.isEmptyObject( orig ) ) {
			if ( dataShow ) {
				if ( "hidden" in dataShow ) {
					hidden = dataShow.hidden;
				}
			} else {
				dataShow = dataPriv.access( elem, "fxshow", {} );
			}

			// Store state if its toggle - enables .stop().toggle() to "reverse"
			if ( toggle ) {
				dataShow.hidden = !hidden;
			}
			if ( hidden ) {
				jQuery( elem ).show();
			} else {
				anim.done( function() {
					jQuery( elem ).hide();
				} );
			}
			anim.done( function() {
				var prop;

				dataPriv.remove( elem, "fxshow" );
				for ( prop in orig ) {
					jQuery.style( elem, prop, orig[ prop ] );
				}
			} );
			for ( prop in orig ) {
				tween = createTween( hidden ? dataShow[ prop ] : 0, prop, anim );

				if ( !( prop in dataShow ) ) {
					dataShow[ prop ] = tween.start;
					if ( hidden ) {
						tween.end = tween.start;
						tween.start = prop === "width" || prop === "height" ? 1 : 0;
					}
				}
			}

		// If this is a noop like .hide().hide(), restore an overwritten display value
		} else if ( ( display === "none" ? defaultDisplay( elem.nodeName ) : display ) === "inline" ) {
			style.display = display;
		}
	}

	function propFilter( props, specialEasing ) {
		var index, name, easing, value, hooks;

		// camelCase, specialEasing and expand cssHook pass
		for ( index in props ) {
			name = jQuery.camelCase( index );
			easing = specialEasing[ name ];
			value = props[ index ];
			if ( jQuery.isArray( value ) ) {
				easing = value[ 1 ];
				value = props[ index ] = value[ 0 ];
			}

			if ( index !== name ) {
				props[ name ] = value;
				delete props[ index ];
			}

			hooks = jQuery.cssHooks[ name ];
			if ( hooks && "expand" in hooks ) {
				value = hooks.expand( value );
				delete props[ name ];

				// Not quite $.extend, this won't overwrite existing keys.
				// Reusing 'index' because we have the correct "name"
				for ( index in value ) {
					if ( !( index in props ) ) {
						props[ index ] = value[ index ];
						specialEasing[ index ] = easing;
					}
				}
			} else {
				specialEasing[ name ] = easing;
			}
		}
	}

	function Animation( elem, properties, options ) {
		var result,
			stopped,
			index = 0,
			length = Animation.prefilters.length,
			deferred = jQuery.Deferred().always( function() {

				// Don't match elem in the :animated selector
				delete tick.elem;
			} ),
			tick = function() {
				if ( stopped ) {
					return false;
				}
				var currentTime = fxNow || createFxNow(),
					remaining = Math.max( 0, animation.startTime + animation.duration - currentTime ),

					// Support: Android 2.3
					// Archaic crash bug won't allow us to use `1 - ( 0.5 || 0 )` (#12497)
					temp = remaining / animation.duration || 0,
					percent = 1 - temp,
					index = 0,
					length = animation.tweens.length;

				for ( ; index < length ; index++ ) {
					animation.tweens[ index ].run( percent );
				}

				deferred.notifyWith( elem, [ animation, percent, remaining ] );

				if ( percent < 1 && length ) {
					return remaining;
				} else {
					deferred.resolveWith( elem, [ animation ] );
					return false;
				}
			},
			animation = deferred.promise( {
				elem: elem,
				props: jQuery.extend( {}, properties ),
				opts: jQuery.extend( true, {
					specialEasing: {},
					easing: jQuery.easing._default
				}, options ),
				originalProperties: properties,
				originalOptions: options,
				startTime: fxNow || createFxNow(),
				duration: options.duration,
				tweens: [],
				createTween: function( prop, end ) {
					var tween = jQuery.Tween( elem, animation.opts, prop, end,
							animation.opts.specialEasing[ prop ] || animation.opts.easing );
					animation.tweens.push( tween );
					return tween;
				},
				stop: function( gotoEnd ) {
					var index = 0,

						// If we are going to the end, we want to run all the tweens
						// otherwise we skip this part
						length = gotoEnd ? animation.tweens.length : 0;
					if ( stopped ) {
						return this;
					}
					stopped = true;
					for ( ; index < length ; index++ ) {
						animation.tweens[ index ].run( 1 );
					}

					// Resolve when we played the last frame; otherwise, reject
					if ( gotoEnd ) {
						deferred.notifyWith( elem, [ animation, 1, 0 ] );
						deferred.resolveWith( elem, [ animation, gotoEnd ] );
					} else {
						deferred.rejectWith( elem, [ animation, gotoEnd ] );
					}
					return this;
				}
			} ),
			props = animation.props;

		propFilter( props, animation.opts.specialEasing );

		for ( ; index < length ; index++ ) {
			result = Animation.prefilters[ index ].call( animation, elem, props, animation.opts );
			if ( result ) {
				if ( jQuery.isFunction( result.stop ) ) {
					jQuery._queueHooks( animation.elem, animation.opts.queue ).stop =
						jQuery.proxy( result.stop, result );
				}
				return result;
			}
		}

		jQuery.map( props, createTween, animation );

		if ( jQuery.isFunction( animation.opts.start ) ) {
			animation.opts.start.call( elem, animation );
		}

		jQuery.fx.timer(
			jQuery.extend( tick, {
				elem: elem,
				anim: animation,
				queue: animation.opts.queue
			} )
		);

		// attach callbacks from options
		return animation.progress( animation.opts.progress )
			.done( animation.opts.done, animation.opts.complete )
			.fail( animation.opts.fail )
			.always( animation.opts.always );
	}

	jQuery.Animation = jQuery.extend( Animation, {
		tweeners: {
			"*": [ function( prop, value ) {
				var tween = this.createTween( prop, value );
				adjustCSS( tween.elem, prop, rcssNum.exec( value ), tween );
				return tween;
			} ]
		},

		tweener: function( props, callback ) {
			if ( jQuery.isFunction( props ) ) {
				callback = props;
				props = [ "*" ];
			} else {
				props = props.match( rnotwhite );
			}

			var prop,
				index = 0,
				length = props.length;

			for ( ; index < length ; index++ ) {
				prop = props[ index ];
				Animation.tweeners[ prop ] = Animation.tweeners[ prop ] || [];
				Animation.tweeners[ prop ].unshift( callback );
			}
		},

		prefilters: [ defaultPrefilter ],

		prefilter: function( callback, prepend ) {
			if ( prepend ) {
				Animation.prefilters.unshift( callback );
			} else {
				Animation.prefilters.push( callback );
			}
		}
	} );

	jQuery.speed = function( speed, easing, fn ) {
		var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
			complete: fn || !fn && easing ||
				jQuery.isFunction( speed ) && speed,
			duration: speed,
			easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
		};

		opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ?
			opt.duration : opt.duration in jQuery.fx.speeds ?
				jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

		// Normalize opt.queue - true/undefined/null -> "fx"
		if ( opt.queue == null || opt.queue === true ) {
			opt.queue = "fx";
		}

		// Queueing
		opt.old = opt.complete;

		opt.complete = function() {
			if ( jQuery.isFunction( opt.old ) ) {
				opt.old.call( this );
			}

			if ( opt.queue ) {
				jQuery.dequeue( this, opt.queue );
			}
		};

		return opt;
	};

	jQuery.fn.extend( {
		fadeTo: function( speed, to, easing, callback ) {

			// Show any hidden elements after setting opacity to 0
			return this.filter( isHidden ).css( "opacity", 0 ).show()

				// Animate to the value specified
				.end().animate( { opacity: to }, speed, easing, callback );
		},
		animate: function( prop, speed, easing, callback ) {
			var empty = jQuery.isEmptyObject( prop ),
				optall = jQuery.speed( speed, easing, callback ),
				doAnimation = function() {

					// Operate on a copy of prop so per-property easing won't be lost
					var anim = Animation( this, jQuery.extend( {}, prop ), optall );

					// Empty animations, or finishing resolves immediately
					if ( empty || dataPriv.get( this, "finish" ) ) {
						anim.stop( true );
					}
				};
				doAnimation.finish = doAnimation;

			return empty || optall.queue === false ?
				this.each( doAnimation ) :
				this.queue( optall.queue, doAnimation );
		},
		stop: function( type, clearQueue, gotoEnd ) {
			var stopQueue = function( hooks ) {
				var stop = hooks.stop;
				delete hooks.stop;
				stop( gotoEnd );
			};

			if ( typeof type !== "string" ) {
				gotoEnd = clearQueue;
				clearQueue = type;
				type = undefined;
			}
			if ( clearQueue && type !== false ) {
				this.queue( type || "fx", [] );
			}

			return this.each( function() {
				var dequeue = true,
					index = type != null && type + "queueHooks",
					timers = jQuery.timers,
					data = dataPriv.get( this );

				if ( index ) {
					if ( data[ index ] && data[ index ].stop ) {
						stopQueue( data[ index ] );
					}
				} else {
					for ( index in data ) {
						if ( data[ index ] && data[ index ].stop && rrun.test( index ) ) {
							stopQueue( data[ index ] );
						}
					}
				}

				for ( index = timers.length; index--; ) {
					if ( timers[ index ].elem === this &&
						( type == null || timers[ index ].queue === type ) ) {

						timers[ index ].anim.stop( gotoEnd );
						dequeue = false;
						timers.splice( index, 1 );
					}
				}

				// Start the next in the queue if the last step wasn't forced.
				// Timers currently will call their complete callbacks, which
				// will dequeue but only if they were gotoEnd.
				if ( dequeue || !gotoEnd ) {
					jQuery.dequeue( this, type );
				}
			} );
		},
		finish: function( type ) {
			if ( type !== false ) {
				type = type || "fx";
			}
			return this.each( function() {
				var index,
					data = dataPriv.get( this ),
					queue = data[ type + "queue" ],
					hooks = data[ type + "queueHooks" ],
					timers = jQuery.timers,
					length = queue ? queue.length : 0;

				// Enable finishing flag on private data
				data.finish = true;

				// Empty the queue first
				jQuery.queue( this, type, [] );

				if ( hooks && hooks.stop ) {
					hooks.stop.call( this, true );
				}

				// Look for any active animations, and finish them
				for ( index = timers.length; index--; ) {
					if ( timers[ index ].elem === this && timers[ index ].queue === type ) {
						timers[ index ].anim.stop( true );
						timers.splice( index, 1 );
					}
				}

				// Look for any animations in the old queue and finish them
				for ( index = 0; index < length; index++ ) {
					if ( queue[ index ] && queue[ index ].finish ) {
						queue[ index ].finish.call( this );
					}
				}

				// Turn off finishing flag
				delete data.finish;
			} );
		}
	} );

	jQuery.each( [ "toggle", "show", "hide" ], function( i, name ) {
		var cssFn = jQuery.fn[ name ];
		jQuery.fn[ name ] = function( speed, easing, callback ) {
			return speed == null || typeof speed === "boolean" ?
				cssFn.apply( this, arguments ) :
				this.animate( genFx( name, true ), speed, easing, callback );
		};
	} );

	// Generate shortcuts for custom animations
	jQuery.each( {
		slideDown: genFx( "show" ),
		slideUp: genFx( "hide" ),
		slideToggle: genFx( "toggle" ),
		fadeIn: { opacity: "show" },
		fadeOut: { opacity: "hide" },
		fadeToggle: { opacity: "toggle" }
	}, function( name, props ) {
		jQuery.fn[ name ] = function( speed, easing, callback ) {
			return this.animate( props, speed, easing, callback );
		};
	} );

	jQuery.timers = [];
	jQuery.fx.tick = function() {
		var timer,
			i = 0,
			timers = jQuery.timers;

		fxNow = jQuery.now();

		for ( ; i < timers.length; i++ ) {
			timer = timers[ i ];

			// Checks the timer has not already been removed
			if ( !timer() && timers[ i ] === timer ) {
				timers.splice( i--, 1 );
			}
		}

		if ( !timers.length ) {
			jQuery.fx.stop();
		}
		fxNow = undefined;
	};

	jQuery.fx.timer = function( timer ) {
		jQuery.timers.push( timer );
		if ( timer() ) {
			jQuery.fx.start();
		} else {
			jQuery.timers.pop();
		}
	};

	jQuery.fx.interval = 13;
	jQuery.fx.start = function() {
		if ( !timerId ) {
			timerId = window.setInterval( jQuery.fx.tick, jQuery.fx.interval );
		}
	};

	jQuery.fx.stop = function() {
		window.clearInterval( timerId );

		timerId = null;
	};

	jQuery.fx.speeds = {
		slow: 600,
		fast: 200,

		// Default speed
		_default: 400
	};


	// Based off of the plugin by Clint Helfers, with permission.
	// http://web.archive.org/web/20100324014747/http://blindsignals.com/index.php/2009/07/jquery-delay/
	jQuery.fn.delay = function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = window.setTimeout( next, time );
			hooks.stop = function() {
				window.clearTimeout( timeout );
			};
		} );
	};


	( function() {
		var input = document.createElement( "input" ),
			select = document.createElement( "select" ),
			opt = select.appendChild( document.createElement( "option" ) );

		input.type = "checkbox";

		// Support: iOS<=5.1, Android<=4.2+
		// Default value for a checkbox should be "on"
		support.checkOn = input.value !== "";

		// Support: IE<=11+
		// Must access selectedIndex to make default options select
		support.optSelected = opt.selected;

		// Support: Android<=2.3
		// Options inside disabled selects are incorrectly marked as disabled
		select.disabled = true;
		support.optDisabled = !opt.disabled;

		// Support: IE<=11+
		// An input loses its value after becoming a radio
		input = document.createElement( "input" );
		input.value = "t";
		input.type = "radio";
		support.radioValue = input.value === "t";
	} )();


	var boolHook,
		attrHandle = jQuery.expr.attrHandle;

	jQuery.fn.extend( {
		attr: function( name, value ) {
			return access( this, jQuery.attr, name, value, arguments.length > 1 );
		},

		removeAttr: function( name ) {
			return this.each( function() {
				jQuery.removeAttr( this, name );
			} );
		}
	} );

	jQuery.extend( {
		attr: function( elem, name, value ) {
			var ret, hooks,
				nType = elem.nodeType;

			// Don't get/set attributes on text, comment and attribute nodes
			if ( nType === 3 || nType === 8 || nType === 2 ) {
				return;
			}

			// Fallback to prop when attributes are not supported
			if ( typeof elem.getAttribute === "undefined" ) {
				return jQuery.prop( elem, name, value );
			}

			// All attributes are lowercase
			// Grab necessary hook if one is defined
			if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {
				name = name.toLowerCase();
				hooks = jQuery.attrHooks[ name ] ||
					( jQuery.expr.match.bool.test( name ) ? boolHook : undefined );
			}

			if ( value !== undefined ) {
				if ( value === null ) {
					jQuery.removeAttr( elem, name );
					return;
				}

				if ( hooks && "set" in hooks &&
					( ret = hooks.set( elem, value, name ) ) !== undefined ) {
					return ret;
				}

				elem.setAttribute( name, value + "" );
				return value;
			}

			if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
				return ret;
			}

			ret = jQuery.find.attr( elem, name );

			// Non-existent attributes return null, we normalize to undefined
			return ret == null ? undefined : ret;
		},

		attrHooks: {
			type: {
				set: function( elem, value ) {
					if ( !support.radioValue && value === "radio" &&
						jQuery.nodeName( elem, "input" ) ) {
						var val = elem.value;
						elem.setAttribute( "type", value );
						if ( val ) {
							elem.value = val;
						}
						return value;
					}
				}
			}
		},

		removeAttr: function( elem, value ) {
			var name, propName,
				i = 0,
				attrNames = value && value.match( rnotwhite );

			if ( attrNames && elem.nodeType === 1 ) {
				while ( ( name = attrNames[ i++ ] ) ) {
					propName = jQuery.propFix[ name ] || name;

					// Boolean attributes get special treatment (#10870)
					if ( jQuery.expr.match.bool.test( name ) ) {

						// Set corresponding property to false
						elem[ propName ] = false;
					}

					elem.removeAttribute( name );
				}
			}
		}
	} );

	// Hooks for boolean attributes
	boolHook = {
		set: function( elem, value, name ) {
			if ( value === false ) {

				// Remove boolean attributes when set to false
				jQuery.removeAttr( elem, name );
			} else {
				elem.setAttribute( name, name );
			}
			return name;
		}
	};
	jQuery.each( jQuery.expr.match.bool.source.match( /\w+/g ), function( i, name ) {
		var getter = attrHandle[ name ] || jQuery.find.attr;

		attrHandle[ name ] = function( elem, name, isXML ) {
			var ret, handle;
			if ( !isXML ) {

				// Avoid an infinite loop by temporarily removing this function from the getter
				handle = attrHandle[ name ];
				attrHandle[ name ] = ret;
				ret = getter( elem, name, isXML ) != null ?
					name.toLowerCase() :
					null;
				attrHandle[ name ] = handle;
			}
			return ret;
		};
	} );




	var rfocusable = /^(?:input|select|textarea|button)$/i,
		rclickable = /^(?:a|area)$/i;

	jQuery.fn.extend( {
		prop: function( name, value ) {
			return access( this, jQuery.prop, name, value, arguments.length > 1 );
		},

		removeProp: function( name ) {
			return this.each( function() {
				delete this[ jQuery.propFix[ name ] || name ];
			} );
		}
	} );

	jQuery.extend( {
		prop: function( elem, name, value ) {
			var ret, hooks,
				nType = elem.nodeType;

			// Don't get/set properties on text, comment and attribute nodes
			if ( nType === 3 || nType === 8 || nType === 2 ) {
				return;
			}

			if ( nType !== 1 || !jQuery.isXMLDoc( elem ) ) {

				// Fix name and attach hooks
				name = jQuery.propFix[ name ] || name;
				hooks = jQuery.propHooks[ name ];
			}

			if ( value !== undefined ) {
				if ( hooks && "set" in hooks &&
					( ret = hooks.set( elem, value, name ) ) !== undefined ) {
					return ret;
				}

				return ( elem[ name ] = value );
			}

			if ( hooks && "get" in hooks && ( ret = hooks.get( elem, name ) ) !== null ) {
				return ret;
			}

			return elem[ name ];
		},

		propHooks: {
			tabIndex: {
				get: function( elem ) {

					// elem.tabIndex doesn't always return the
					// correct value when it hasn't been explicitly set
					// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
					// Use proper attribute retrieval(#12072)
					var tabindex = jQuery.find.attr( elem, "tabindex" );

					return tabindex ?
						parseInt( tabindex, 10 ) :
						rfocusable.test( elem.nodeName ) ||
							rclickable.test( elem.nodeName ) && elem.href ?
								0 :
								-1;
				}
			}
		},

		propFix: {
			"for": "htmlFor",
			"class": "className"
		}
	} );

	// Support: IE <=11 only
	// Accessing the selectedIndex property
	// forces the browser to respect setting selected
	// on the option
	// The getter ensures a default option is selected
	// when in an optgroup
	if ( !support.optSelected ) {
		jQuery.propHooks.selected = {
			get: function( elem ) {
				var parent = elem.parentNode;
				if ( parent && parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
				return null;
			},
			set: function( elem ) {
				var parent = elem.parentNode;
				if ( parent ) {
					parent.selectedIndex;

					if ( parent.parentNode ) {
						parent.parentNode.selectedIndex;
					}
				}
			}
		};
	}

	jQuery.each( [
		"tabIndex",
		"readOnly",
		"maxLength",
		"cellSpacing",
		"cellPadding",
		"rowSpan",
		"colSpan",
		"useMap",
		"frameBorder",
		"contentEditable"
	], function() {
		jQuery.propFix[ this.toLowerCase() ] = this;
	} );




	var rclass = /[\t\r\n\f]/g;

	function getClass( elem ) {
		return elem.getAttribute && elem.getAttribute( "class" ) || "";
	}

	jQuery.fn.extend( {
		addClass: function( value ) {
			var classes, elem, cur, curValue, clazz, j, finalValue,
				i = 0;

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( j ) {
					jQuery( this ).addClass( value.call( this, j, getClass( this ) ) );
				} );
			}

			if ( typeof value === "string" && value ) {
				classes = value.match( rnotwhite ) || [];

				while ( ( elem = this[ i++ ] ) ) {
					curValue = getClass( elem );
					cur = elem.nodeType === 1 &&
						( " " + curValue + " " ).replace( rclass, " " );

					if ( cur ) {
						j = 0;
						while ( ( clazz = classes[ j++ ] ) ) {
							if ( cur.indexOf( " " + clazz + " " ) < 0 ) {
								cur += clazz + " ";
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = jQuery.trim( cur );
						if ( curValue !== finalValue ) {
							elem.setAttribute( "class", finalValue );
						}
					}
				}
			}

			return this;
		},

		removeClass: function( value ) {
			var classes, elem, cur, curValue, clazz, j, finalValue,
				i = 0;

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( j ) {
					jQuery( this ).removeClass( value.call( this, j, getClass( this ) ) );
				} );
			}

			if ( !arguments.length ) {
				return this.attr( "class", "" );
			}

			if ( typeof value === "string" && value ) {
				classes = value.match( rnotwhite ) || [];

				while ( ( elem = this[ i++ ] ) ) {
					curValue = getClass( elem );

					// This expression is here for better compressibility (see addClass)
					cur = elem.nodeType === 1 &&
						( " " + curValue + " " ).replace( rclass, " " );

					if ( cur ) {
						j = 0;
						while ( ( clazz = classes[ j++ ] ) ) {

							// Remove *all* instances
							while ( cur.indexOf( " " + clazz + " " ) > -1 ) {
								cur = cur.replace( " " + clazz + " ", " " );
							}
						}

						// Only assign if different to avoid unneeded rendering.
						finalValue = jQuery.trim( cur );
						if ( curValue !== finalValue ) {
							elem.setAttribute( "class", finalValue );
						}
					}
				}
			}

			return this;
		},

		toggleClass: function( value, stateVal ) {
			var type = typeof value;

			if ( typeof stateVal === "boolean" && type === "string" ) {
				return stateVal ? this.addClass( value ) : this.removeClass( value );
			}

			if ( jQuery.isFunction( value ) ) {
				return this.each( function( i ) {
					jQuery( this ).toggleClass(
						value.call( this, i, getClass( this ), stateVal ),
						stateVal
					);
				} );
			}

			return this.each( function() {
				var className, i, self, classNames;

				if ( type === "string" ) {

					// Toggle individual class names
					i = 0;
					self = jQuery( this );
					classNames = value.match( rnotwhite ) || [];

					while ( ( className = classNames[ i++ ] ) ) {

						// Check each className given, space separated list
						if ( self.hasClass( className ) ) {
							self.removeClass( className );
						} else {
							self.addClass( className );
						}
					}

				// Toggle whole class name
				} else if ( value === undefined || type === "boolean" ) {
					className = getClass( this );
					if ( className ) {

						// Store className if set
						dataPriv.set( this, "__className__", className );
					}

					// If the element has a class name or if we're passed `false`,
					// then remove the whole classname (if there was one, the above saved it).
					// Otherwise bring back whatever was previously saved (if anything),
					// falling back to the empty string if nothing was stored.
					if ( this.setAttribute ) {
						this.setAttribute( "class",
							className || value === false ?
							"" :
							dataPriv.get( this, "__className__" ) || ""
						);
					}
				}
			} );
		},

		hasClass: function( selector ) {
			var className, elem,
				i = 0;

			className = " " + selector + " ";
			while ( ( elem = this[ i++ ] ) ) {
				if ( elem.nodeType === 1 &&
					( " " + getClass( elem ) + " " ).replace( rclass, " " )
						.indexOf( className ) > -1
				) {
					return true;
				}
			}

			return false;
		}
	} );




	var rreturn = /\r/g,
		rspaces = /[\x20\t\r\n\f]+/g;

	jQuery.fn.extend( {
		val: function( value ) {
			var hooks, ret, isFunction,
				elem = this[ 0 ];

			if ( !arguments.length ) {
				if ( elem ) {
					hooks = jQuery.valHooks[ elem.type ] ||
						jQuery.valHooks[ elem.nodeName.toLowerCase() ];

					if ( hooks &&
						"get" in hooks &&
						( ret = hooks.get( elem, "value" ) ) !== undefined
					) {
						return ret;
					}

					ret = elem.value;

					return typeof ret === "string" ?

						// Handle most common string cases
						ret.replace( rreturn, "" ) :

						// Handle cases where value is null/undef or number
						ret == null ? "" : ret;
				}

				return;
			}

			isFunction = jQuery.isFunction( value );

			return this.each( function( i ) {
				var val;

				if ( this.nodeType !== 1 ) {
					return;
				}

				if ( isFunction ) {
					val = value.call( this, i, jQuery( this ).val() );
				} else {
					val = value;
				}

				// Treat null/undefined as ""; convert numbers to string
				if ( val == null ) {
					val = "";

				} else if ( typeof val === "number" ) {
					val += "";

				} else if ( jQuery.isArray( val ) ) {
					val = jQuery.map( val, function( value ) {
						return value == null ? "" : value + "";
					} );
				}

				hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

				// If set returns undefined, fall back to normal setting
				if ( !hooks || !( "set" in hooks ) || hooks.set( this, val, "value" ) === undefined ) {
					this.value = val;
				}
			} );
		}
	} );

	jQuery.extend( {
		valHooks: {
			option: {
				get: function( elem ) {

					var val = jQuery.find.attr( elem, "value" );
					return val != null ?
						val :

						// Support: IE10-11+
						// option.text throws exceptions (#14686, #14858)
						// Strip and collapse whitespace
						// https://html.spec.whatwg.org/#strip-and-collapse-whitespace
						jQuery.trim( jQuery.text( elem ) ).replace( rspaces, " " );
				}
			},
			select: {
				get: function( elem ) {
					var value, option,
						options = elem.options,
						index = elem.selectedIndex,
						one = elem.type === "select-one" || index < 0,
						values = one ? null : [],
						max = one ? index + 1 : options.length,
						i = index < 0 ?
							max :
							one ? index : 0;

					// Loop through all the selected options
					for ( ; i < max; i++ ) {
						option = options[ i ];

						// IE8-9 doesn't update selected after form reset (#2551)
						if ( ( option.selected || i === index ) &&

								// Don't return options that are disabled or in a disabled optgroup
								( support.optDisabled ?
									!option.disabled : option.getAttribute( "disabled" ) === null ) &&
								( !option.parentNode.disabled ||
									!jQuery.nodeName( option.parentNode, "optgroup" ) ) ) {

							// Get the specific value for the option
							value = jQuery( option ).val();

							// We don't need an array for one selects
							if ( one ) {
								return value;
							}

							// Multi-Selects return an array
							values.push( value );
						}
					}

					return values;
				},

				set: function( elem, value ) {
					var optionSet, option,
						options = elem.options,
						values = jQuery.makeArray( value ),
						i = options.length;

					while ( i-- ) {
						option = options[ i ];
						if ( option.selected =
							jQuery.inArray( jQuery.valHooks.option.get( option ), values ) > -1
						) {
							optionSet = true;
						}
					}

					// Force browsers to behave consistently when non-matching value is set
					if ( !optionSet ) {
						elem.selectedIndex = -1;
					}
					return values;
				}
			}
		}
	} );

	// Radios and checkboxes getter/setter
	jQuery.each( [ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			set: function( elem, value ) {
				if ( jQuery.isArray( value ) ) {
					return ( elem.checked = jQuery.inArray( jQuery( elem ).val(), value ) > -1 );
				}
			}
		};
		if ( !support.checkOn ) {
			jQuery.valHooks[ this ].get = function( elem ) {
				return elem.getAttribute( "value" ) === null ? "on" : elem.value;
			};
		}
	} );




	// Return jQuery for attributes-only inclusion


	var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;

	jQuery.extend( jQuery.event, {

		trigger: function( event, data, elem, onlyHandlers ) {

			var i, cur, tmp, bubbleType, ontype, handle, special,
				eventPath = [ elem || document ],
				type = hasOwn.call( event, "type" ) ? event.type : event,
				namespaces = hasOwn.call( event, "namespace" ) ? event.namespace.split( "." ) : [];

			cur = tmp = elem = elem || document;

			// Don't do events on text and comment nodes
			if ( elem.nodeType === 3 || elem.nodeType === 8 ) {
				return;
			}

			// focus/blur morphs to focusin/out; ensure we're not firing them right now
			if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
				return;
			}

			if ( type.indexOf( "." ) > -1 ) {

				// Namespaced trigger; create a regexp to match event type in handle()
				namespaces = type.split( "." );
				type = namespaces.shift();
				namespaces.sort();
			}
			ontype = type.indexOf( ":" ) < 0 && "on" + type;

			// Caller can pass in a jQuery.Event object, Object, or just an event type string
			event = event[ jQuery.expando ] ?
				event :
				new jQuery.Event( type, typeof event === "object" && event );

			// Trigger bitmask: & 1 for native handlers; & 2 for jQuery (always true)
			event.isTrigger = onlyHandlers ? 2 : 3;
			event.namespace = namespaces.join( "." );
			event.rnamespace = event.namespace ?
				new RegExp( "(^|\\.)" + namespaces.join( "\\.(?:.*\\.|)" ) + "(\\.|$)" ) :
				null;

			// Clean up the event in case it is being reused
			event.result = undefined;
			if ( !event.target ) {
				event.target = elem;
			}

			// Clone any incoming data and prepend the event, creating the handler arg list
			data = data == null ?
				[ event ] :
				jQuery.makeArray( data, [ event ] );

			// Allow special events to draw outside the lines
			special = jQuery.event.special[ type ] || {};
			if ( !onlyHandlers && special.trigger && special.trigger.apply( elem, data ) === false ) {
				return;
			}

			// Determine event propagation path in advance, per W3C events spec (#9951)
			// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
			if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

				bubbleType = special.delegateType || type;
				if ( !rfocusMorph.test( bubbleType + type ) ) {
					cur = cur.parentNode;
				}
				for ( ; cur; cur = cur.parentNode ) {
					eventPath.push( cur );
					tmp = cur;
				}

				// Only add window if we got to document (e.g., not plain obj or detached DOM)
				if ( tmp === ( elem.ownerDocument || document ) ) {
					eventPath.push( tmp.defaultView || tmp.parentWindow || window );
				}
			}

			// Fire handlers on the event path
			i = 0;
			while ( ( cur = eventPath[ i++ ] ) && !event.isPropagationStopped() ) {

				event.type = i > 1 ?
					bubbleType :
					special.bindType || type;

				// jQuery handler
				handle = ( dataPriv.get( cur, "events" ) || {} )[ event.type ] &&
					dataPriv.get( cur, "handle" );
				if ( handle ) {
					handle.apply( cur, data );
				}

				// Native handler
				handle = ontype && cur[ ontype ];
				if ( handle && handle.apply && acceptData( cur ) ) {
					event.result = handle.apply( cur, data );
					if ( event.result === false ) {
						event.preventDefault();
					}
				}
			}
			event.type = type;

			// If nobody prevented the default action, do it now
			if ( !onlyHandlers && !event.isDefaultPrevented() ) {

				if ( ( !special._default ||
					special._default.apply( eventPath.pop(), data ) === false ) &&
					acceptData( elem ) ) {

					// Call a native DOM method on the target with the same name name as the event.
					// Don't do default actions on window, that's where global variables be (#6170)
					if ( ontype && jQuery.isFunction( elem[ type ] ) && !jQuery.isWindow( elem ) ) {

						// Don't re-trigger an onFOO event when we call its FOO() method
						tmp = elem[ ontype ];

						if ( tmp ) {
							elem[ ontype ] = null;
						}

						// Prevent re-triggering of the same event, since we already bubbled it above
						jQuery.event.triggered = type;
						elem[ type ]();
						jQuery.event.triggered = undefined;

						if ( tmp ) {
							elem[ ontype ] = tmp;
						}
					}
				}
			}

			return event.result;
		},

		// Piggyback on a donor event to simulate a different one
		// Used only for `focus(in | out)` events
		simulate: function( type, elem, event ) {
			var e = jQuery.extend(
				new jQuery.Event(),
				event,
				{
					type: type,
					isSimulated: true
				}
			);

			jQuery.event.trigger( e, null, elem );
		}

	} );

	jQuery.fn.extend( {

		trigger: function( type, data ) {
			return this.each( function() {
				jQuery.event.trigger( type, data, this );
			} );
		},
		triggerHandler: function( type, data ) {
			var elem = this[ 0 ];
			if ( elem ) {
				return jQuery.event.trigger( type, data, elem, true );
			}
		}
	} );


	jQuery.each( ( "blur focus focusin focusout load resize scroll unload click dblclick " +
		"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
		"change select submit keydown keypress keyup error contextmenu" ).split( " " ),
		function( i, name ) {

		// Handle event binding
		jQuery.fn[ name ] = function( data, fn ) {
			return arguments.length > 0 ?
				this.on( name, null, data, fn ) :
				this.trigger( name );
		};
	} );

	jQuery.fn.extend( {
		hover: function( fnOver, fnOut ) {
			return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
		}
	} );




	support.focusin = "onfocusin" in window;


	// Support: Firefox
	// Firefox doesn't have focus(in | out) events
	// Related ticket - https://bugzilla.mozilla.org/show_bug.cgi?id=687787
	//
	// Support: Chrome, Safari
	// focus(in | out) events fire after focus & blur events,
	// which is spec violation - http://www.w3.org/TR/DOM-Level-3-Events/#events-focusevent-event-order
	// Related ticket - https://code.google.com/p/chromium/issues/detail?id=449857
	if ( !support.focusin ) {
		jQuery.each( { focus: "focusin", blur: "focusout" }, function( orig, fix ) {

			// Attach a single capturing handler on the document while someone wants focusin/focusout
			var handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ) );
			};

			jQuery.event.special[ fix ] = {
				setup: function() {
					var doc = this.ownerDocument || this,
						attaches = dataPriv.access( doc, fix );

					if ( !attaches ) {
						doc.addEventListener( orig, handler, true );
					}
					dataPriv.access( doc, fix, ( attaches || 0 ) + 1 );
				},
				teardown: function() {
					var doc = this.ownerDocument || this,
						attaches = dataPriv.access( doc, fix ) - 1;

					if ( !attaches ) {
						doc.removeEventListener( orig, handler, true );
						dataPriv.remove( doc, fix );

					} else {
						dataPriv.access( doc, fix, attaches );
					}
				}
			};
		} );
	}
	var location = window.location;

	var nonce = jQuery.now();

	var rquery = ( /\?/ );



	// Support: Android 2.3
	// Workaround failure to string-cast null input
	jQuery.parseJSON = function( data ) {
		return JSON.parse( data + "" );
	};


	// Cross-browser xml parsing
	jQuery.parseXML = function( data ) {
		var xml;
		if ( !data || typeof data !== "string" ) {
			return null;
		}

		// Support: IE9
		try {
			xml = ( new window.DOMParser() ).parseFromString( data, "text/xml" );
		} catch ( e ) {
			xml = undefined;
		}

		if ( !xml || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	};


	var
		rhash = /#.*$/,
		rts = /([?&])_=[^&]*/,
		rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,

		// #7653, #8125, #8152: local protocol detection
		rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
		rnoContent = /^(?:GET|HEAD)$/,
		rprotocol = /^\/\//,

		/* Prefilters
		 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
		 * 2) These are called:
		 *    - BEFORE asking for a transport
		 *    - AFTER param serialization (s.data is a string if s.processData is true)
		 * 3) key is the dataType
		 * 4) the catchall symbol "*" can be used
		 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
		 */
		prefilters = {},

		/* Transports bindings
		 * 1) key is the dataType
		 * 2) the catchall symbol "*" can be used
		 * 3) selection will start with transport dataType and THEN go to "*" if needed
		 */
		transports = {},

		// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
		allTypes = "*/".concat( "*" ),

		// Anchor tag for parsing the document origin
		originAnchor = document.createElement( "a" );
		originAnchor.href = location.href;

	// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
	function addToPrefiltersOrTransports( structure ) {

		// dataTypeExpression is optional and defaults to "*"
		return function( dataTypeExpression, func ) {

			if ( typeof dataTypeExpression !== "string" ) {
				func = dataTypeExpression;
				dataTypeExpression = "*";
			}

			var dataType,
				i = 0,
				dataTypes = dataTypeExpression.toLowerCase().match( rnotwhite ) || [];

			if ( jQuery.isFunction( func ) ) {

				// For each dataType in the dataTypeExpression
				while ( ( dataType = dataTypes[ i++ ] ) ) {

					// Prepend if requested
					if ( dataType[ 0 ] === "+" ) {
						dataType = dataType.slice( 1 ) || "*";
						( structure[ dataType ] = structure[ dataType ] || [] ).unshift( func );

					// Otherwise append
					} else {
						( structure[ dataType ] = structure[ dataType ] || [] ).push( func );
					}
				}
			}
		};
	}

	// Base inspection function for prefilters and transports
	function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR ) {

		var inspected = {},
			seekingTransport = ( structure === transports );

		function inspect( dataType ) {
			var selected;
			inspected[ dataType ] = true;
			jQuery.each( structure[ dataType ] || [], function( _, prefilterOrFactory ) {
				var dataTypeOrTransport = prefilterOrFactory( options, originalOptions, jqXHR );
				if ( typeof dataTypeOrTransport === "string" &&
					!seekingTransport && !inspected[ dataTypeOrTransport ] ) {

					options.dataTypes.unshift( dataTypeOrTransport );
					inspect( dataTypeOrTransport );
					return false;
				} else if ( seekingTransport ) {
					return !( selected = dataTypeOrTransport );
				}
			} );
			return selected;
		}

		return inspect( options.dataTypes[ 0 ] ) || !inspected[ "*" ] && inspect( "*" );
	}

	// A special extend for ajax options
	// that takes "flat" options (not to be deep extended)
	// Fixes #9887
	function ajaxExtend( target, src ) {
		var key, deep,
			flatOptions = jQuery.ajaxSettings.flatOptions || {};

		for ( key in src ) {
			if ( src[ key ] !== undefined ) {
				( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
			}
		}
		if ( deep ) {
			jQuery.extend( true, target, deep );
		}

		return target;
	}

	/* Handles responses to an ajax request:
	 * - finds the right dataType (mediates between content-type and expected dataType)
	 * - returns the corresponding response
	 */
	function ajaxHandleResponses( s, jqXHR, responses ) {

		var ct, type, finalDataType, firstDataType,
			contents = s.contents,
			dataTypes = s.dataTypes;

		// Remove auto dataType and get content-type in the process
		while ( dataTypes[ 0 ] === "*" ) {
			dataTypes.shift();
			if ( ct === undefined ) {
				ct = s.mimeType || jqXHR.getResponseHeader( "Content-Type" );
			}
		}

		// Check if we're dealing with a known content-type
		if ( ct ) {
			for ( type in contents ) {
				if ( contents[ type ] && contents[ type ].test( ct ) ) {
					dataTypes.unshift( type );
					break;
				}
			}
		}

		// Check to see if we have a response for the expected dataType
		if ( dataTypes[ 0 ] in responses ) {
			finalDataType = dataTypes[ 0 ];
		} else {

			// Try convertible dataTypes
			for ( type in responses ) {
				if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[ 0 ] ] ) {
					finalDataType = type;
					break;
				}
				if ( !firstDataType ) {
					firstDataType = type;
				}
			}

			// Or just use first one
			finalDataType = finalDataType || firstDataType;
		}

		// If we found a dataType
		// We add the dataType to the list if needed
		// and return the corresponding response
		if ( finalDataType ) {
			if ( finalDataType !== dataTypes[ 0 ] ) {
				dataTypes.unshift( finalDataType );
			}
			return responses[ finalDataType ];
		}
	}

	/* Chain conversions given the request and the original response
	 * Also sets the responseXXX fields on the jqXHR instance
	 */
	function ajaxConvert( s, response, jqXHR, isSuccess ) {
		var conv2, current, conv, tmp, prev,
			converters = {},

			// Work with a copy of dataTypes in case we need to modify it for conversion
			dataTypes = s.dataTypes.slice();

		// Create converters map with lowercased keys
		if ( dataTypes[ 1 ] ) {
			for ( conv in s.converters ) {
				converters[ conv.toLowerCase() ] = s.converters[ conv ];
			}
		}

		current = dataTypes.shift();

		// Convert to each sequential dataType
		while ( current ) {

			if ( s.responseFields[ current ] ) {
				jqXHR[ s.responseFields[ current ] ] = response;
			}

			// Apply the dataFilter if provided
			if ( !prev && isSuccess && s.dataFilter ) {
				response = s.dataFilter( response, s.dataType );
			}

			prev = current;
			current = dataTypes.shift();

			if ( current ) {

			// There's only work to do if current dataType is non-auto
				if ( current === "*" ) {

					current = prev;

				// Convert response if prev dataType is non-auto and differs from current
				} else if ( prev !== "*" && prev !== current ) {

					// Seek a direct converter
					conv = converters[ prev + " " + current ] || converters[ "* " + current ];

					// If none found, seek a pair
					if ( !conv ) {
						for ( conv2 in converters ) {

							// If conv2 outputs current
							tmp = conv2.split( " " );
							if ( tmp[ 1 ] === current ) {

								// If prev can be converted to accepted input
								conv = converters[ prev + " " + tmp[ 0 ] ] ||
									converters[ "* " + tmp[ 0 ] ];
								if ( conv ) {

									// Condense equivalence converters
									if ( conv === true ) {
										conv = converters[ conv2 ];

									// Otherwise, insert the intermediate dataType
									} else if ( converters[ conv2 ] !== true ) {
										current = tmp[ 0 ];
										dataTypes.unshift( tmp[ 1 ] );
									}
									break;
								}
							}
						}
					}

					// Apply converter (if not an equivalence)
					if ( conv !== true ) {

						// Unless errors are allowed to bubble, catch and return them
						if ( conv && s.throws ) {
							response = conv( response );
						} else {
							try {
								response = conv( response );
							} catch ( e ) {
								return {
									state: "parsererror",
									error: conv ? e : "No conversion from " + prev + " to " + current
								};
							}
						}
					}
				}
			}
		}

		return { state: "success", data: response };
	}

	jQuery.extend( {

		// Counter for holding the number of active queries
		active: 0,

		// Last-Modified header cache for next request
		lastModified: {},
		etag: {},

		ajaxSettings: {
			url: location.href,
			type: "GET",
			isLocal: rlocalProtocol.test( location.protocol ),
			global: true,
			processData: true,
			async: true,
			contentType: "application/x-www-form-urlencoded; charset=UTF-8",
			/*
			timeout: 0,
			data: null,
			dataType: null,
			username: null,
			password: null,
			cache: null,
			throws: false,
			traditional: false,
			headers: {},
			*/

			accepts: {
				"*": allTypes,
				text: "text/plain",
				html: "text/html",
				xml: "application/xml, text/xml",
				json: "application/json, text/javascript"
			},

			contents: {
				xml: /\bxml\b/,
				html: /\bhtml/,
				json: /\bjson\b/
			},

			responseFields: {
				xml: "responseXML",
				text: "responseText",
				json: "responseJSON"
			},

			// Data converters
			// Keys separate source (or catchall "*") and destination types with a single space
			converters: {

				// Convert anything to text
				"* text": String,

				// Text to html (true = no transformation)
				"text html": true,

				// Evaluate text as a json expression
				"text json": jQuery.parseJSON,

				// Parse text as xml
				"text xml": jQuery.parseXML
			},

			// For options that shouldn't be deep extended:
			// you can add your own custom options here if
			// and when you create one that shouldn't be
			// deep extended (see ajaxExtend)
			flatOptions: {
				url: true,
				context: true
			}
		},

		// Creates a full fledged settings object into target
		// with both ajaxSettings and settings fields.
		// If target is omitted, writes into ajaxSettings.
		ajaxSetup: function( target, settings ) {
			return settings ?

				// Building a settings object
				ajaxExtend( ajaxExtend( target, jQuery.ajaxSettings ), settings ) :

				// Extending ajaxSettings
				ajaxExtend( jQuery.ajaxSettings, target );
		},

		ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
		ajaxTransport: addToPrefiltersOrTransports( transports ),

		// Main method
		ajax: function( url, options ) {

			// If url is an object, simulate pre-1.5 signature
			if ( typeof url === "object" ) {
				options = url;
				url = undefined;
			}

			// Force options to be an object
			options = options || {};

			var transport,

				// URL without anti-cache param
				cacheURL,

				// Response headers
				responseHeadersString,
				responseHeaders,

				// timeout handle
				timeoutTimer,

				// Url cleanup var
				urlAnchor,

				// To know if global events are to be dispatched
				fireGlobals,

				// Loop variable
				i,

				// Create the final options object
				s = jQuery.ajaxSetup( {}, options ),

				// Callbacks context
				callbackContext = s.context || s,

				// Context for global events is callbackContext if it is a DOM node or jQuery collection
				globalEventContext = s.context &&
					( callbackContext.nodeType || callbackContext.jquery ) ?
						jQuery( callbackContext ) :
						jQuery.event,

				// Deferreds
				deferred = jQuery.Deferred(),
				completeDeferred = jQuery.Callbacks( "once memory" ),

				// Status-dependent callbacks
				statusCode = s.statusCode || {},

				// Headers (they are sent all at once)
				requestHeaders = {},
				requestHeadersNames = {},

				// The jqXHR state
				state = 0,

				// Default abort message
				strAbort = "canceled",

				// Fake xhr
				jqXHR = {
					readyState: 0,

					// Builds headers hashtable if needed
					getResponseHeader: function( key ) {
						var match;
						if ( state === 2 ) {
							if ( !responseHeaders ) {
								responseHeaders = {};
								while ( ( match = rheaders.exec( responseHeadersString ) ) ) {
									responseHeaders[ match[ 1 ].toLowerCase() ] = match[ 2 ];
								}
							}
							match = responseHeaders[ key.toLowerCase() ];
						}
						return match == null ? null : match;
					},

					// Raw string
					getAllResponseHeaders: function() {
						return state === 2 ? responseHeadersString : null;
					},

					// Caches the header
					setRequestHeader: function( name, value ) {
						var lname = name.toLowerCase();
						if ( !state ) {
							name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
							requestHeaders[ name ] = value;
						}
						return this;
					},

					// Overrides response content-type header
					overrideMimeType: function( type ) {
						if ( !state ) {
							s.mimeType = type;
						}
						return this;
					},

					// Status-dependent callbacks
					statusCode: function( map ) {
						var code;
						if ( map ) {
							if ( state < 2 ) {
								for ( code in map ) {

									// Lazy-add the new callback in a way that preserves old ones
									statusCode[ code ] = [ statusCode[ code ], map[ code ] ];
								}
							} else {

								// Execute the appropriate callbacks
								jqXHR.always( map[ jqXHR.status ] );
							}
						}
						return this;
					},

					// Cancel the request
					abort: function( statusText ) {
						var finalText = statusText || strAbort;
						if ( transport ) {
							transport.abort( finalText );
						}
						done( 0, finalText );
						return this;
					}
				};

			// Attach deferreds
			deferred.promise( jqXHR ).complete = completeDeferred.add;
			jqXHR.success = jqXHR.done;
			jqXHR.error = jqXHR.fail;

			// Remove hash character (#7531: and string promotion)
			// Add protocol if not provided (prefilters might expect it)
			// Handle falsy url in the settings object (#10093: consistency with old signature)
			// We also use the url parameter if available
			s.url = ( ( url || s.url || location.href ) + "" ).replace( rhash, "" )
				.replace( rprotocol, location.protocol + "//" );

			// Alias method option to type as per ticket #12004
			s.type = options.method || options.type || s.method || s.type;

			// Extract dataTypes list
			s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().match( rnotwhite ) || [ "" ];

			// A cross-domain request is in order when the origin doesn't match the current origin.
			if ( s.crossDomain == null ) {
				urlAnchor = document.createElement( "a" );

				// Support: IE8-11+
				// IE throws exception if url is malformed, e.g. http://example.com:80x/
				try {
					urlAnchor.href = s.url;

					// Support: IE8-11+
					// Anchor's host property isn't correctly set when s.url is relative
					urlAnchor.href = urlAnchor.href;
					s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !==
						urlAnchor.protocol + "//" + urlAnchor.host;
				} catch ( e ) {

					// If there is an error parsing the URL, assume it is crossDomain,
					// it can be rejected by the transport if it is invalid
					s.crossDomain = true;
				}
			}

			// Convert data if not already a string
			if ( s.data && s.processData && typeof s.data !== "string" ) {
				s.data = jQuery.param( s.data, s.traditional );
			}

			// Apply prefilters
			inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

			// If request was aborted inside a prefilter, stop there
			if ( state === 2 ) {
				return jqXHR;
			}

			// We can fire global events as of now if asked to
			// Don't fire events if jQuery.event is undefined in an AMD-usage scenario (#15118)
			fireGlobals = jQuery.event && s.global;

			// Watch for a new set of requests
			if ( fireGlobals && jQuery.active++ === 0 ) {
				jQuery.event.trigger( "ajaxStart" );
			}

			// Uppercase the type
			s.type = s.type.toUpperCase();

			// Determine if request has content
			s.hasContent = !rnoContent.test( s.type );

			// Save the URL in case we're toying with the If-Modified-Since
			// and/or If-None-Match header later on
			cacheURL = s.url;

			// More options handling for requests with no content
			if ( !s.hasContent ) {

				// If data is available, append data to url
				if ( s.data ) {
					cacheURL = ( s.url += ( rquery.test( cacheURL ) ? "&" : "?" ) + s.data );

					// #9682: remove data so that it's not used in an eventual retry
					delete s.data;
				}

				// Add anti-cache in url if needed
				if ( s.cache === false ) {
					s.url = rts.test( cacheURL ) ?

						// If there is already a '_' parameter, set its value
						cacheURL.replace( rts, "$1_=" + nonce++ ) :

						// Otherwise add one to the end
						cacheURL + ( rquery.test( cacheURL ) ? "&" : "?" ) + "_=" + nonce++;
				}
			}

			// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
			if ( s.ifModified ) {
				if ( jQuery.lastModified[ cacheURL ] ) {
					jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ cacheURL ] );
				}
				if ( jQuery.etag[ cacheURL ] ) {
					jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ cacheURL ] );
				}
			}

			// Set the correct header, if data is being sent
			if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
				jqXHR.setRequestHeader( "Content-Type", s.contentType );
			}

			// Set the Accepts header for the server, depending on the dataType
			jqXHR.setRequestHeader(
				"Accept",
				s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[ 0 ] ] ?
					s.accepts[ s.dataTypes[ 0 ] ] +
						( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
					s.accepts[ "*" ]
			);

			// Check for headers option
			for ( i in s.headers ) {
				jqXHR.setRequestHeader( i, s.headers[ i ] );
			}

			// Allow custom headers/mimetypes and early abort
			if ( s.beforeSend &&
				( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {

				// Abort if not done already and return
				return jqXHR.abort();
			}

			// Aborting is no longer a cancellation
			strAbort = "abort";

			// Install callbacks on deferreds
			for ( i in { success: 1, error: 1, complete: 1 } ) {
				jqXHR[ i ]( s[ i ] );
			}

			// Get transport
			transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

			// If no transport, we auto-abort
			if ( !transport ) {
				done( -1, "No Transport" );
			} else {
				jqXHR.readyState = 1;

				// Send global event
				if ( fireGlobals ) {
					globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
				}

				// If request was aborted inside ajaxSend, stop there
				if ( state === 2 ) {
					return jqXHR;
				}

				// Timeout
				if ( s.async && s.timeout > 0 ) {
					timeoutTimer = window.setTimeout( function() {
						jqXHR.abort( "timeout" );
					}, s.timeout );
				}

				try {
					state = 1;
					transport.send( requestHeaders, done );
				} catch ( e ) {

					// Propagate exception as error if not done
					if ( state < 2 ) {
						done( -1, e );

					// Simply rethrow otherwise
					} else {
						throw e;
					}
				}
			}

			// Callback for when everything is done
			function done( status, nativeStatusText, responses, headers ) {
				var isSuccess, success, error, response, modified,
					statusText = nativeStatusText;

				// Called once
				if ( state === 2 ) {
					return;
				}

				// State is "done" now
				state = 2;

				// Clear timeout if it exists
				if ( timeoutTimer ) {
					window.clearTimeout( timeoutTimer );
				}

				// Dereference transport for early garbage collection
				// (no matter how long the jqXHR object will be used)
				transport = undefined;

				// Cache response headers
				responseHeadersString = headers || "";

				// Set readyState
				jqXHR.readyState = status > 0 ? 4 : 0;

				// Determine if successful
				isSuccess = status >= 200 && status < 300 || status === 304;

				// Get response data
				if ( responses ) {
					response = ajaxHandleResponses( s, jqXHR, responses );
				}

				// Convert no matter what (that way responseXXX fields are always set)
				response = ajaxConvert( s, response, jqXHR, isSuccess );

				// If successful, handle type chaining
				if ( isSuccess ) {

					// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
					if ( s.ifModified ) {
						modified = jqXHR.getResponseHeader( "Last-Modified" );
						if ( modified ) {
							jQuery.lastModified[ cacheURL ] = modified;
						}
						modified = jqXHR.getResponseHeader( "etag" );
						if ( modified ) {
							jQuery.etag[ cacheURL ] = modified;
						}
					}

					// if no content
					if ( status === 204 || s.type === "HEAD" ) {
						statusText = "nocontent";

					// if not modified
					} else if ( status === 304 ) {
						statusText = "notmodified";

					// If we have data, let's convert it
					} else {
						statusText = response.state;
						success = response.data;
						error = response.error;
						isSuccess = !error;
					}
				} else {

					// Extract error from statusText and normalize for non-aborts
					error = statusText;
					if ( status || !statusText ) {
						statusText = "error";
						if ( status < 0 ) {
							status = 0;
						}
					}
				}

				// Set data for the fake xhr object
				jqXHR.status = status;
				jqXHR.statusText = ( nativeStatusText || statusText ) + "";

				// Success/Error
				if ( isSuccess ) {
					deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
				} else {
					deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
				}

				// Status-dependent callbacks
				jqXHR.statusCode( statusCode );
				statusCode = undefined;

				if ( fireGlobals ) {
					globalEventContext.trigger( isSuccess ? "ajaxSuccess" : "ajaxError",
						[ jqXHR, s, isSuccess ? success : error ] );
				}

				// Complete
				completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

				if ( fireGlobals ) {
					globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );

					// Handle the global AJAX counter
					if ( !( --jQuery.active ) ) {
						jQuery.event.trigger( "ajaxStop" );
					}
				}
			}

			return jqXHR;
		},

		getJSON: function( url, data, callback ) {
			return jQuery.get( url, data, callback, "json" );
		},

		getScript: function( url, callback ) {
			return jQuery.get( url, undefined, callback, "script" );
		}
	} );

	jQuery.each( [ "get", "post" ], function( i, method ) {
		jQuery[ method ] = function( url, data, callback, type ) {

			// Shift arguments if data argument was omitted
			if ( jQuery.isFunction( data ) ) {
				type = type || callback;
				callback = data;
				data = undefined;
			}

			// The url can be an options object (which then must have .url)
			return jQuery.ajax( jQuery.extend( {
				url: url,
				type: method,
				dataType: type,
				data: data,
				success: callback
			}, jQuery.isPlainObject( url ) && url ) );
		};
	} );


	jQuery._evalUrl = function( url ) {
		return jQuery.ajax( {
			url: url,

			// Make this explicit, since user can override this through ajaxSetup (#11264)
			type: "GET",
			dataType: "script",
			async: false,
			global: false,
			"throws": true
		} );
	};


	jQuery.fn.extend( {
		wrapAll: function( html ) {
			var wrap;

			if ( jQuery.isFunction( html ) ) {
				return this.each( function( i ) {
					jQuery( this ).wrapAll( html.call( this, i ) );
				} );
			}

			if ( this[ 0 ] ) {

				// The elements to wrap the target around
				wrap = jQuery( html, this[ 0 ].ownerDocument ).eq( 0 ).clone( true );

				if ( this[ 0 ].parentNode ) {
					wrap.insertBefore( this[ 0 ] );
				}

				wrap.map( function() {
					var elem = this;

					while ( elem.firstElementChild ) {
						elem = elem.firstElementChild;
					}

					return elem;
				} ).append( this );
			}

			return this;
		},

		wrapInner: function( html ) {
			if ( jQuery.isFunction( html ) ) {
				return this.each( function( i ) {
					jQuery( this ).wrapInner( html.call( this, i ) );
				} );
			}

			return this.each( function() {
				var self = jQuery( this ),
					contents = self.contents();

				if ( contents.length ) {
					contents.wrapAll( html );

				} else {
					self.append( html );
				}
			} );
		},

		wrap: function( html ) {
			var isFunction = jQuery.isFunction( html );

			return this.each( function( i ) {
				jQuery( this ).wrapAll( isFunction ? html.call( this, i ) : html );
			} );
		},

		unwrap: function() {
			return this.parent().each( function() {
				if ( !jQuery.nodeName( this, "body" ) ) {
					jQuery( this ).replaceWith( this.childNodes );
				}
			} ).end();
		}
	} );


	jQuery.expr.filters.hidden = function( elem ) {
		return !jQuery.expr.filters.visible( elem );
	};
	jQuery.expr.filters.visible = function( elem ) {

		// Support: Opera <= 12.12
		// Opera reports offsetWidths and offsetHeights less than zero on some elements
		// Use OR instead of AND as the element is not visible if either is true
		// See tickets #10406 and #13132
		return elem.offsetWidth > 0 || elem.offsetHeight > 0 || elem.getClientRects().length > 0;
	};




	var r20 = /%20/g,
		rbracket = /\[\]$/,
		rCRLF = /\r?\n/g,
		rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
		rsubmittable = /^(?:input|select|textarea|keygen)/i;

	function buildParams( prefix, obj, traditional, add ) {
		var name;

		if ( jQuery.isArray( obj ) ) {

			// Serialize array item.
			jQuery.each( obj, function( i, v ) {
				if ( traditional || rbracket.test( prefix ) ) {

					// Treat each array item as a scalar.
					add( prefix, v );

				} else {

					// Item is non-scalar (array or object), encode its numeric index.
					buildParams(
						prefix + "[" + ( typeof v === "object" && v != null ? i : "" ) + "]",
						v,
						traditional,
						add
					);
				}
			} );

		} else if ( !traditional && jQuery.type( obj ) === "object" ) {

			// Serialize object item.
			for ( name in obj ) {
				buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
			}

		} else {

			// Serialize scalar item.
			add( prefix, obj );
		}
	}

	// Serialize an array of form elements or a set of
	// key/values into a query string
	jQuery.param = function( a, traditional ) {
		var prefix,
			s = [],
			add = function( key, value ) {

				// If value is a function, invoke it and return its value
				value = jQuery.isFunction( value ) ? value() : ( value == null ? "" : value );
				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
			};

		// Set traditional to true for jQuery <= 1.3.2 behavior.
		if ( traditional === undefined ) {
			traditional = jQuery.ajaxSettings && jQuery.ajaxSettings.traditional;
		}

		// If an array was passed in, assume that it is an array of form elements.
		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {

			// Serialize the form elements
			jQuery.each( a, function() {
				add( this.name, this.value );
			} );

		} else {

			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for ( prefix in a ) {
				buildParams( prefix, a[ prefix ], traditional, add );
			}
		}

		// Return the resulting serialization
		return s.join( "&" ).replace( r20, "+" );
	};

	jQuery.fn.extend( {
		serialize: function() {
			return jQuery.param( this.serializeArray() );
		},
		serializeArray: function() {
			return this.map( function() {

				// Can add propHook for "elements" to filter or add form elements
				var elements = jQuery.prop( this, "elements" );
				return elements ? jQuery.makeArray( elements ) : this;
			} )
			.filter( function() {
				var type = this.type;

				// Use .is( ":disabled" ) so that fieldset[disabled] works
				return this.name && !jQuery( this ).is( ":disabled" ) &&
					rsubmittable.test( this.nodeName ) && !rsubmitterTypes.test( type ) &&
					( this.checked || !rcheckableType.test( type ) );
			} )
			.map( function( i, elem ) {
				var val = jQuery( this ).val();

				return val == null ?
					null :
					jQuery.isArray( val ) ?
						jQuery.map( val, function( val ) {
							return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
						} ) :
						{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
			} ).get();
		}
	} );


	jQuery.ajaxSettings.xhr = function() {
		try {
			return new window.XMLHttpRequest();
		} catch ( e ) {}
	};

	var xhrSuccessStatus = {

			// File protocol always yields status code 0, assume 200
			0: 200,

			// Support: IE9
			// #1450: sometimes IE returns 1223 when it should be 204
			1223: 204
		},
		xhrSupported = jQuery.ajaxSettings.xhr();

	support.cors = !!xhrSupported && ( "withCredentials" in xhrSupported );
	support.ajax = xhrSupported = !!xhrSupported;

	jQuery.ajaxTransport( function( options ) {
		var callback, errorCallback;

		// Cross domain only allowed if supported through XMLHttpRequest
		if ( support.cors || xhrSupported && !options.crossDomain ) {
			return {
				send: function( headers, complete ) {
					var i,
						xhr = options.xhr();

					xhr.open(
						options.type,
						options.url,
						options.async,
						options.username,
						options.password
					);

					// Apply custom fields if provided
					if ( options.xhrFields ) {
						for ( i in options.xhrFields ) {
							xhr[ i ] = options.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( options.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( options.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !options.crossDomain && !headers[ "X-Requested-With" ] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Set headers
					for ( i in headers ) {
						xhr.setRequestHeader( i, headers[ i ] );
					}

					// Callback
					callback = function( type ) {
						return function() {
							if ( callback ) {
								callback = errorCallback = xhr.onload =
									xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;

								if ( type === "abort" ) {
									xhr.abort();
								} else if ( type === "error" ) {

									// Support: IE9
									// On a manual native abort, IE9 throws
									// errors on any property access that is not readyState
									if ( typeof xhr.status !== "number" ) {
										complete( 0, "error" );
									} else {
										complete(

											// File: protocol always yields status 0; see #8605, #14207
											xhr.status,
											xhr.statusText
										);
									}
								} else {
									complete(
										xhrSuccessStatus[ xhr.status ] || xhr.status,
										xhr.statusText,

										// Support: IE9 only
										// IE9 has no XHR2 but throws on binary (trac-11426)
										// For XHR2 non-text, let the caller handle it (gh-2498)
										( xhr.responseType || "text" ) !== "text"  ||
										typeof xhr.responseText !== "string" ?
											{ binary: xhr.response } :
											{ text: xhr.responseText },
										xhr.getAllResponseHeaders()
									);
								}
							}
						};
					};

					// Listen to events
					xhr.onload = callback();
					errorCallback = xhr.onerror = callback( "error" );

					// Support: IE9
					// Use onreadystatechange to replace onabort
					// to handle uncaught aborts
					if ( xhr.onabort !== undefined ) {
						xhr.onabort = errorCallback;
					} else {
						xhr.onreadystatechange = function() {

							// Check readyState before timeout as it changes
							if ( xhr.readyState === 4 ) {

								// Allow onerror to be called first,
								// but that will not handle a native abort
								// Also, save errorCallback to a variable
								// as xhr.onerror cannot be accessed
								window.setTimeout( function() {
									if ( callback ) {
										errorCallback();
									}
								} );
							}
						};
					}

					// Create the abort callback
					callback = callback( "abort" );

					try {

						// Do send the request (this may raise an exception)
						xhr.send( options.hasContent && options.data || null );
					} catch ( e ) {

						// #14683: Only rethrow if this hasn't been notified as an error yet
						if ( callback ) {
							throw e;
						}
					}
				},

				abort: function() {
					if ( callback ) {
						callback();
					}
				}
			};
		}
	} );




	// Install script dataType
	jQuery.ajaxSetup( {
		accepts: {
			script: "text/javascript, application/javascript, " +
				"application/ecmascript, application/x-ecmascript"
		},
		contents: {
			script: /\b(?:java|ecma)script\b/
		},
		converters: {
			"text script": function( text ) {
				jQuery.globalEval( text );
				return text;
			}
		}
	} );

	// Handle cache's special case and crossDomain
	jQuery.ajaxPrefilter( "script", function( s ) {
		if ( s.cache === undefined ) {
			s.cache = false;
		}
		if ( s.crossDomain ) {
			s.type = "GET";
		}
	} );

	// Bind script tag hack transport
	jQuery.ajaxTransport( "script", function( s ) {

		// This transport only deals with cross domain requests
		if ( s.crossDomain ) {
			var script, callback;
			return {
				send: function( _, complete ) {
					script = jQuery( "<script>" ).prop( {
						charset: s.scriptCharset,
						src: s.url
					} ).on(
						"load error",
						callback = function( evt ) {
							script.remove();
							callback = null;
							if ( evt ) {
								complete( evt.type === "error" ? 404 : 200, evt.type );
							}
						}
					);

					// Use native DOM manipulation to avoid our domManip AJAX trickery
					document.head.appendChild( script[ 0 ] );
				},
				abort: function() {
					if ( callback ) {
						callback();
					}
				}
			};
		}
	} );




	var oldCallbacks = [],
		rjsonp = /(=)\?(?=&|$)|\?\?/;

	// Default jsonp settings
	jQuery.ajaxSetup( {
		jsonp: "callback",
		jsonpCallback: function() {
			var callback = oldCallbacks.pop() || ( jQuery.expando + "_" + ( nonce++ ) );
			this[ callback ] = true;
			return callback;
		}
	} );

	// Detect, normalize options and install callbacks for jsonp requests
	jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

		var callbackName, overwritten, responseContainer,
			jsonProp = s.jsonp !== false && ( rjsonp.test( s.url ) ?
				"url" :
				typeof s.data === "string" &&
					( s.contentType || "" )
						.indexOf( "application/x-www-form-urlencoded" ) === 0 &&
					rjsonp.test( s.data ) && "data"
			);

		// Handle iff the expected data type is "jsonp" or we have a parameter to set
		if ( jsonProp || s.dataTypes[ 0 ] === "jsonp" ) {

			// Get callback name, remembering preexisting value associated with it
			callbackName = s.jsonpCallback = jQuery.isFunction( s.jsonpCallback ) ?
				s.jsonpCallback() :
				s.jsonpCallback;

			// Insert callback into url or form data
			if ( jsonProp ) {
				s[ jsonProp ] = s[ jsonProp ].replace( rjsonp, "$1" + callbackName );
			} else if ( s.jsonp !== false ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.jsonp + "=" + callbackName;
			}

			// Use data converter to retrieve json after script execution
			s.converters[ "script json" ] = function() {
				if ( !responseContainer ) {
					jQuery.error( callbackName + " was not called" );
				}
				return responseContainer[ 0 ];
			};

			// Force json dataType
			s.dataTypes[ 0 ] = "json";

			// Install callback
			overwritten = window[ callbackName ];
			window[ callbackName ] = function() {
				responseContainer = arguments;
			};

			// Clean-up function (fires after converters)
			jqXHR.always( function() {

				// If previous value didn't exist - remove it
				if ( overwritten === undefined ) {
					jQuery( window ).removeProp( callbackName );

				// Otherwise restore preexisting value
				} else {
					window[ callbackName ] = overwritten;
				}

				// Save back as free
				if ( s[ callbackName ] ) {

					// Make sure that re-using the options doesn't screw things around
					s.jsonpCallback = originalSettings.jsonpCallback;

					// Save the callback name for future use
					oldCallbacks.push( callbackName );
				}

				// Call if it was a function and we have a response
				if ( responseContainer && jQuery.isFunction( overwritten ) ) {
					overwritten( responseContainer[ 0 ] );
				}

				responseContainer = overwritten = undefined;
			} );

			// Delegate to script
			return "script";
		}
	} );




	// Argument "data" should be string of html
	// context (optional): If specified, the fragment will be created in this context,
	// defaults to document
	// keepScripts (optional): If true, will include scripts passed in the html string
	jQuery.parseHTML = function( data, context, keepScripts ) {
		if ( !data || typeof data !== "string" ) {
			return null;
		}
		if ( typeof context === "boolean" ) {
			keepScripts = context;
			context = false;
		}
		context = context || document;

		var parsed = rsingleTag.exec( data ),
			scripts = !keepScripts && [];

		// Single tag
		if ( parsed ) {
			return [ context.createElement( parsed[ 1 ] ) ];
		}

		parsed = buildFragment( [ data ], context, scripts );

		if ( scripts && scripts.length ) {
			jQuery( scripts ).remove();
		}

		return jQuery.merge( [], parsed.childNodes );
	};


	// Keep a copy of the old load method
	var _load = jQuery.fn.load;

	/**
	 * Load a url into a page
	 */
	jQuery.fn.load = function( url, params, callback ) {
		if ( typeof url !== "string" && _load ) {
			return _load.apply( this, arguments );
		}

		var selector, type, response,
			self = this,
			off = url.indexOf( " " );

		if ( off > -1 ) {
			selector = jQuery.trim( url.slice( off ) );
			url = url.slice( 0, off );
		}

		// If it's a function
		if ( jQuery.isFunction( params ) ) {

			// We assume that it's the callback
			callback = params;
			params = undefined;

		// Otherwise, build a param string
		} else if ( params && typeof params === "object" ) {
			type = "POST";
		}

		// If we have elements to modify, make the request
		if ( self.length > 0 ) {
			jQuery.ajax( {
				url: url,

				// If "type" variable is undefined, then "GET" method will be used.
				// Make value of this field explicit since
				// user can override it through ajaxSetup method
				type: type || "GET",
				dataType: "html",
				data: params
			} ).done( function( responseText ) {

				// Save response for use in complete callback
				response = arguments;

				self.html( selector ?

					// If a selector was specified, locate the right elements in a dummy div
					// Exclude scripts to avoid IE 'Permission Denied' errors
					jQuery( "<div>" ).append( jQuery.parseHTML( responseText ) ).find( selector ) :

					// Otherwise use the full result
					responseText );

			// If the request succeeds, this function gets "data", "status", "jqXHR"
			// but they are ignored because response was set above.
			// If it fails, this function gets "jqXHR", "status", "error"
			} ).always( callback && function( jqXHR, status ) {
				self.each( function() {
					callback.apply( this, response || [ jqXHR.responseText, status, jqXHR ] );
				} );
			} );
		}

		return this;
	};




	// Attach a bunch of functions for handling common AJAX events
	jQuery.each( [
		"ajaxStart",
		"ajaxStop",
		"ajaxComplete",
		"ajaxError",
		"ajaxSuccess",
		"ajaxSend"
	], function( i, type ) {
		jQuery.fn[ type ] = function( fn ) {
			return this.on( type, fn );
		};
	} );




	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep( jQuery.timers, function( fn ) {
			return elem === fn.elem;
		} ).length;
	};




	/**
	 * Gets a window from an element
	 */
	function getWindow( elem ) {
		return jQuery.isWindow( elem ) ? elem : elem.nodeType === 9 && elem.defaultView;
	}

	jQuery.offset = {
		setOffset: function( elem, options, i ) {
			var curPosition, curLeft, curCSSTop, curTop, curOffset, curCSSLeft, calculatePosition,
				position = jQuery.css( elem, "position" ),
				curElem = jQuery( elem ),
				props = {};

			// Set position first, in-case top/left are set even on static elem
			if ( position === "static" ) {
				elem.style.position = "relative";
			}

			curOffset = curElem.offset();
			curCSSTop = jQuery.css( elem, "top" );
			curCSSLeft = jQuery.css( elem, "left" );
			calculatePosition = ( position === "absolute" || position === "fixed" ) &&
				( curCSSTop + curCSSLeft ).indexOf( "auto" ) > -1;

			// Need to be able to calculate position if either
			// top or left is auto and position is either absolute or fixed
			if ( calculatePosition ) {
				curPosition = curElem.position();
				curTop = curPosition.top;
				curLeft = curPosition.left;

			} else {
				curTop = parseFloat( curCSSTop ) || 0;
				curLeft = parseFloat( curCSSLeft ) || 0;
			}

			if ( jQuery.isFunction( options ) ) {

				// Use jQuery.extend here to allow modification of coordinates argument (gh-1848)
				options = options.call( elem, i, jQuery.extend( {}, curOffset ) );
			}

			if ( options.top != null ) {
				props.top = ( options.top - curOffset.top ) + curTop;
			}
			if ( options.left != null ) {
				props.left = ( options.left - curOffset.left ) + curLeft;
			}

			if ( "using" in options ) {
				options.using.call( elem, props );

			} else {
				curElem.css( props );
			}
		}
	};

	jQuery.fn.extend( {
		offset: function( options ) {
			if ( arguments.length ) {
				return options === undefined ?
					this :
					this.each( function( i ) {
						jQuery.offset.setOffset( this, options, i );
					} );
			}

			var docElem, win,
				elem = this[ 0 ],
				box = { top: 0, left: 0 },
				doc = elem && elem.ownerDocument;

			if ( !doc ) {
				return;
			}

			docElem = doc.documentElement;

			// Make sure it's not a disconnected DOM node
			if ( !jQuery.contains( docElem, elem ) ) {
				return box;
			}

			box = elem.getBoundingClientRect();
			win = getWindow( doc );
			return {
				top: box.top + win.pageYOffset - docElem.clientTop,
				left: box.left + win.pageXOffset - docElem.clientLeft
			};
		},

		position: function() {
			if ( !this[ 0 ] ) {
				return;
			}

			var offsetParent, offset,
				elem = this[ 0 ],
				parentOffset = { top: 0, left: 0 };

			// Fixed elements are offset from window (parentOffset = {top:0, left: 0},
			// because it is its only offset parent
			if ( jQuery.css( elem, "position" ) === "fixed" ) {

				// Assume getBoundingClientRect is there when computed position is fixed
				offset = elem.getBoundingClientRect();

			} else {

				// Get *real* offsetParent
				offsetParent = this.offsetParent();

				// Get correct offsets
				offset = this.offset();
				if ( !jQuery.nodeName( offsetParent[ 0 ], "html" ) ) {
					parentOffset = offsetParent.offset();
				}

				// Add offsetParent borders
				parentOffset.top += jQuery.css( offsetParent[ 0 ], "borderTopWidth", true );
				parentOffset.left += jQuery.css( offsetParent[ 0 ], "borderLeftWidth", true );
			}

			// Subtract parent offsets and element margins
			return {
				top: offset.top - parentOffset.top - jQuery.css( elem, "marginTop", true ),
				left: offset.left - parentOffset.left - jQuery.css( elem, "marginLeft", true )
			};
		},

		// This method will return documentElement in the following cases:
		// 1) For the element inside the iframe without offsetParent, this method will return
		//    documentElement of the parent window
		// 2) For the hidden or detached element
		// 3) For body or html element, i.e. in case of the html node - it will return itself
		//
		// but those exceptions were never presented as a real life use-cases
		// and might be considered as more preferable results.
		//
		// This logic, however, is not guaranteed and can change at any point in the future
		offsetParent: function() {
			return this.map( function() {
				var offsetParent = this.offsetParent;

				while ( offsetParent && jQuery.css( offsetParent, "position" ) === "static" ) {
					offsetParent = offsetParent.offsetParent;
				}

				return offsetParent || documentElement;
			} );
		}
	} );

	// Create scrollLeft and scrollTop methods
	jQuery.each( { scrollLeft: "pageXOffset", scrollTop: "pageYOffset" }, function( method, prop ) {
		var top = "pageYOffset" === prop;

		jQuery.fn[ method ] = function( val ) {
			return access( this, function( elem, method, val ) {
				var win = getWindow( elem );

				if ( val === undefined ) {
					return win ? win[ prop ] : elem[ method ];
				}

				if ( win ) {
					win.scrollTo(
						!top ? val : win.pageXOffset,
						top ? val : win.pageYOffset
					);

				} else {
					elem[ method ] = val;
				}
			}, method, val, arguments.length );
		};
	} );

	// Support: Safari<7-8+, Chrome<37-44+
	// Add the top/left cssHooks using jQuery.fn.position
	// Webkit bug: https://bugs.webkit.org/show_bug.cgi?id=29084
	// Blink bug: https://code.google.com/p/chromium/issues/detail?id=229280
	// getComputedStyle returns percent when specified for top/left/bottom/right;
	// rather than make the css module depend on the offset module, just check for it here
	jQuery.each( [ "top", "left" ], function( i, prop ) {
		jQuery.cssHooks[ prop ] = addGetHookIf( support.pixelPosition,
			function( elem, computed ) {
				if ( computed ) {
					computed = curCSS( elem, prop );

					// If curCSS returns percentage, fallback to offset
					return rnumnonpx.test( computed ) ?
						jQuery( elem ).position()[ prop ] + "px" :
						computed;
				}
			}
		);
	} );


	// Create innerHeight, innerWidth, height, width, outerHeight and outerWidth methods
	jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
		jQuery.each( { padding: "inner" + name, content: type, "": "outer" + name },
			function( defaultExtra, funcName ) {

			// Margin is only for outerHeight, outerWidth
			jQuery.fn[ funcName ] = function( margin, value ) {
				var chainable = arguments.length && ( defaultExtra || typeof margin !== "boolean" ),
					extra = defaultExtra || ( margin === true || value === true ? "margin" : "border" );

				return access( this, function( elem, type, value ) {
					var doc;

					if ( jQuery.isWindow( elem ) ) {

						// As of 5/8/2012 this will yield incorrect results for Mobile Safari, but there
						// isn't a whole lot we can do. See pull request at this URL for discussion:
						// https://github.com/jquery/jquery/pull/764
						return elem.document.documentElement[ "client" + name ];
					}

					// Get document width or height
					if ( elem.nodeType === 9 ) {
						doc = elem.documentElement;

						// Either scroll[Width/Height] or offset[Width/Height] or client[Width/Height],
						// whichever is greatest
						return Math.max(
							elem.body[ "scroll" + name ], doc[ "scroll" + name ],
							elem.body[ "offset" + name ], doc[ "offset" + name ],
							doc[ "client" + name ]
						);
					}

					return value === undefined ?

						// Get width or height on the element, requesting but not forcing parseFloat
						jQuery.css( elem, type, extra ) :

						// Set width or height on the element
						jQuery.style( elem, type, value, extra );
				}, type, chainable ? margin : undefined, chainable, null );
			};
		} );
	} );


	jQuery.fn.extend( {

		bind: function( types, data, fn ) {
			return this.on( types, null, data, fn );
		},
		unbind: function( types, fn ) {
			return this.off( types, null, fn );
		},

		delegate: function( selector, types, data, fn ) {
			return this.on( types, selector, data, fn );
		},
		undelegate: function( selector, types, fn ) {

			// ( namespace ) or ( selector, types [, fn] )
			return arguments.length === 1 ?
				this.off( selector, "**" ) :
				this.off( types, selector || "**", fn );
		},
		size: function() {
			return this.length;
		}
	} );

	jQuery.fn.andSelf = jQuery.fn.addBack;




	// Register as a named AMD module, since jQuery can be concatenated with other
	// files that may use define, but not via a proper concatenation script that
	// understands anonymous AMD modules. A named AMD is safest and most robust
	// way to register. Lowercase jquery is used because AMD module names are
	// derived from file names, and jQuery is normally delivered in a lowercase
	// file name. Do this after creating the global so that if an AMD module wants
	// to call noConflict to hide this version of jQuery, it will work.

	// Note that for maximum portability, libraries that are not jQuery should
	// declare themselves as anonymous modules, and avoid setting a global if an
	// AMD loader is present. jQuery is a special case. For more information, see
	// https://github.com/jrburke/requirejs/wiki/Updating-existing-libraries#wiki-anon

	if ( true ) {
		!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
			return jQuery;
		}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	}



	var

		// Map over jQuery in case of overwrite
		_jQuery = window.jQuery,

		// Map over the $ in case of overwrite
		_$ = window.$;

	jQuery.noConflict = function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	};

	// Expose jQuery and $ identifiers, even in AMD
	// (#7102#comment:10, https://github.com/jquery/jquery/pull/557)
	// and CommonJS for browser emulators (#13566)
	if ( !noGlobal ) {
		window.jQuery = window.$ = jQuery;
	}

	return jQuery;
	}));


/***/ }),
/* 28 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/*!
	 * jQuery Mousewheel 3.1.13
	 *
	 * Copyright jQuery Foundation and other contributors
	 * Released under the MIT license
	 * http://jquery.org/license
	 */

	(function (factory) {
	    if ( true ) {
	        // AMD. Register as an anonymous module.
	        !(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(27)], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	    } else if (typeof exports === 'object') {
	        // Node/CommonJS style for Browserify
	        module.exports = factory;
	    } else {
	        // Browser globals
	        factory(jQuery);
	    }
	}(function ($) {

	    var toFix  = ['wheel', 'mousewheel', 'DOMMouseScroll', 'MozMousePixelScroll'],
	        toBind = ( 'onwheel' in document || document.documentMode >= 9 ) ?
	                    ['wheel'] : ['mousewheel', 'DomMouseScroll', 'MozMousePixelScroll'],
	        slice  = Array.prototype.slice,
	        nullLowestDeltaTimeout, lowestDelta;

	    if ( $.event.fixHooks ) {
	        for ( var i = toFix.length; i; ) {
	            $.event.fixHooks[ toFix[--i] ] = $.event.mouseHooks;
	        }
	    }

	    var special = $.event.special.mousewheel = {
	        version: '3.1.12',

	        setup: function() {
	            if ( this.addEventListener ) {
	                for ( var i = toBind.length; i; ) {
	                    this.addEventListener( toBind[--i], handler, false );
	                }
	            } else {
	                this.onmousewheel = handler;
	            }
	            // Store the line height and page height for this particular element
	            $.data(this, 'mousewheel-line-height', special.getLineHeight(this));
	            $.data(this, 'mousewheel-page-height', special.getPageHeight(this));
	        },

	        teardown: function() {
	            if ( this.removeEventListener ) {
	                for ( var i = toBind.length; i; ) {
	                    this.removeEventListener( toBind[--i], handler, false );
	                }
	            } else {
	                this.onmousewheel = null;
	            }
	            // Clean up the data we added to the element
	            $.removeData(this, 'mousewheel-line-height');
	            $.removeData(this, 'mousewheel-page-height');
	        },

	        getLineHeight: function(elem) {
	            var $elem = $(elem),
	                $parent = $elem['offsetParent' in $.fn ? 'offsetParent' : 'parent']();
	            if (!$parent.length) {
	                $parent = $('body');
	            }
	            return parseInt($parent.css('fontSize'), 10) || parseInt($elem.css('fontSize'), 10) || 16;
	        },

	        getPageHeight: function(elem) {
	            return $(elem).height();
	        },

	        settings: {
	            adjustOldDeltas: true, // see shouldAdjustOldDeltas() below
	            normalizeOffset: true  // calls getBoundingClientRect for each event
	        }
	    };

	    $.fn.extend({
	        mousewheel: function(fn) {
	            return fn ? this.bind('mousewheel', fn) : this.trigger('mousewheel');
	        },

	        unmousewheel: function(fn) {
	            return this.unbind('mousewheel', fn);
	        }
	    });


	    function handler(event) {
	        var orgEvent   = event || window.event,
	            args       = slice.call(arguments, 1),
	            delta      = 0,
	            deltaX     = 0,
	            deltaY     = 0,
	            absDelta   = 0,
	            offsetX    = 0,
	            offsetY    = 0;
	        event = $.event.fix(orgEvent);
	        event.type = 'mousewheel';

	        // Old school scrollwheel delta
	        if ( 'detail'      in orgEvent ) { deltaY = orgEvent.detail * -1;      }
	        if ( 'wheelDelta'  in orgEvent ) { deltaY = orgEvent.wheelDelta;       }
	        if ( 'wheelDeltaY' in orgEvent ) { deltaY = orgEvent.wheelDeltaY;      }
	        if ( 'wheelDeltaX' in orgEvent ) { deltaX = orgEvent.wheelDeltaX * -1; }

	        // Firefox < 17 horizontal scrolling related to DOMMouseScroll event
	        if ( 'axis' in orgEvent && orgEvent.axis === orgEvent.HORIZONTAL_AXIS ) {
	            deltaX = deltaY * -1;
	            deltaY = 0;
	        }

	        // Set delta to be deltaY or deltaX if deltaY is 0 for backwards compatabilitiy
	        delta = deltaY === 0 ? deltaX : deltaY;

	        // New school wheel delta (wheel event)
	        if ( 'deltaY' in orgEvent ) {
	            deltaY = orgEvent.deltaY * -1;
	            delta  = deltaY;
	        }
	        if ( 'deltaX' in orgEvent ) {
	            deltaX = orgEvent.deltaX;
	            if ( deltaY === 0 ) { delta  = deltaX * -1; }
	        }

	        // No change actually happened, no reason to go any further
	        if ( deltaY === 0 && deltaX === 0 ) { return; }

	        // Need to convert lines and pages to pixels if we aren't already in pixels
	        // There are three delta modes:
	        //   * deltaMode 0 is by pixels, nothing to do
	        //   * deltaMode 1 is by lines
	        //   * deltaMode 2 is by pages
	        if ( orgEvent.deltaMode === 1 ) {
	            var lineHeight = $.data(this, 'mousewheel-line-height');
	            delta  *= lineHeight;
	            deltaY *= lineHeight;
	            deltaX *= lineHeight;
	        } else if ( orgEvent.deltaMode === 2 ) {
	            var pageHeight = $.data(this, 'mousewheel-page-height');
	            delta  *= pageHeight;
	            deltaY *= pageHeight;
	            deltaX *= pageHeight;
	        }

	        // Store lowest absolute delta to normalize the delta values
	        absDelta = Math.max( Math.abs(deltaY), Math.abs(deltaX) );

	        if ( !lowestDelta || absDelta < lowestDelta ) {
	            lowestDelta = absDelta;

	            // Adjust older deltas if necessary
	            if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
	                lowestDelta /= 40;
	            }
	        }

	        // Adjust older deltas if necessary
	        if ( shouldAdjustOldDeltas(orgEvent, absDelta) ) {
	            // Divide all the things by 40!
	            delta  /= 40;
	            deltaX /= 40;
	            deltaY /= 40;
	        }

	        // Get a whole, normalized value for the deltas
	        delta  = Math[ delta  >= 1 ? 'floor' : 'ceil' ](delta  / lowestDelta);
	        deltaX = Math[ deltaX >= 1 ? 'floor' : 'ceil' ](deltaX / lowestDelta);
	        deltaY = Math[ deltaY >= 1 ? 'floor' : 'ceil' ](deltaY / lowestDelta);

	        // Normalise offsetX and offsetY properties
	        if ( special.settings.normalizeOffset && this.getBoundingClientRect ) {
	            var boundingRect = this.getBoundingClientRect();
	            offsetX = event.clientX - boundingRect.left;
	            offsetY = event.clientY - boundingRect.top;
	        }

	        // Add information to the event object
	        event.deltaX = deltaX;
	        event.deltaY = deltaY;
	        event.deltaFactor = lowestDelta;
	        event.offsetX = offsetX;
	        event.offsetY = offsetY;
	        // Go ahead and set deltaMode to 0 since we converted to pixels
	        // Although this is a little odd since we overwrite the deltaX/Y
	        // properties with normalized deltas.
	        event.deltaMode = 0;

	        // Add event and delta to the front of the arguments
	        args.unshift(event, delta, deltaX, deltaY);

	        // Clearout lowestDelta after sometime to better
	        // handle multiple device types that give different
	        // a different lowestDelta
	        // Ex: trackpad = 3 and mouse wheel = 120
	        if (nullLowestDeltaTimeout) { clearTimeout(nullLowestDeltaTimeout); }
	        nullLowestDeltaTimeout = setTimeout(nullLowestDelta, 200);

	        return ($.event.dispatch || $.event.handle).apply(this, args);
	    }

	    function nullLowestDelta() {
	        lowestDelta = null;
	    }

	    function shouldAdjustOldDeltas(orgEvent, absDelta) {
	        // If this is an older event and the delta is divisable by 120,
	        // then we are assuming that the browser is treating this as an
	        // older mouse wheel event and that we should divide the deltas
	        // by 40 to try and get a more usable deltaFactor.
	        // Side note, this actually impacts the reported scroll distance
	        // in older browsers and can cause scrolling to be slower than native.
	        // Turn this off by setting $.event.special.mousewheel.settings.adjustOldDeltas to false.
	        return special.settings.adjustOldDeltas && orgEvent.type === 'mousewheel' && absDelta % 120 === 0;
	    }

	}));


/***/ }),
/* 29 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(30), __webpack_require__(40), __webpack_require__(55)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Piano, Sampler, Synth) {

		var Player = function(){

			//instances of all three instruments
			this._synth = new Synth();

			this._piano = new Piano();

			this._sampler = new Sampler();

			this._currentInstrument = this._synth;
		};

		Player.prototype.setInstrument = function(inst, buffer){
			this.releaseAll();
			switch(inst){
				case "piano" : 
					this._piano.load();
					this._currentInstrument = this._piano;
					break;
				case "synth" : 
					this._currentInstrument = this._synth;
					break;
				case "sampler" : 
					this._currentInstrument = this._sampler;
					break;
			}
		};

		Player.prototype.setBuffer = function(buffer, duration, onset){
			this._sampler.setBuffer(buffer, duration, onset);
		};

		Player.prototype.triggerAttackRelease = function(note, duration, time, velocity){
			//make it quieter and randomize the velocity slightly
			velocity = velocity * 0.5 + Math.random() * 0.5;
			velocity *= 0.5;
			this._currentInstrument.triggerAttackRelease(note, duration, time, velocity);
		};

		Player.prototype.releaseAll = function(){
			//release all
			this._currentInstrument.releaseAll();
		};

		return Player;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 30 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(31), __webpack_require__(32), __webpack_require__(5), __webpack_require__(35)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Buffer, Loader, Transport, MultiPlayer) {

		var Piano = function(){

			this._piano = new MultiPlayer("https://gweb-musiclab-site.appspot.com/static/sound/piano", "A0", "C8", 3);

			this._allLoaded = false;

			this._transportWasStarted = false;

			Buffer.on("load", this._onload.bind(this));

			this._loader = null;
		};

		Piano.prototype.triggerAttackRelease = function(note, duration, time, vel){
			if (this._allLoaded){
				this._piano.triggerAttackRelease(note, duration, time, vel);
			}
		};

		Piano.prototype.releaseAll = function(){
			this._piano.releaseAll();
		};

		Piano.prototype.load = function(){
			if (!this._allLoaded){
				this._loader = new Loader("piano");
				this._piano.load();
				this._transportWasStarted = Transport.state === "started";
				if (this._transportWasStarted){
					Transport.pause();
				}
			}
		};

		Piano.prototype._onload = function(){
			this._allLoaded = true;
			this._loader.resolve();
			if (this._transportWasStarted){
				Transport.start();
				this._transportWasStarted = false;
			}
		};

		return Piano;

	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 31 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(17)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Buffer loading and storage. Tone.Buffer is used internally by all 
		 *          classes that make requests for audio files such as Tone.Player,
		 *          Tone.Sampler and Tone.Convolver.
		 *          <br><br>
		 *          Aside from load callbacks from individual buffers, Tone.Buffer 
		 *  		provides static methods which keep track of the loading progress 
		 *  		of all of the buffers. These methods are Tone.Buffer.onload, Tone.Buffer.onprogress,
		 *  		and Tone.Buffer.onerror. 
		 *
		 *  @constructor 
		 *  @extends {Tone}
		 *  @param {AudioBuffer|string} url The url to load, or the audio buffer to set. 
		 *  @param {function=} onload A callback which is invoked after the buffer is loaded. 
		 *                            It's recommended to use Tone.Buffer.onload instead 
		 *                            since it will give you a callback when ALL buffers are loaded.
		 *  @example
		 * var buffer = new Tone.Buffer("path/to/sound.mp3", function(){
		 * 	//the buffer is now available.
		 * 	var buff = buffer.get();
		 * });
		 */
		Tone.Buffer = function(){

			var options = this.optionsObject(arguments, ["url", "onload"], Tone.Buffer.defaults);

			/**
			 *  stores the loaded AudioBuffer
			 *  @type {AudioBuffer}
			 *  @private
			 */
			this._buffer = null;

			/**
			 *  indicates if the buffer should be reversed or not
			 *  @type {boolean}
			 *  @private
			 */
			this._reversed = options.reverse;

			/**
			 *  The url of the buffer. <code>undefined</code> if it was 
			 *  constructed with a buffer
			 *  @type {string}
			 *  @readOnly
			 */
			this.url = undefined;

			/**
			 *  Indicates if the buffer is loaded or not. 
			 *  @type {boolean}
			 *  @readOnly
			 */
			this.loaded = false;

			/**
			 *  The callback to invoke when everything is loaded. 
			 *  @type {function}
			 */
			this.onload = options.onload.bind(this, this);

			if (options.url instanceof AudioBuffer || options.url instanceof Tone.Buffer){
				this.set(options.url);
				this.onload(this);
			} else if (this.isString(options.url)){
				this.url = options.url;
				Tone.Buffer._addToQueue(options.url, this);
			}
		};

		Tone.extend(Tone.Buffer);

		/**
		 *  the default parameters
		 *  @type {Object}
		 */
		Tone.Buffer.defaults = {
			"url" : undefined,
			"onload" : Tone.noOp,
			"reverse" : false
		};

		/**
		 *  Pass in an AudioBuffer or Tone.Buffer to set the value
		 *  of this buffer.
		 *  @param {AudioBuffer|Tone.Buffer} buffer the buffer
		 *  @returns {Tone.Buffer} this
		 */
		Tone.Buffer.prototype.set = function(buffer){
			if (buffer instanceof Tone.Buffer){
				this._buffer = buffer.get();
			} else {
				this._buffer = buffer;
			}
			this.loaded = true;
			return this;
		};

		/**
		 *  @return {AudioBuffer} The audio buffer stored in the object.
		 */
		Tone.Buffer.prototype.get = function(){
			return this._buffer;
		};

		/**
		 *  Load url into the buffer. 
		 *  @param {String} url The url to load
		 *  @param {Function=} callback The callback to invoke on load. 
		 *                              don't need to set if `onload` is
		 *                              already set.
		 *  @returns {Tone.Buffer} this
		 */
		Tone.Buffer.prototype.load = function(url, callback){
			this.url = url;
			this.onload = this.defaultArg(callback, this.onload);
			Tone.Buffer._addToQueue(url, this);
			return this;
		};

		/**
		 *  dispose and disconnect
		 *  @returns {Tone.Buffer} this
		 */
		Tone.Buffer.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			Tone.Buffer._removeFromQueue(this);
			this._buffer = null;
			this.onload = Tone.Buffer.defaults.onload;
			return this;
		};

		/**
		 * The duration of the buffer. 
		 * @memberOf Tone.Buffer#
		 * @type {number}
		 * @name duration
		 * @readOnly
		 */
		Object.defineProperty(Tone.Buffer.prototype, "duration", {
			get : function(){
				if (this._buffer){
					return this._buffer.duration;
				} else {
					return 0;
				}
			},
		});

		/**
		 *  Reverse the buffer.
		 *  @private
		 *  @return {Tone.Buffer} this
		 */
		Tone.Buffer.prototype._reverse = function(){
			if (this.loaded){
				for (var i = 0; i < this._buffer.numberOfChannels; i++){
					Array.prototype.reverse.call(this._buffer.getChannelData(i));
				}
			}
			return this;
		};

		/**
		 * Reverse the buffer.
		 * @memberOf Tone.Buffer#
		 * @type {boolean}
		 * @name reverse
		 */
		Object.defineProperty(Tone.Buffer.prototype, "reverse", {
			get : function(){
				return this._reversed;
			},
			set : function(rev){
				if (this._reversed !== rev){
					this._reversed = rev;
					this._reverse();
				}
			},
		});

		///////////////////////////////////////////////////////////////////////////
		// STATIC METHODS
		///////////////////////////////////////////////////////////////////////////

		//statically inherits Emitter methods
		Tone.Emitter.mixin(Tone.Buffer);
		 
		/**
		 *  the static queue for all of the xhr requests
		 *  @type {Array}
		 *  @private
		 */
		Tone.Buffer._queue = [];

		/**
		 *  the array of current downloads
		 *  @type {Array}
		 *  @private
		 */
		Tone.Buffer._currentDownloads = [];

		/**
		 *  the total number of downloads
		 *  @type {number}
		 *  @private
		 */
		Tone.Buffer._totalDownloads = 0;

		/**
		 *  the maximum number of simultaneous downloads
		 *  @static
		 *  @type {number}
		 */
		Tone.Buffer.MAX_SIMULTANEOUS_DOWNLOADS = 6;
		
		/**
		 *  Adds a file to be loaded to the loading queue
		 *  @param   {string}   url      the url to load
		 *  @param   {function} callback the callback to invoke once it's loaded
		 *  @private
		 */
		Tone.Buffer._addToQueue = function(url, buffer){
			Tone.Buffer._queue.push({
				url : url,
				Buffer : buffer,
				progress : 0,
				xhr : null
			});
			this._totalDownloads++;
			Tone.Buffer._next();
		};

		/**
		 *  Remove an object from the queue's (if it's still there)
		 *  Abort the XHR if it's in progress
		 *  @param {Tone.Buffer} buffer the buffer to remove
		 *  @private
		 */
		Tone.Buffer._removeFromQueue = function(buffer){
			var i;
			for (i = 0; i < Tone.Buffer._queue.length; i++){
				var q = Tone.Buffer._queue[i];
				if (q.Buffer === buffer){
					Tone.Buffer._queue.splice(i, 1);
				}
			}
			for (i = 0; i < Tone.Buffer._currentDownloads.length; i++){
				var dl = Tone.Buffer._currentDownloads[i];
				if (dl.Buffer === buffer){
					Tone.Buffer._currentDownloads.splice(i, 1);
					dl.xhr.abort();
					dl.xhr.onprogress = null;
					dl.xhr.onload = null;
					dl.xhr.onerror = null;
				}
			}
		};

		/**
		 *  load the next buffer in the queue
		 *  @private
		 */
		Tone.Buffer._next = function(){
			if (Tone.Buffer._queue.length > 0){
				if (Tone.Buffer._currentDownloads.length < Tone.Buffer.MAX_SIMULTANEOUS_DOWNLOADS){
					var next = Tone.Buffer._queue.shift();
					Tone.Buffer._currentDownloads.push(next);
					next.xhr = Tone.Buffer.load(next.url, function(buffer){
						//remove this one from the queue
						var index = Tone.Buffer._currentDownloads.indexOf(next);
						Tone.Buffer._currentDownloads.splice(index, 1);
						next.Buffer.set(buffer);
						if (next.Buffer._reversed){
							next.Buffer._reverse();
						}
						next.Buffer.onload(next.Buffer);
						Tone.Buffer._onprogress();
						Tone.Buffer._next();
					});
					next.xhr.onprogress = function(event){
						next.progress = event.loaded / event.total;
						Tone.Buffer._onprogress();
					};
					next.xhr.onerror = function(e){
						Tone.Buffer.trigger("error", e);
					};
				} 
			} else if (Tone.Buffer._currentDownloads.length === 0){
				Tone.Buffer.trigger("load");
				//reset the downloads
				Tone.Buffer._totalDownloads = 0;
			}
		};

		/**
		 *  internal progress event handler
		 *  @private
		 */
		Tone.Buffer._onprogress = function(){
			var curretDownloadsProgress = 0;
			var currentDLLen = Tone.Buffer._currentDownloads.length;
			var inprogress = 0;
			if (currentDLLen > 0){
				for (var i = 0; i < currentDLLen; i++){
					var dl = Tone.Buffer._currentDownloads[i];
					curretDownloadsProgress += dl.progress;
				}
				inprogress = curretDownloadsProgress;
			}
			var currentDownloadProgress = currentDLLen - inprogress;
			var completed = Tone.Buffer._totalDownloads - Tone.Buffer._queue.length - currentDownloadProgress;
			Tone.Buffer.trigger("progress", completed / Tone.Buffer._totalDownloads);
		};

		/**
		 *  Makes an xhr reqest for the selected url then decodes
		 *  the file as an audio buffer. Invokes
		 *  the callback once the audio buffer loads.
		 *  @param {string} url The url of the buffer to load.
		 *                      filetype support depends on the
		 *                      browser.
		 *  @param {function} callback The function to invoke when the url is loaded. 
		 *  @returns {XMLHttpRequest} returns the XHR
		 */
		Tone.Buffer.load = function(url, callback){
			var request = new XMLHttpRequest();
			request.open("GET", url, true);
			request.responseType = "arraybuffer";
			// decode asynchronously
			request.onload = function() {
				Tone.context.decodeAudioData(request.response, function(buff) {
					if(!buff){
						throw new Error("could not decode audio data:" + url);
					}
					callback(buff);
				});
			};
			//send the request
			request.send();
			return request;
		};

		return Tone.Buffer;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 32 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(33)], __WEBPACK_AMD_DEFINE_RESULT__ = function (loadStyle) {

		var Loader = function(type, info){

			this._loadingScreen = document.createElement("DIV");
			this._loadingScreen.id = "LoadingScreen";
			this._loadingScreen.classList.add("Visible");
			document.body.appendChild(this._loadingScreen);

			this._minLoadTime = 500;

			this._GIF = document.createElement("DIV");
			this._GIF.id = "GIF";
			this._loadingScreen.appendChild(this._GIF);

			if (type === "piano") {
				this._GIF.classList.add("icon-svg_piano");
			}

			this._spinner  = document.createElement("div");
			this._spinner.innerHTML = '<svg class="Spinner" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg"><circle class="Circle" fill="none" stroke-width="3" stroke-linecap="round" cx="33" cy="33" r="30"></circle></svg>';
			this._GIF.appendChild(this._spinner);


			this._scoreText = document.createElement("DIV");
			this._scoreText.id = "Text";
			this._loadingScreen.appendChild(this._scoreText);

			if (type === "score"){
				// this._scoreText.innerHTML = info.composer + "<br>" + info.name;	
			}

			this._loadStart = Date.now();
		};

		Loader.prototype.resolve = function(){
			var elapsedTime = Date.now() - this._loadStart;
			if (elapsedTime < this._minLoadTime){
				setTimeout(this.resolve.bind(this), this._minLoadTime - elapsedTime + 10);
			} else {
				//remove the visibility
				this._loadingScreen.classList.remove("Visible");
				setTimeout(function(){
					this._loadingScreen.remove();
				}.bind(this), 500);
			}
		};

		return Loader;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 33 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(34);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./loading.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./loading.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 34 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, "/** \r\n *  SIZING\r\n */\n#LoadingScreen {\n  width: 100%;\n  height: 100%;\n  position: absolute;\n  z-index: 10000;\n  background-color: white;\n  top: 0px;\n  left: 0px;\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 0.3s; }\n  #LoadingScreen #GIF:before {\n    position: absolute; }\n  #LoadingScreen #GIF {\n    position: absolute;\n    width: 100px;\n    height: 100px;\n    top: 50%;\n    left: 50%;\n    background-size: 100% 100%;\n    margin-top: -50px;\n    margin-left: -50px;\n    font-size: 100px;\n    line-height: 100px;\n    color: #666666; }\n    #LoadingScreen #GIF .Spinner {\n      animation: rotation 1.4s linear infinite;\n      stroke: #cbcbcb;\n      width: 100px;\n      height: 100px; }\n\n@keyframes rotation {\n  0% {\n    transform: rotate(0deg); }\n  100% {\n    transform: rotate(270deg); } }\n    #LoadingScreen #GIF .Circle {\n      stroke-dasharray: 187;\n      stroke-dashoffset: 0;\n      transform-origin: center;\n      animation: turn 1.4s ease-in-out infinite; }\n\n@keyframes turn {\n  0% {\n    stroke-dashoffset: 187; }\n  50% {\n    stroke-dashoffset: 46.75;\n    transform: rotate(135deg); }\n  100% {\n    stroke-dashoffset: 187;\n    transform: rotate(450deg); } }\n  #LoadingScreen #Text {\n    position: absolute;\n    bottom: 50%;\n    left: 0px;\n    width: 100%;\n    text-align: center;\n    height: auto;\n    padding-bottom: 30px;\n    font-family: \"Roboto\";\n    font-size: 24px;\n    font-weight: 300;\n    line-height: 40px; }\n\n#LoadingScreen.Visible {\n  opacity: 1;\n  pointer-events: initial;\n  transition: opacity 0.1s; }\n", ""]);

	// exports


/***/ }),
/* 35 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(36), __webpack_require__(39), __webpack_require__(37), __webpack_require__(31)], __WEBPACK_AMD_DEFINE_RESULT__ = function (MultiPlayer, Notes, Master, Buffer) {

		/**
		 * A sample player
		 * @param {String} folder      The folder where all the samples are contained
		 * @param {String} lowestNote 
		 * @param {String} highestNote
		 */
		var Player = function(folder, lowestNote, highestNote, steps){

			/**
			 * The multibuffer player
			 * @type {Tone.MultiPlayer}
			 * @private
			 */
			this._multiPlayer = new MultiPlayer().toMaster();

			/**
			 * the instrument folder
			 * @type {String}
			 * @private
			 */
			this._instrumentFolder = folder;

			/**
			 * The lowest note playable
			 * @type {String}
			 * @private
			 */
			this._lowestNote = lowestNote;

			/**
			 * The highest note playable
			 * @type {String}
			 * @private
			 */
			this._highestNote = highestNote;

			/**
			 * The number of chromaitc steps (up and down) which the sample 
			 * will be repitched
			 * @type {Number}
			 * @private
			 */
			this._stepSize = steps || 4;

			/**
			 * The number of buffers currently 
			 * loading.
			 * @type {Number}
			 * @private
			 */
			this._loadCount = 0;

			/**
			 * The sample lookup. Each note mapes to a buffer and a playbackRate
			 * @type {Object}
			 * @private
			 */
			this._notes = {};

			/**
			 * All the buffers
			 * @type {Object}
			 * @private
			 */
			this._buffers = {};

			/**
			 * The time it takes for the note to release
			 * @type {Number}
			 * @private
			 */
			this._releaseTime = 0.5;

			/**
			 * if all the samples are loaded
			 * @type {Boolean}
			 */
			this.loaded = false;

			//callback when loaded
			this.onload = function(){};
		};

		/**
		 * Load all the buffers
		 */
		Player.prototype.load = function(){
			//get all the samples between lowest and highest notes
			var allNotes = Notes.getNotes(this._lowestNote, this._highestNote);

			//get the samples to load
			for (var i = 0; i < allNotes.length; i+=this._stepSize * 2 + 1){
				var end = Math.max(this._stepSize * 2 + 1, allNotes.length);
				var bufferPitch = allNotes[i + this._stepSize];
				if (typeof bufferPitch !== "undefined"){
					//create the buffer
					this._loadCount+=1;
					var buff = new Buffer(this._instrumentFolder + "/" + bufferPitch + ".mp3", this._loadedBuffer.bind(this));
					// this._buffers[bufferPitch] = buff;
					this._multiPlayer.addBuffer(bufferPitch, buff);
					for (var j = i; j < end; j++){
						var note = allNotes[j];
						this._notes[note] = {
							"interval" : (j - i - this._stepSize),
							"buffer" : bufferPitch,
						};
						//and the respelling if it exists
						var respelling = Notes.getRespelling(note);
						if (respelling){
							this._notes[respelling] = this._notes[note];
						}	
					}
				}
			}
		};

		/**
		 * internal callback when a sample is loaded
		 * @private
		 */
		Player.prototype._loadedBuffer = function(){
			this._loadCount-=1;
			if (this._loadCount === 0){
				this.loaded = true;
				this.onload();
			}
		};

		/**
		 * Trigger the attack and release of the note
		 * @param  {String} note
		 * @param  {Number} duration The held duration in seconds
		 * @param  {Number} time     When the note should trigger
		 */
		Player.prototype.triggerAttackRelease = function(note, duration, time, velocity){
			var description = this._notes[note];
			this._multiPlayer.start(description.buffer, time, {
				playbackRate : this._multiPlayer.intervalToFrequencyRatio(description.interval),
				release : this._releaseTime,
				duration : duration,
				gain : velocity
			});
		};

		/**
		 * Trigger the attack of the note
		 * @param  {String} note
		 * @param  {Number} time     When the note should trigger
		 */
		Player.prototype.triggerAttack = function(note, time){

			var description = this._notes[note];

			/*this._multiPlayer.start(description.buffer, time, {
				playbackRate : this._multiPlayer.intervalToFrequencyRatio(description.interval),
				release : this._releaseTime
			});*/

			// var buffer = this._buffers[description.buffer];

			/*time = toneInstance.toSeconds(time);

			var description = this._notes[note];
			var buffer = this._buffers[description.buffer];

			var amp = Tone.context.createGain();
			amp.connect(this._output);
			amp.gain.value = 1;
			var source = Tone.context.createBufferSource();
			source.connect(amp);
			source.buffer = buffer.get();
			source.playbackRate.value = toneInstance.intervalToFrequencyRatio(description.interval);
			source.start(time);
			this._activeNotes[note] = amp;*/
		};

		/**
		 * Release a note
		 * @param  {String} note
		 * @param  {Number} time     When the note should trigger
		 */
		Player.prototype.triggerRelease = function(note, time){
			var description = this._notes[note];
			console.log(description);
			this._multiPlayer.stop(description.buffer, time);
		};

		/**
		 * Release all of the notes currently playing.
		 */
		Player.prototype.releaseAll = function(){
			this._multiPlayer.stopAll();
			/*var now = toneInstance.now();
			var newOutput = toneInstance.context.createGain();
			newOutput.connect(toneInstance.context.destination);
			this._output.gain.setValueAtTime(1, now);
			this._output.gain.linearRampToValueAtTime(0, now + 0.01);
			this._output = newOutput;
			this._activeNotes = {};*/
		};

		/**
		 * clean up
		 */
		Player.prototype.dispose = function(){
			this.releaseAll();
			for (var buff in this._buffers){
				this._buffers[buff].dispose();
			}
			this._buffers = null;
			this._notes = null;
		};

		return Player;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 36 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(14), __webpack_require__(37)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone) {

		/**
		 * @class Tone.MultiPlayer implements a "fire and forget"
		 *        style buffer player. This is very good for short samples
		 *        like drum hits, sound effects and instruments samples. 
		 *        Unlike Tone.Player, Tone.MultiPlayer cannot loop samples
		 *        or change any attributes of a playing sample.
		 * @extends {Tone}
		 * @param {Object} buffers An object with sample names as the keys and either
		 *                         urls or Tone.Buffers as the values. 
		 */
		Tone.MultiPlayer = function(buffers){

			Tone.call(this, 0, 1);

			/**
			 * All of the buffers
			 * @type {Object}
			 * @private
			 */
			this._buffers = {};

			/**
			 * The source output node
			 * @type {Tone.Gain}
			 * @private
			 */
			this._sourceOutput = new Tone.Gain();
			this._sourceOutput.connect(this.output);

			//add the buffers
			if (this.isObject(buffers)){
				this.addBuffer(buffers);
			}

			this.output.channelCount = 2;
			this.output.channelCountMode = "explicit";
		};

		Tone.extend(Tone.MultiPlayer);

		/**
		 * Start the given sampleName with 
		 * @param  {String} sampleName The name of the buffer to trigger
		 * @param  {Time} time       The time to play the sample
		 * @param  {Object} options   An object literal of options: gain, 
		 *                            duration, playbackRate, and offset
		 * @return {Tone.MultiPlayer} this
		 */
		Tone.MultiPlayer.prototype.start = function(sampleName, time, options){
			options = this.defaultArg(options, {
				"playbackRate" : 1,
				"gain" : 1,
				"offset" : 0,
				"attack" : 0,
				"release" : 0,
			});

			if (this._buffers.hasOwnProperty(sampleName)){
				var buffer = this._buffers[sampleName];

				//create the source and connect it up
				var source = this.context.createBufferSource();
				source.buffer = buffer.get();
				var gainNode = this.context.createGain();
				source.connect(gainNode);
				gainNode.connect(this._sourceOutput);
				source.playbackRate.value = options.playbackRate;

				//trigger the source with all of the options
				time = this.toSeconds(time);
				source.start(time, options.offset);

				//trigger the gainNode with all of the options
				if (options.attack !== 0){
					gainNode.gain.setValueAtTime(0, time);
					gainNode.gain.linearRampToValueAtTime(options.gain, time + this.toSeconds(options.attack));
				} else {
					gainNode.gain.setValueAtTime(options.gain, time);
				}

				
				if (!this.isUndef(options.duration)){
					var duration = this.toSeconds(options.duration, buffer.duration);
					var release = this.toSeconds(options.release);
					gainNode.gain.setValueAtTime(options.gain, time + duration);
					gainNode.gain.linearRampToValueAtTime(0, time + duration + release);
					source.stop(time + duration + release);
				}
			}
			return this;
		};

		/**
		 * Stop all the samples that are currently playing
		 * @param {Time} time When to stop the samples.
		 * @param {Time} [fadeTime = 0.01] How long to fade out for. 
		 * @return {Tone.MultiPlayer}      this
		 */
		Tone.MultiPlayer.prototype.stopAll = function(time, fadeTime){
			//create a new output node, fade out the current one
			time = this.toSeconds(time);
			fadeTime = this.defaultArg(fadeTime, 0.01);
			fadeTime = this.toSeconds(fadeTime);
			this._sourceOutput.gain.setValueAtTime(1, time);
			//small fade out to avoid pops
			this._sourceOutput.gain.linearRampToValueAtTime(0, time + fadeTime);
			//make a new output
			this._sourceOutput = new Tone.Gain().connect(this.output);
			return this;
		};

		/**
		 * Add a buffer to the list of buffers, or load the given url
		 * @param {String|Object} name The name of the buffer. Or pass in an object
		 *                             with the name as the keys and urls as the values
		 * @param {String|Tone.Buffer} url  Either the url to load, or the
		 *                                  Tone.Buffer which corresponds to the name.
		 * @param {Function=} callback The callback to invoke when the buffer is loaded.
		 * @returns {Tone.MultiPlayer} this
		 */
		Tone.MultiPlayer.prototype.addBuffer = function(name, url, callback){
			var loadCount = 0;
			function loaded(){
				loadCount--;
				if (loadCount === 0){
					if (this.isFunction(url)){
						url();
					}
				}
			}
			if (this.isObject(name)){
				for (var buff in name){
					loadCount++;
					this.addBuffer(buff, name[buff], loaded);
				}
			} else if (url instanceof Tone.Buffer){
				this._buffers[name] = url;
			} else {
				this._buffers[name] = new Tone.Buffer(url, callback);
			}
			return this;
		};

		/**
		 * Clean up
		 * @return {Tone.MultiPlayer} [description]
		 */
		Tone.MultiPlayer.prototype.dispose = function(){
			this.stopAll();
			Tone.prototype.dispose.call(this);
			this._sourceOutput.dispose();
			this._sourceOutput = null;
			for (var buff in this._buffers){
				this._buffers[buff].dispose();
			}
			this._buffers = null;
			return this;
		};

		return Tone.MultiPlayer;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 37 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(38)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";
		
		/**
		 *  @class  A single master output which is connected to the
		 *          AudioDestinationNode (aka your speakers). 
		 *          It provides useful conveniences such as the ability 
		 *          to set the volume and mute the entire application. 
		 *          It also gives you the ability to apply master effects to your application. 
		 *          <br><br>
		 *          Like Tone.Transport, A single Tone.Master is created
		 *          on initialization and you do not need to explicitly construct one.
		 *
		 *  @constructor
		 *  @extends {Tone}
		 *  @singleton
		 *  @example
		 * //the audio will go from the oscillator to the speakers
		 * oscillator.connect(Tone.Master);
		 * //a convenience for connecting to the master output is also provided:
		 * oscillator.toMaster();
		 * //the above two examples are equivalent.
		 */
		Tone.Master = function(){
			Tone.call(this);

			/**
			 * the unmuted volume
			 * @type {number}
			 * @private
			 */
			this._unmutedVolume = 1;

			/**
			 *  if the master is muted
			 *  @type {boolean}
			 *  @private
			 */
			this._muted = false;

			/**
			 *  The private volume node
			 *  @type  {Tone.Volume}
			 *  @private
			 */
			this._volume = this.output = new Tone.Volume();

			/**
			 * The volume of the master output.
			 * @type {Decibels}
			 * @signal
			 */
			this.volume = this._volume.volume;
			
			this._readOnly("volume");
			//connections
			this.input.chain(this.output, this.context.destination);
		};

		Tone.extend(Tone.Master);

		/**
		 *  @type {Object}
		 *  @const
		 */
		Tone.Master.defaults = {
			"volume" : 0,
			"mute" : false
		};

		/**
		 * Mute the output. 
		 * @memberOf Tone.Master#
		 * @type {boolean}
		 * @name mute
		 * @example
		 * //mute the output
		 * Tone.Master.mute = true;
		 */
		Object.defineProperty(Tone.Master.prototype, "mute", {
			get : function(){
				return this._muted;
			}, 
			set : function(mute){
				if (!this._muted && mute){
					this._unmutedVolume = this.volume.value;
					//maybe it should ramp here?
					this.volume.value = -Infinity;
				} else if (this._muted && !mute){
					this.volume.value = this._unmutedVolume;
				}
				this._muted = mute;
			}
		});

		/**
		 *  Add a master effects chain. NOTE: this will disconnect any nodes which were previously 
		 *  chained in the master effects chain. 
		 *  @param {AudioNode|Tone...} args All arguments will be connected in a row
		 *                                  and the Master will be routed through it.
		 *  @return  {Tone.Master}  this
		 *  @example
		 * //some overall compression to keep the levels in check
		 * var masterCompressor = new Tone.Compressor({
		 * 	"threshold" : -6,
		 * 	"ratio" : 3,
		 * 	"attack" : 0.5,
		 * 	"release" : 0.1
		 * });
		 * //give a little boost to the lows
		 * var lowBump = new Tone.Filter(200, "lowshelf");
		 * //route everything through the filter 
		 * //and compressor before going to the speakers
		 * Tone.Master.chain(lowBump, masterCompressor);
		 */
		Tone.Master.prototype.chain = function(){
			this.input.disconnect();
			this.input.chain.apply(this.input, arguments);
			arguments[arguments.length - 1].connect(this.output);
		};

		/**
		 *  Clean up
		 *  @return  {Tone.Master}  this
		 */
		Tone.Master.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._writable("volume");
			this._volume.dispose();
			this._volume = null;
			this.volume = null;
		};

		///////////////////////////////////////////////////////////////////////////
		//	AUGMENT TONE's PROTOTYPE
		///////////////////////////////////////////////////////////////////////////

		/**
		 *  Connect 'this' to the master output. Shorthand for this.connect(Tone.Master)
		 *  @returns {Tone} this
		 *  @example
		 * //connect an oscillator to the master output
		 * var osc = new Tone.Oscillator().toMaster();
		 */
		Tone.prototype.toMaster = function(){
			this.connect(Tone.Master);
			return this;
		};

		/**
		 *  Also augment AudioNode's prototype to include toMaster
		 *  as a convenience
		 *  @returns {AudioNode} this
		 */
		AudioNode.prototype.toMaster = function(){
			this.connect(Tone.Master);
			return this;
		};

		var MasterConstructor = Tone.Master;

		/**
		 *  initialize the module and listen for new audio contexts
		 */
		Tone._initAudioContext(function(){
			//a single master output
			if (!Tone.prototype.isUndef(Tone.Master)){
				Tone.Master = new MasterConstructor();
			} else {
				MasterConstructor.prototype.dispose.call(Tone.Master);
				MasterConstructor.call(Tone.Master);
			}
		});

		return Tone.Master;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 38 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.Volume is a simple volume node, useful for creating a volume fader. 
		 *
		 *  @extends {Tone}
		 *  @constructor
		 *  @param {Decibels} [volume=0] the initial volume
		 *  @example
		 * var vol = new Tone.Volume(-12);
		 * instrument.chain(vol, Tone.Master);
		 */
		Tone.Volume = function(){

			var options = this.optionsObject(arguments, ["volume"], Tone.Volume.defaults);

			/**
			 * the output node
			 * @type {GainNode}
			 * @private
			 */
			this.output = this.input = new Tone.Gain(options.volume, Tone.Type.Decibels);

			/**
			 *  The volume control in decibels. 
			 *  @type {Decibels}
			 *  @signal
			 */
			this.volume = this.output.gain;

			this._readOnly("volume");
		};

		Tone.extend(Tone.Volume);

		/**
		 *  Defaults
		 *  @type  {Object}
		 *  @const
		 *  @static
		 */
		Tone.Volume.defaults = {
			"volume" : 0
		};

		/**
		 *  clean up
		 *  @returns {Tone.Volume} this
		 */
		Tone.Volume.prototype.dispose = function(){
			this.input.dispose();
			Tone.prototype.dispose.call(this);
			this._writable("volume");
			this.volume.dispose();
			this.volume = null;
			return this;
		};

		return Tone.Volume;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 39 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_RESULT__ = function () {

		var chromatic = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

		var respelling = {"Db" : "C#", "Eb" : "D#", "Gb" : "F#", "Ab" : "G#", "Bb" : "A#"};

		var splitRegexp = /(-?\d+)/;

		return {
			getNotes : function(start, end){
				var startOctave = parseInt(start.split(splitRegexp)[1]);
				var startNote = start.split(splitRegexp)[0];
				startNote = chromatic.indexOf(startNote);
				var endOctave = parseInt(end.split(splitRegexp)[1]);
				var endNote = end.split(splitRegexp)[0];
				endNote = chromatic.indexOf(endNote);

				var currentNote = startNote;
				var currentOctave = startOctave;

				var retNotes = [];

				while(!(currentNote === endNote && currentOctave === endOctave)){
					retNotes.push(chromatic[currentNote] + currentOctave);

					currentNote++;

					if (currentNote >= chromatic.length){
						currentNote = 0;
						currentOctave++;
					}
				}

				return retNotes;
			},
			getRespelling : function(note){
				var pitch = note.split(splitRegexp)[0];
				var octave = parseInt(note.split(splitRegexp)[1]);
				if (respelling.hasOwnProperty(pitch)){
					return respelling[pitch] + octave.toString();
				} else {
					return null;
				}
			}
		};
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 40 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(41), __webpack_require__(36)], __WEBPACK_AMD_DEFINE_RESULT__ = function (teoria, MultiPlayer) {

		var Sampler = function(){

			this._player = new MultiPlayer().toMaster();

			//the onset time
			this._onset = 0;
		};

		Sampler.prototype.setBuffer = function(buffer, duration, onset){
			var tmpBuffer = this._player.context.createBuffer(1, this._player.context.sampleRate * buffer.duration, this._player.context.sampleRate);
			var targetArray = tmpBuffer.getChannelData(0);
			var copyArray = buffer.getChannelData(0);
			for (var i = 0; i < copyArray.length; i++){
				targetArray[i] = copyArray[i];
			}
			this._onset = onset;
			this._player.addBuffer("buffer", tmpBuffer);
		};

		Sampler.prototype.releaseAll = function(){
			this._player.stopAll();
		};

		Sampler.prototype.triggerAttackRelease = function(note, duration, time, velocity){
			var semitones = teoria.Interval.between(teoria.note("C3"), teoria.note(note)).semitones();
			this._player.start("buffer", time, {
				"playbackRate" : this._player.intervalToFrequencyRatio(semitones),
				"duration" : duration,
				"gain" : velocity,
				"offset" : this._onset
			});
		};

		return Sampler;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 41 */
/***/ (function(module, exports, __webpack_require__) {

	var Note = __webpack_require__(42);
	var Interval = __webpack_require__(49);
	var Chord = __webpack_require__(51);
	var Scale = __webpack_require__(53);

	// never thought I would write this, but: Legacy support
	function intervalConstructor(from, to) {
	  // Construct a Interval object from string representation
	  if (typeof from === 'string')
	    return Interval.toCoord(from);

	  if (typeof to === 'string' && from instanceof Note)
	    return Interval.from(from, Interval.toCoord(to));

	  if (to instanceof Interval && from instanceof Note)
	    return Interval.from(from, to);

	  if (to instanceof Note && from instanceof Note)
	    return Interval.between(from, to);

	  throw new Error('Invalid parameters');
	}

	intervalConstructor.toCoord = Interval.toCoord;
	intervalConstructor.from = Interval.from;
	intervalConstructor.between = Interval.between;
	intervalConstructor.invert = Interval.invert;

	function noteConstructor(name, duration) {
	  if (typeof name === 'string')
	    return Note.fromString(name, duration);
	  else
	    return new Note(name, duration);
	}

	noteConstructor.fromString = Note.fromString;
	noteConstructor.fromKey = Note.fromKey;
	noteConstructor.fromFrequency = Note.fromFrequency;
	noteConstructor.fromMIDI = Note.fromMIDI;

	function chordConstructor(name, symbol) {
	  if (typeof name === 'string') {
	    var root, octave;
	    root = name.match(/^([a-h])(x|#|bb|b?)/i);
	    if (root && root[0]) {
	      octave = typeof symbol === 'number' ? symbol.toString(10) : '4';
	      return new Chord(Note.fromString(root[0].toLowerCase() + octave),
	                            name.substr(root[0].length));
	    }
	  } else if (name instanceof Note)
	    return new Chord(name, symbol);

	  throw new Error('Invalid Chord. Couldn\'t find note name');
	}

	function scaleConstructor(tonic, scale) {
	  tonic = (tonic instanceof Note) ? tonic : teoria.note(tonic);
	  return new Scale(tonic, scale);
	}

	var teoria = {
	  note: noteConstructor,

	  chord: chordConstructor,

	  interval: intervalConstructor,

	  scale: scaleConstructor,

	  Note: Note,
	  Chord: Chord,
	  Scale: Scale,
	  Interval: Interval
	};

	__webpack_require__(54)(teoria);
	exports = module.exports = teoria;


/***/ }),
/* 42 */
/***/ (function(module, exports, __webpack_require__) {

	var scientific = __webpack_require__(43);
	var helmholtz = __webpack_require__(46);
	var knowledge = __webpack_require__(47);
	var vector = __webpack_require__(48);
	var Interval = __webpack_require__(49);

	function pad(str, ch, len) {
	  for (; len > 0; len--) {
	    str += ch;
	  }

	  return str;
	}


	function Note(coord, duration) {
	  if (!(this instanceof Note)) return new Note(coord, duration);
	  duration = duration || {};

	  this.duration = { value: duration.value || 4, dots: duration.dots || 0 };
	  this.coord = coord;
	}

	Note.prototype = {
	  octave: function() {
	    return this.coord[0] + knowledge.A4[0] - knowledge.notes[this.name()][0] +
	      this.accidentalValue() * 4;
	  },

	  name: function() {
	    return knowledge.fifths[this.coord[1] + knowledge.A4[1] - this.accidentalValue() * 7 + 1];
	  },

	  accidentalValue: function() {
	    return Math.round((this.coord[1] + knowledge.A4[1] - 2) / 7);
	  },

	  accidental: function() {
	    return knowledge.accidentals[this.accidentalValue() + 2];
	  },

	  /**
	   * Returns the key number of the note
	   */
	  key: function(white) {
	    if (white)
	      return this.coord[0] * 7 + this.coord[1] * 4 + 29;
	    else
	      return this.coord[0] * 12 + this.coord[1] * 7 + 49;
	  },

	  /**
	  * Returns a number ranging from 0-127 representing a MIDI note value
	  */
	  midi: function() {
	    return this.key() + 20;
	  },

	  /**
	   * Calculates and returns the frequency of the note.
	   * Optional concert pitch (def. 440)
	   */
	  fq: function(concertPitch) {
	    concertPitch = concertPitch || 440;

	    return concertPitch *
	      Math.pow(2, (this.coord[0] * 12 + this.coord[1] * 7) / 12);
	  },

	  /**
	   * Returns the pitch class index (chroma) of the note
	   */
	  chroma: function() {
	    var value = (vector.sum(vector.mul(this.coord, [12, 7])) - 3) % 12;

	    return (value < 0) ? value + 12 : value;
	  },

	  interval: function(interval) {
	    if (typeof interval === 'string') interval = Interval.toCoord(interval);

	    if (interval instanceof Interval)
	      return new Note(vector.add(this.coord, interval.coord));
	    else if (interval instanceof Note)
	      return new Interval(vector.sub(interval.coord, this.coord));
	  },

	  transpose: function(interval) {
	    this.coord = vector.add(this.coord, interval.coord);
	    return this;
	  },

	  /**
	   * Returns the Helmholtz notation form of the note (fx C,, d' F# g#'')
	   */
	  helmholtz: function() {
	    var octave = this.octave();
	    var name = this.name();
	    name = octave < 3 ? name.toUpperCase() : name.toLowerCase();
	    var padchar = octave < 3 ? ',' : '\'';
	    var padcount = octave < 2 ? 2 - octave : octave - 3;

	    return pad(name + this.accidental(), padchar, padcount);
	  },

	  /**
	   * Returns the scientific notation form of the note (fx E4, Bb3, C#7 etc.)
	   */
	  scientific: function() {
	    return this.name().toUpperCase() + this.accidental() + this.octave();
	  },

	  /**
	   * Returns notes that are enharmonic with this note.
	   */
	  enharmonics: function(oneaccidental) {
	    var key = this.key(), limit = oneaccidental ? 2 : 3;

	    return ['m3', 'm2', 'm-2', 'm-3']
	      .map(this.interval.bind(this))
	      .filter(function(note) {
	      var acc = note.accidentalValue();
	      var diff = key - (note.key() - acc);

	      if (diff < limit && diff > -limit) {
	        note.coord = vector.add(note.coord, vector.mul(knowledge.sharp, diff - acc));
	        return true;
	      }
	    });
	  },

	  solfege: function(scale, showOctaves) {
	    var interval = scale.tonic.interval(this), solfege, stroke, count;
	    if (interval.direction() === 'down')
	      interval = interval.invert();

	    if (showOctaves) {
	      count = (this.key(true) - scale.tonic.key(true)) / 7;
	      count = (count >= 0) ? Math.floor(count) : -(Math.ceil(-count));
	      stroke = (count >= 0) ? '\'' : ',';
	    }

	    solfege = knowledge.intervalSolfege[interval.simple(true).toString()];
	    return (showOctaves) ? pad(solfege, stroke, Math.abs(count)) : solfege;
	  },

	  scaleDegree: function(scale) {
	    var inter = scale.tonic.interval(this);

	    // If the direction is down, or we're dealing with an octave - invert it
	    if (inter.direction() === 'down' ||
	       (inter.coord[1] === 0 && inter.coord[0] !== 0)) {
	      inter = inter.invert();
	    }

	    inter = inter.simple(true).coord;

	    return scale.scale.reduce(function(index, current, i) {
	      var coord = Interval.toCoord(current).coord;
	      return coord[0] === inter[0] && coord[1] === inter[1] ? i + 1 : index;
	    }, 0);
	  },

	  /**
	   * Returns the name of the duration value,
	   * such as 'whole', 'quarter', 'sixteenth' etc.
	   */
	  durationName: function() {
	    return knowledge.durations[this.duration.value];
	  },

	  /**
	   * Returns the duration of the note (including dots)
	   * in seconds. The first argument is the tempo in beats
	   * per minute, the second is the beat unit (i.e. the
	   * lower numeral in a time signature).
	   */
	  durationInSeconds: function(bpm, beatUnit) {
	    var secs = (60 / bpm) / (this.duration.value / 4) / (beatUnit / 4);
	    return secs * 2 - secs / Math.pow(2, this.duration.dots);
	  },

	  /**
	   * Returns the name of the note, with an optional display of octave number
	   */
	  toString: function(dont) {
	    return this.name() + this.accidental() + (dont ? '' : this.octave());
	  }
	};

	Note.fromString = function(name, dur) {
	  var coord = scientific(name);
	  if (!coord) coord = helmholtz(name);
	  return new Note(coord, dur);
	}

	Note.fromKey = function(key) {
	  var octave = Math.floor((key - 4) / 12);
	  var distance = key - (octave * 12) - 4;
	  var name = knowledge.fifths[(2 * Math.round(distance / 2) + 1) % 7];
	  var note = vector.add(vector.sub(knowledge.notes[name], knowledge.A4), [octave + 1, 0]);
	  var diff = (key - 49) - vector.sum(vector.mul(note, [12, 7]));

	  return new Note(diff ? vector.add(note, vector.mul(knowledge.sharp, diff)) : note);
	}

	Note.fromFrequency = function(fq, concertPitch) {
	  var key, cents, originalFq;
	  concertPitch = concertPitch || 440;

	  key = 49 + 12 * ((Math.log(fq) - Math.log(concertPitch)) / Math.log(2));
	  key = Math.round(key);
	  originalFq = concertPitch * Math.pow(2, (key - 49) / 12);
	  cents = 1200 * (Math.log(fq / originalFq) / Math.log(2));

	  return { note: Note.fromKey(key), cents: cents };
	}

	Note.fromMIDI = function(note) {
	  return Note.fromKey(note - 20);
	}

	module.exports = Note;


/***/ }),
/* 43 */
/***/ (function(module, exports, __webpack_require__) {

	var coords = __webpack_require__(44);
	var accval = __webpack_require__(45);

	module.exports = function scientific(name) {
	  var format = /^([a-h])(x|#|bb|b?)(-?\d*)/i;

	  var parser = name.match(format);
	  if (!(parser && name === parser[0] && parser[3].length)) return;

	  var noteName = parser[1];
	  var octave = +parser[3];
	  var accidental = parser[2].length ? parser[2].toLowerCase() : '';

	  var accidentalValue = accval.interval(accidental);
	  var coord = coords(noteName.toLowerCase());

	  coord[0] += octave;
	  coord[0] += accidentalValue[0] - coords.A4[0];
	  coord[1] += accidentalValue[1] - coords.A4[1];

	  return coord;
	};


/***/ }),
/* 44 */
/***/ (function(module, exports) {

	// First coord is octaves, second is fifths. Distances are relative to c
	var notes = {
	  c: [0, 0],
	  d: [-1, 2],
	  e: [-2, 4],
	  f: [1, -1],
	  g: [0, 1],
	  a: [-1, 3],
	  b: [-2, 5],
	  h: [-2, 5]
	};

	module.exports = function(name) {
	  return name in notes ? [notes[name][0], notes[name][1]] : null;
	};

	module.exports.notes = notes;
	module.exports.A4 = [3, 3]; // Relative to C0 (scientic notation, ~16.35Hz)
	module.exports.sharp = [-4, 7];


/***/ }),
/* 45 */
/***/ (function(module, exports) {

	var accidentalValues = {
	  'bb': -2,
	  'b': -1,
	  '': 0,
	  '#': 1,
	  'x': 2
	};

	module.exports = function accidentalNumber(acc) {
	  return accidentalValues[acc];
	}

	module.exports.interval = function accidentalInterval(acc) {
	  var val = accidentalValues[acc];
	  return [-4 * val, 7 * val];
	}


/***/ }),
/* 46 */
/***/ (function(module, exports, __webpack_require__) {

	var coords = __webpack_require__(44);
	var accval = __webpack_require__(45);

	module.exports = function helmholtz(name) {
	  var name = name.replace(/\u2032/g, "'").replace(/\u0375/g, ',');
	  var parts = name.match(/^(,*)([a-h])(x|#|bb|b?)([,\']*)$/i);

	  if (!parts || name !== parts[0])
	    throw new Error('Invalid formatting');

	  var note = parts[2];
	  var octaveFirst = parts[1];
	  var octaveLast = parts[4];
	  var lower = note === note.toLowerCase();
	  var octave;

	  if (octaveFirst) {
	    if (lower)
	      throw new Error('Invalid formatting - found commas before lowercase note');

	    octave = 2 - octaveFirst.length;
	  } else if (octaveLast) {
	    if (octaveLast.match(/^'+$/) && lower)
	      octave = 3 + octaveLast.length;
	    else if (octaveLast.match(/^,+$/) && !lower)
	      octave = 2 - octaveLast.length;
	    else
	      throw new Error('Invalid formatting - mismatch between octave ' +
	        'indicator and letter case')
	  } else
	    octave = lower ? 3 : 2;

	  var accidentalValue = accval.interval(parts[3].toLowerCase());
	  var coord = coords(note.toLowerCase());

	  coord[0] += octave;
	  coord[0] += accidentalValue[0] - coords.A4[0];
	  coord[1] += accidentalValue[1] - coords.A4[1];

	  return coord;
	};


/***/ }),
/* 47 */
/***/ (function(module, exports) {

	// Note coordinates [octave, fifth] relative to C
	module.exports = {
	  notes: {
	    c: [0, 0],
	    d: [-1, 2],
	    e: [-2, 4],
	    f: [1, -1],
	    g: [0, 1],
	    a: [-1, 3],
	    b: [-2, 5],
	    h: [-2, 5]
	  },

	  intervals: {
	    unison: [0, 0],
	    second: [3, -5],
	    third: [2, -3],
	    fourth: [1, -1],
	    fifth: [0, 1],
	    sixth: [3, -4],
	    seventh: [2, -2],
	    octave: [1, 0]
	  },

	  intervalFromFifth: ['second', 'sixth', 'third', 'seventh', 'fourth',
	                         'unison', 'fifth'],

	  intervalsIndex: ['unison', 'second', 'third', 'fourth', 'fifth',
	                      'sixth', 'seventh', 'octave', 'ninth', 'tenth',
	                      'eleventh', 'twelfth', 'thirteenth', 'fourteenth',
	                      'fifteenth'],

	// linaer index to fifth = (2 * index + 1) % 7
	  fifths: ['f', 'c', 'g', 'd', 'a', 'e', 'b'],
	  accidentals: ['bb', 'b', '', '#', 'x'],

	  sharp: [-4, 7],
	  A4: [3, 3],

	  durations: {
	    '0.25': 'longa',
	    '0.5': 'breve',
	    '1': 'whole',
	    '2': 'half',
	    '4': 'quarter',
	    '8': 'eighth',
	    '16': 'sixteenth',
	    '32': 'thirty-second',
	    '64': 'sixty-fourth',
	    '128': 'hundred-twenty-eighth'
	  },

	  qualityLong: {
	    P: 'perfect',
	    M: 'major',
	    m: 'minor',
	    A: 'augmented',
	    AA: 'doubly augmented',
	    d: 'diminished',
	    dd: 'doubly diminished'
	  },

	  alterations: {
	    perfect: ['dd', 'd', 'P', 'A', 'AA'],
	    minor: ['dd', 'd', 'm', 'M', 'A', 'AA']
	  },

	  symbols: {
	    'min': ['m3', 'P5'],
	    'm': ['m3', 'P5'],
	    '-': ['m3', 'P5'],

	    'M': ['M3', 'P5'],
	    '': ['M3', 'P5'],

	    '+': ['M3', 'A5'],
	    'aug': ['M3', 'A5'],

	    'dim': ['m3', 'd5'],
	    'o': ['m3', 'd5'],

	    'maj': ['M3', 'P5', 'M7'],
	    'dom': ['M3', 'P5', 'm7'],
	    'ø': ['m3', 'd5', 'm7'],

	    '5': ['P5']
	  },

	  chordShort: {
	    'major': 'M',
	    'minor': 'm',
	    'augmented': 'aug',
	    'diminished': 'dim',
	    'half-diminished': '7b5',
	    'power': '5',
	    'dominant': '7'
	  },

	  stepNumber: {
	    'unison': 1,
	    'first': 1,
	    'second': 2,
	    'third': 3,
	    'fourth': 4,
	    'fifth': 5,
	    'sixth': 6,
	    'seventh': 7,
	    'octave': 8,
	    'ninth': 9,
	    'eleventh': 11,
	    'thirteenth': 13
	  },

	  // Adjusted Shearer syllables - Chromatic solfege system
	  // Some intervals are not provided for. These include:
	  // dd2 - Doubly diminished second
	  // dd3 - Doubly diminished third
	  // AA3 - Doubly augmented third
	  // dd6 - Doubly diminished sixth
	  // dd7 - Doubly diminished seventh
	  // AA7 - Doubly augmented seventh
	  intervalSolfege: {
	    'dd1': 'daw',
	    'd1': 'de',
	    'P1': 'do',
	    'A1': 'di',
	    'AA1': 'dai',
	    'd2': 'raw',
	    'm2': 'ra',
	    'M2': 're',
	    'A2': 'ri',
	    'AA2': 'rai',
	    'd3': 'maw',
	    'm3': 'me',
	    'M3': 'mi',
	    'A3': 'mai',
	    'dd4': 'faw',
	    'd4': 'fe',
	    'P4': 'fa',
	    'A4': 'fi',
	    'AA4': 'fai',
	    'dd5': 'saw',
	    'd5': 'se',
	    'P5': 'so',
	    'A5': 'si',
	    'AA5': 'sai',
	    'd6': 'law',
	    'm6': 'le',
	    'M6': 'la',
	    'A6': 'li',
	    'AA6': 'lai',
	    'd7': 'taw',
	    'm7': 'te',
	    'M7': 'ti',
	    'A7': 'tai',
	    'dd8': 'daw',
	    'd8': 'de',
	    'P8': 'do',
	    'A8': 'di',
	    'AA8': 'dai'
	  }
	}


/***/ }),
/* 48 */
/***/ (function(module, exports) {

	module.exports = {
	  add: function(note, interval) {
	    return [note[0] + interval[0], note[1] + interval[1]];
	  },

	  sub: function(note, interval) {
	    return [note[0] - interval[0], note[1] - interval[1]];
	  },

	  mul: function(note, interval) {
	    if (typeof interval === 'number')
	      return [note[0] * interval, note[1] * interval];
	    else
	      return [note[0] * interval[0], note[1] * interval[1]];
	  },

	  sum: function(coord) {
	    return coord[0] + coord[1];
	  }
	}


/***/ }),
/* 49 */
/***/ (function(module, exports, __webpack_require__) {

	var knowledge = __webpack_require__(47);
	var vector = __webpack_require__(48);
	var toCoord = __webpack_require__(50);

	function Interval(coord) {
	  if (!(this instanceof Interval)) return new Interval(coord);
	  this.coord = coord;
	}

	Interval.prototype = {
	  name: function() {
	    return knowledge.intervalsIndex[this.number() - 1];
	  },

	  semitones: function() {
	    return vector.sum(vector.mul(this.coord, [12, 7]));
	  },

	  number: function() {
	    return Math.abs(this.value());
	  },

	  value: function() {
	    var without = vector.sub(this.coord,
	      vector.mul(knowledge.sharp, Math.floor((this.coord[1] - 2) / 7) + 1))
	      , i, val;

	    i = knowledge.intervalFromFifth[without[1] + 5];
	    val = knowledge.stepNumber[i] + (without[0] - knowledge.intervals[i][0]) * 7;

	    return (val > 0) ? val : val - 2;
	  },

	  type: function() {
	    return knowledge.intervals[this.base()][0] <= 1 ? 'perfect' : 'minor';
	  },

	  base: function() {
	    var fifth = vector.sub(this.coord, vector.mul(knowledge.sharp, this.qualityValue()))[1], name;
	    fifth = this.value() > 0 ? fifth + 5 : -(fifth - 5) % 7;
	    fifth = fifth < 0 ? knowledge.intervalFromFifth.length + fifth : fifth;

	    name = knowledge.intervalFromFifth[fifth];
	    if (name === 'unison' && this.number() >= 8)
	      name = 'octave';

	    return name;
	  },

	  direction: function(dir) {
	    if (dir) {
	      var is = this.value() >= 1 ? 'up' : 'down';
	      if (is !== dir)
	        this.coord = vector.mul(this.coord, -1);

	      return this;
	    }
	    else
	      return this.value() >= 1 ? 'up' : 'down';
	  },

	  simple: function(ignore) {
	    // Get the (upwards) base interval (with quality)
	    var simple = knowledge.intervals[this.base()];
	    simple = vector.add(simple, vector.mul(knowledge.sharp, this.qualityValue()));

	    // Turn it around if necessary
	    if (!ignore)
	      simple = this.direction() === 'down' ? vector.mul(simple, -1) : simple;

	    return new Interval(simple);
	  },

	  isCompound: function() {
	    return this.number() > 8;
	  },

	  octaves: function() {
	    var without, octaves;

	    if (this.direction() === 'up') {
	      without = vector.sub(this.coord, vector.mul(knowledge.sharp, this.qualityValue()));
	      octaves = without[0] - knowledge.intervals[this.base()][0];
	    } else {
	      without = vector.sub(this.coord, vector.mul(knowledge.sharp, -this.qualityValue()));
	      octaves = -(without[0] + knowledge.intervals[this.base()][0]);
	    }

	    return octaves;
	  },

	  invert: function() {
	    var i = this.base();
	    var qual = this.qualityValue();
	    var acc = this.type() === 'minor' ? -(qual - 1) : -qual;
	    var coord = knowledge.intervals[knowledge.intervalsIndex[9 - knowledge.stepNumber[i] - 1]];
	    coord = vector.add(coord, vector.mul(knowledge.sharp, acc));

	    return new Interval(coord);
	  },

	  quality: function(lng) {
	    var quality = knowledge.alterations[this.type()][this.qualityValue() + 2];

	    return lng ? knowledge.qualityLong[quality] : quality;
	  },

	  qualityValue: function() {
	    if (this.direction() === 'down')
	      return Math.floor((-this.coord[1] - 2) / 7) + 1;
	    else
	      return Math.floor((this.coord[1] - 2) / 7) + 1;
	  },

	  equal: function(interval) {
	      return this.coord[0] === interval.coord[0] &&
	          this.coord[1] === interval.coord[1];
	  },

	  greater: function(interval) {
	    var semi = this.semitones();
	    var isemi = interval.semitones();

	    // If equal in absolute size, measure which interval is bigger
	    // For example P4 is bigger than A3
	    return (semi === isemi) ?
	      (this.number() > interval.number()) : (semi > isemi);
	  },

	  smaller: function(interval) {
	    return !this.equal(interval) && !this.greater(interval);
	  },

	  add: function(interval) {
	    return new Interval(vector.add(this.coord, interval.coord));
	  },

	  toString: function(ignore) {
	    // If given true, return the positive value
	    var number = ignore ? this.number() : this.value();

	    return this.quality() + number;
	  }
	}

	Interval.toCoord = function(simple) {
	  var coord = toCoord(simple);
	  if (!coord)
	    throw new Error('Invalid simple format interval');

	  return new Interval(coord);
	}

	Interval.from = function(from, to) {
	  return from.interval(to);
	}

	Interval.between = function(from, to) {
	  return new Interval(vector.sub(to.coord, from.coord));
	}

	Interval.invert = function(sInterval) {
	  return Interval.toCoord(sInterval).invert().toString();
	}

	module.exports = Interval;


/***/ }),
/* 50 */
/***/ (function(module, exports) {

	var pattern = /^(AA|A|P|M|m|d|dd)(-?\d+)$/;

	// The interval it takes to raise a note a semitone
	var sharp = [-4, 7];

	var pAlts = ['dd', 'd', 'P', 'A', 'AA'];
	var mAlts = ['dd', 'd', 'm', 'M', 'A', 'AA'];

	var baseIntervals = [
	  [0, 0],
	  [3, -5],
	  [2, -3],
	  [1, -1],
	  [0, 1],
	  [3, -4],
	  [2, -2],
	  [1, 0]
	];

	module.exports = function(simple) {
	  var parser = simple.match(pattern);
	  if (!parser) return null;

	  var quality = parser[1];
	  var number = +parser[2];
	  var sign = number < 0 ? -1 : 1;

	  number = sign < 0 ? -number : number;

	  var lower = number > 8 ? (number % 7 || 7) : number;
	  var octaves = (number - lower) / 7;

	  var base = baseIntervals[lower - 1];
	  var alts = base[0] <= 1 ? pAlts : mAlts;
	  var alt = alts.indexOf(quality) - 2;

	  // this happens, if the alteration wasn't suitable for this type
	  // of interval, such as P2 or M5 (no "perfect second" or "major fifth")
	  if (alt === -3) return null;

	  return [
	    sign * (base[0] + octaves + sharp[0] * alt),
	    sign * (base[1] + sharp[1] * alt)
	  ];
	}

	// Copy to avoid overwriting internal base intervals
	module.exports.coords = baseIntervals.slice(0);


/***/ }),
/* 51 */
/***/ (function(module, exports, __webpack_require__) {

	var daccord = __webpack_require__(52);
	var knowledge = __webpack_require__(47);
	var Note = __webpack_require__(42);
	var Interval = __webpack_require__(49);

	function Chord(root, name) {
	  if (!(this instanceof Chord)) return new Chord(root, name);
	  name = name || '';
	  this.name = root.name().toUpperCase() + root.accidental() + name;
	  this.symbol = name;
	  this.root = root;
	  this.intervals = [];
	  this._voicing = [];

	  var bass = name.split('/');
	  if (bass.length === 2 && bass[1].trim() !== '9') {
	    name = bass[0];
	    bass = bass[1].trim();
	  } else {
	    bass = null;
	  }

	  this.intervals = daccord(name).map(Interval.toCoord)
	  this._voicing = this.intervals.slice();

	  if (bass) {
	    var intervals = this.intervals, bassInterval, note;
	    // Make sure the bass is atop of the root note
	    note = Note.fromString(bass + (root.octave() + 1)); // crude

	    bassInterval = Interval.between(root, note);
	    bass = bassInterval.simple();
	    bassInterval = bassInterval.invert().direction('down');

	    this._voicing = [bassInterval];
	    for (var i = 0, length = intervals.length;  i < length; i++) {
	      if (!intervals[i].simple().equal(bass))
	        this._voicing.push(intervals[i]);
	    }
	  }
	}

	Chord.prototype = {
	  notes: function() {
	    var root = this.root;
	    return this.voicing().map(function(interval) {
	      return root.interval(interval);
	    });
	  },

	  simple: function() {
	    return this.notes().map(function(n) { return n.toString(true); });
	  },

	  bass: function() {
	    return this.root.interval(this._voicing[0]);
	  },

	  voicing: function(voicing) {
	    // Get the voicing
	    if (!voicing) {
	      return this._voicing;
	    }

	    // Set the voicing
	    this._voicing = [];
	    for (var i = 0, length = voicing.length; i < length; i++) {
	      this._voicing[i] = Interval.toCoord(voicing[i]);
	    }

	    return this;
	  },

	  resetVoicing: function() {
	    this._voicing = this.intervals;
	  },

	  dominant: function(additional) {
	    additional = additional || '';
	    return new Chord(this.root.interval('P5'), additional);
	  },

	  subdominant: function(additional) {
	    additional = additional || '';
	    return new Chord(this.root.interval('P4'), additional);
	  },

	  parallel: function(additional) {
	    additional = additional || '';
	    var quality = this.quality();

	    if (this.chordType() !== 'triad' || quality === 'diminished' ||
	        quality === 'augmented') {
	      throw new Error('Only major/minor triads have parallel chords');
	    }

	    if (quality === 'major') {
	      return new Chord(this.root.interval('m3', 'down'), 'm');
	    } else {
	      return new Chord(this.root.interval('m3', 'up'));
	    }
	  },

	  quality: function() {
	    var third, fifth, seventh, intervals = this.intervals;

	    for (var i = 0, length = intervals.length; i < length; i++) {
	      if (intervals[i].number() === 3) {
	        third = intervals[i];
	      } else if (intervals[i].number() === 5) {
	        fifth = intervals[i];
	      } else if (intervals[i].number() === 7) {
	        seventh = intervals[i];
	      }
	    }

	    if (!third) {
	      return;
	    }

	    third = (third.direction() === 'down') ? third.invert() : third;
	    third = third.simple().toString();

	    if (fifth) {
	      fifth = (fifth.direction === 'down') ? fifth.invert() : fifth;
	      fifth = fifth.simple().toString();
	    }

	    if (seventh) {
	      seventh = (seventh.direction === 'down') ? seventh.invert() : seventh;
	      seventh = seventh.simple().toString();
	    }

	    if (third === 'M3') {
	      if (fifth === 'A5') {
	        return 'augmented';
	      } else if (fifth === 'P5') {
	        return (seventh === 'm7') ? 'dominant' : 'major';
	      }

	      return 'major';
	    } else if (third === 'm3') {
	      if (fifth === 'P5') {
	        return 'minor';
	      } else if (fifth === 'd5') {
	        return (seventh === 'm7') ? 'half-diminished' : 'diminished';
	      }

	      return 'minor';
	    }
	  },

	  chordType: function() { // In need of better name
	    var length = this.intervals.length, interval, has, invert, i, name;

	    if (length === 2) {
	      return 'dyad';
	    } else if (length === 3) {
	      has = {first: false, third: false, fifth: false};
	      for (i = 0; i < length; i++) {
	        interval = this.intervals[i];
	        invert = interval.invert();
	        if (interval.base() in has) {
	          has[interval.base()] = true;
	        } else if (invert.base() in has) {
	          has[invert.base()] = true;
	        }
	      }

	      name = (has.first && has.third && has.fifth) ? 'triad' : 'trichord';
	    } else if (length === 4) {
	      has = {first: false, third: false, fifth: false, seventh: false};
	      for (i = 0; i < length; i++) {
	        interval = this.intervals[i];
	        invert = interval.invert();
	        if (interval.base() in has) {
	          has[interval.base()] = true;
	        } else if (invert.base() in has) {
	          has[invert.base()] = true;
	        }
	      }

	      if (has.first && has.third && has.fifth && has.seventh) {
	        name = 'tetrad';
	      }
	    }

	    return name || 'unknown';
	  },

	  get: function(interval) {
	    if (typeof interval === 'string' && interval in knowledge.stepNumber) {
	      var intervals = this.intervals, i, length;

	      interval = knowledge.stepNumber[interval];
	      for (i = 0, length = intervals.length; i < length; i++) {
	        if (intervals[i].number() === interval) {
	          return this.root.interval(intervals[i]);
	        }
	      }

	      return null;
	    } else {
	      throw new Error('Invalid interval name');
	    }
	  },

	  interval: function(interval) {
	    return new Chord(this.root.interval(interval), this.symbol);
	  },

	  transpose: function(interval) {
	    this.root.transpose(interval);
	    this.name = this.root.name().toUpperCase() +
	                this.root.accidental() + this.symbol;

	    return this;
	  },

	  toString: function() {
	    return this.name;
	  }
	};

	module.exports = Chord;


/***/ }),
/* 52 */
/***/ (function(module, exports) {

	var SYMBOLS = {
	  'm': ['m3', 'P5'],
	  'mi': ['m3', 'P5'],
	  'min': ['m3', 'P5'],
	  '-': ['m3', 'P5'],

	  'M': ['M3', 'P5'],
	  'ma': ['M3', 'P5'],
	  '': ['M3', 'P5'],

	  '+': ['M3', 'A5'],
	  'aug': ['M3', 'A5'],

	  'dim': ['m3', 'd5'],
	  'o': ['m3', 'd5'],

	  'maj': ['M3', 'P5', 'M7'],
	  'dom': ['M3', 'P5', 'm7'],
	  'ø': ['m3', 'd5', 'm7'],

	  '5': ['P5'],

	  '6/9': ['M3', 'P5', 'M6', 'M9']
	};

	module.exports = function(symbol) {
	  var c, parsing = 'quality', additionals = [], name, chordLength = 2
	  var notes = ['P1', 'M3', 'P5', 'm7', 'M9', 'P11', 'M13'];
	  var explicitMajor = false;

	  function setChord(name) {
	    var intervals = SYMBOLS[name];
	    for (var i = 0, len = intervals.length; i < len; i++) {
	      notes[i + 1] = intervals[i];
	    }

	    chordLength = intervals.length;
	  }

	  // Remove whitespace, commas and parentheses
	  symbol = symbol.replace(/[,\s\(\)]/g, '');
	  for (var i = 0, len = symbol.length; i < len; i++) {
	    if (!(c = symbol[i]))
	      return;

	    if (parsing === 'quality') {
	      var sub3 = (i + 2) < len ? symbol.substr(i, 3).toLowerCase() : null;
	      var sub2 = (i + 1) < len ? symbol.substr(i, 2).toLowerCase() : null;
	      if (sub3 in SYMBOLS)
	        name = sub3;
	      else if (sub2 in SYMBOLS)
	        name = sub2;
	      else if (c in SYMBOLS)
	        name = c;
	      else
	        name = '';

	      if (name)
	        setChord(name);

	      if (name === 'M' || name === 'ma' || name === 'maj')
	        explicitMajor = true;


	      i += name.length - 1;
	      parsing = 'extension';
	    } else if (parsing === 'extension') {
	      c = (c === '1' && symbol[i + 1]) ? +symbol.substr(i, 2) : +c;

	      if (!isNaN(c) && c !== 6) {
	        chordLength = (c - 1) / 2;

	        if (chordLength !== Math.round(chordLength))
	          return new Error('Invalid interval extension: ' + c.toString(10));

	        if (name === 'o' || name === 'dim')
	          notes[3] = 'd7';
	        else if (explicitMajor)
	          notes[3] = 'M7';

	        i += c >= 10 ? 1 : 0;
	      } else if (c === 6) {
	        notes[3] = 'M6';
	        chordLength = Math.max(3, chordLength);
	      } else
	        i -= 1;

	      parsing = 'alterations';
	    } else if (parsing === 'alterations') {
	      var alterations = symbol.substr(i).split(/(#|b|add|maj|sus|M)/i),
	          next, flat = false, sharp = false;

	      if (alterations.length === 1)
	        return new Error('Invalid alteration');
	      else if (alterations[0].length !== 0)
	        return new Error('Invalid token: \'' + alterations[0] + '\'');

	      var ignore = false;
	      alterations.forEach(function(alt, i, arr) {
	        if (ignore || !alt.length)
	          return ignore = false;

	        var next = arr[i + 1], lower = alt.toLowerCase();
	        if (alt === 'M' || lower === 'maj') {
	          if (next === '7')
	            ignore = true;

	          chordLength = Math.max(3, chordLength);
	          notes[3] = 'M7';
	        } else if (lower === 'sus') {
	          var type = 'P4';
	          if (next === '2' || next === '4') {
	            ignore = true;

	            if (next === '2')
	              type = 'M2';
	          }

	          notes[1] = type; // Replace third with M2 or P4
	        } else if (lower === 'add') {
	          if (next === '9')
	            additionals.push('M9');
	          else if (next === '11')
	            additionals.push('P11');
	          else if (next === '13')
	            additionals.push('M13');

	          ignore = true
	        } else if (lower === 'b') {
	          flat = true;
	        } else if (lower === '#') {
	          sharp = true;
	        } else {
	          var token = +alt, quality, intPos;
	          if (isNaN(token) || String(token).length !== alt.length)
	            return new Error('Invalid token: \'' + alt + '\'');

	          if (token === 6) {
	            if (sharp)
	              notes[3] = 'A6';
	            else if (flat)
	              notes[3] = 'm6';
	            else
	              notes[3] = 'M6';

	            chordLength = Math.max(3, chordLength);
	            return;
	          }

	          // Calculate the position in the 'note' array
	          intPos = (token - 1) / 2;
	          if (chordLength < intPos)
	            chordLength = intPos;

	          if (token < 5 || token === 7 || intPos !== Math.round(intPos))
	            return new Error('Invalid interval alteration: ' + token);

	          quality = notes[intPos][0];

	          // Alterate the quality of the interval according the accidentals
	          if (sharp) {
	            if (quality === 'd')
	              quality = 'm';
	            else if (quality === 'm')
	              quality = 'M';
	            else if (quality === 'M' || quality === 'P')
	              quality = 'A';
	          } else if (flat) {
	            if (quality === 'A')
	              quality = 'M';
	            else if (quality === 'M')
	              quality = 'm';
	            else if (quality === 'm' || quality === 'P')
	              quality = 'd';
	          }

	          sharp = flat = false;
	          notes[intPos] = quality + token;
	        }
	      });
	      parsing = 'ended';
	    } else if (parsing === 'ended') {
	      break;
	    }
	  }

	  return notes.slice(0, chordLength + 1).concat(additionals);
	}


/***/ }),
/* 53 */
/***/ (function(module, exports, __webpack_require__) {

	var knowledge = __webpack_require__(47);
	var Interval = __webpack_require__(49);

	var scales = {
	  aeolian: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
	  blues: ['P1', 'm3', 'P4', 'A4', 'P5', 'm7'],
	  chromatic: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
	  dorian: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
	  doubleharmonic: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'M7'],
	  harmonicminor: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
	  ionian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
	  locrian: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
	  lydian: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
	  majorpentatonic: ['P1', 'M2', 'M3', 'P5', 'M6'],
	  melodicminor: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
	  minorpentatonic: ['P1', 'm3', 'P4', 'P5', 'm7'],
	  mixolydian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
	  phrygian: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7']
	}

	// synonyms
	scales.harmonicchromatic = scales.chromatic;
	scales.minor = scales.aeolian;
	scales.major = scales.ionian;
	scales.flamenco = scales.doubleharmonic;

	function Scale(tonic, scale) {
	  if (!(this instanceof Scale)) return new Scale(tonic, scale);
	  var scaleName, i;
	  if (!('coord' in tonic)) {
	    throw new Error('Invalid Tonic');
	  }

	  if (typeof scale === 'string') {
	    scaleName = scale;
	    scale = scales[scale];
	    if (!scale)
	      throw new Error('Invalid Scale');
	  } else {
	    for (i in scales) {
	      if (scales.hasOwnProperty(i)) {
	        if (scales[i].toString() === scale.toString()) {
	          scaleName = i;
	          break;
	        }
	      }
	    }
	  }

	  this.name = scaleName;
	  this.tonic = tonic;
	  this.scale = scale;
	}

	Scale.prototype = {
	  notes: function() {
	    var notes = [];

	    for (var i = 0, length = this.scale.length; i < length; i++) {
	      notes.push(this.tonic.interval(this.scale[i]));
	    }

	    return notes;
	  },

	  simple: function() {
	    return this.notes().map(function(n) { return n.toString(true); });
	  },

	  type: function() {
	    var length = this.scale.length - 2;
	    if (length < 8) {
	      return ['di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa'][length] +
	        'tonic';
	    }
	  },

	  get: function(i) {
	    i = (typeof i === 'string' && i in knowledge.stepNumber) ? knowledge.stepNumber[i] : i;

	    return this.tonic.interval(this.scale[i - 1]);
	  },

	  solfege: function(index, showOctaves) {
	    if (index)
	      return this.get(index).solfege(this, showOctaves);

	    return this.notes().map(function(n) {
	      return n.solfege(this, showOctaves);
	    });
	  },

	  interval: function(interval) {
	    interval = (typeof interval === 'string') ?
	      Interval.toCoord(interval) : interval;
	    return new Scale(this.tonic.interval(interval), this.scale);
	  },

	  transpose: function(interval) {
	    var scale = this.interval(interval);
	    this.scale = scale.scale;
	    this.tonic = scale.tonic;

	    return this;
	  }
	};

	module.exports = Scale;


/***/ }),
/* 54 */
/***/ (function(module, exports, __webpack_require__) {

	var knowledge = __webpack_require__(47);

	module.exports = function(teoria) {
	  var Note = teoria.Note;
	  var Chord = teoria.Chord;
	  var Scale = teoria.Scale;

	  Note.prototype.chord = function(chord) {
	    chord = (chord in knowledge.chordShort) ? knowledge.chordShort[chord] : chord;

	    return new Chord(this, chord);
	  }

	  Note.prototype.scale = function(scale) {
	    return new Scale(this, scale);
	  }
	}


/***/ }),
/* 55 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(56), __webpack_require__(58), __webpack_require__(78)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Tone, Oscillator, PolySynth, SimpleSynth) {

		var Synth = function(){

			this.synth = new PolySynth(8, SimpleSynth).set({
				"volume" : -8,
				"oscillator" : {
					"type" : "sine6"
				}, 
				"envelope" : {
					"attack" :  0.015,
					"decay" :  0.25,
					"sustain" :  0.08,
					"release" :  0.5,
				},
			}).toMaster();

			this.synth.stealVoices = true;
		};

		Synth.prototype.triggerAttackRelease = function(note, duration, time, vel){
			duration = Math.max(duration, 0.2);
			this.synth.triggerAttackRelease(note, duration, time, vel * 0.5);
		};

		Synth.prototype.releaseAll = function(){
			this.synth.releaseAll();
		};

		return Synth;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 56 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9), __webpack_require__(57), __webpack_require__(5)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.Oscillator supports a number of features including
		 *         phase rotation, multiple oscillator types (see Tone.Oscillator.type), 
		 *         and Transport syncing (see Tone.Oscillator.syncFrequency).
		 *
		 *  @constructor
		 *  @extends {Tone.Source}
		 *  @param {Frequency} [frequency] Starting frequency
		 *  @param {string} [type] The oscillator type. Read more about type below.
		 *  @example
		 * //make and start a 440hz sine tone
		 * var osc = new Tone.Oscillator(440, "sine").toMaster().start();
		 */
		Tone.Oscillator = function(){
			
			var options = this.optionsObject(arguments, ["frequency", "type"], Tone.Oscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  the main oscillator
			 *  @type {OscillatorNode}
			 *  @private
			 */
			this._oscillator = null;
			
			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The detune control signal.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = new Tone.Signal(options.detune, Tone.Type.Cents);

			/**
			 *  the periodic wave
			 *  @type {PeriodicWave}
			 *  @private
			 */
			this._wave = null;

			/**
			 *  The partials of the oscillator
			 *  @type {Array}
			 *  @private
			 */
			this._partials = this.defaultArg(options.partials, [1]);

			/**
			 *  the phase of the oscillator
			 *  between 0 - 360
			 *  @type {number}
			 *  @private
			 */
			this._phase = options.phase;

			/**
			 *  the type of the oscillator
			 *  @type {string}
			 *  @private
			 */
			this._type = null;
			
			//setup
			this.type = options.type;
			this.phase = this._phase;
			this._readOnly(["frequency", "detune"]);
		};

		Tone.extend(Tone.Oscillator, Tone.Source);

		/**
		 *  the default parameters
		 *  @type {Object}
		 */
		Tone.Oscillator.defaults = {
			"type" : "sine",
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"partials" : []
		};

		/**
		 *  The Oscillator types
		 *  @enum {String}
		 */
		Tone.Oscillator.Type = {
			Sine : "sine",
			Triangle : "triangle",
			Sawtooth : "sawtooth",
			Square : "square",
			Custom : "custom"
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} [time=now] 
		 *  @private
		 */
		Tone.Oscillator.prototype._start = function(time){
			//new oscillator with previous values
			this._oscillator = this.context.createOscillator();
			this._oscillator.setPeriodicWave(this._wave);
			//connect the control signal to the oscillator frequency & detune
			this._oscillator.connect(this.output);
			this.frequency.connect(this._oscillator.frequency);
			this.detune.connect(this._oscillator.detune);
			//start the oscillator
			this._oscillator.start(this.toSeconds(time));
		};

		/**
		 *  stop the oscillator
		 *  @private
		 *  @param  {Time} [time=now] (optional) timing parameter
		 *  @returns {Tone.Oscillator} this
		 */
		Tone.Oscillator.prototype._stop = function(time){
			if (this._oscillator){
				this._oscillator.stop(this.toSeconds(time));
				this._oscillator = null;
			}
			return this;
		};

		/**
		 *  Sync the signal to the Transport's bpm. Any changes to the transports bpm,
		 *  will also affect the oscillators frequency. 
		 *  @returns {Tone.Oscillator} this
		 *  @example
		 * Tone.Transport.bpm.value = 120;
		 * osc.frequency.value = 440;
		 * //the ration between the bpm and the frequency will be maintained
		 * osc.syncFrequency();
		 * Tone.Transport.bpm.value = 240; 
		 * // the frequency of the oscillator is doubled to 880
		 */
		Tone.Oscillator.prototype.syncFrequency = function(){
			Tone.Transport.syncSignal(this.frequency);
			return this;
		};

		/**
		 *  Unsync the oscillator's frequency from the Transport. 
		 *  See Tone.Oscillator.syncFrequency
		 *  @returns {Tone.Oscillator} this
		 */
		Tone.Oscillator.prototype.unsyncFrequency = function(){
			Tone.Transport.unsyncSignal(this.frequency);
			return this;
		};

		/**
		 * The type of the oscillator: either sine, square, triangle, or sawtooth. Also capable of
		 * setting the first x number of partials of the oscillator. For example: "sine4" would
		 * set be the first 4 partials of the sine wave and "triangle8" would set the first
		 * 8 partials of the triangle wave.
		 * <br><br> 
		 * Uses PeriodicWave internally even for native types so that it can set the phase. 
		 * PeriodicWave equations are from the 
		 * [Webkit Web Audio implementation](https://code.google.com/p/chromium/codesearch#chromium/src/third_party/WebKit/Source/modules/webaudio/PeriodicWave.cpp&sq=package:chromium).
		 *  
		 * @memberOf Tone.Oscillator#
		 * @type {string}
		 * @name type
		 * @example
		 * //set it to a square wave
		 * osc.type = "square";
		 * @example
		 * //set the first 6 partials of a sawtooth wave
		 * osc.type = "sawtooth6";
		 */
		Object.defineProperty(Tone.Oscillator.prototype, "type", {
			get : function(){
				return this._type;
			},
			set : function(type){
				var coefs = this._getRealImaginary(type, this._phase);
				var periodicWave = this.context.createPeriodicWave(coefs[0], coefs[1]);
				this._wave = periodicWave;
				if (this._oscillator !== null){
					this._oscillator.setPeriodicWave(this._wave);
				}
				this._type = type;
			}
		});

		/**
		 *  Returns the real and imaginary components based 
		 *  on the oscillator type.
		 *  @returns {Array} [real, imaginary]
		 *  @private
		 */
		Tone.Oscillator.prototype._getRealImaginary = function(type, phase){
			var fftSize = 4096;
			var periodicWaveSize = fftSize / 2;

			var real = new Float32Array(periodicWaveSize);
			var imag = new Float32Array(periodicWaveSize);
			
			var partialCount = 1;
			if (type === Tone.Oscillator.Type.Custom){
				partialCount = this._partials.length + 1;
				periodicWaveSize = partialCount;
			} else {
				var partial = /^(sine|triangle|square|sawtooth)(\d+)$/.exec(type);
				if (partial){
					partialCount = parseInt(partial[2]) + 1;
					type = partial[1];
					partialCount = Math.max(partialCount, 2);
					periodicWaveSize = partialCount;
				}
			}

			for (var n = 1; n < periodicWaveSize; ++n) {
				var piFactor = 2 / (n * Math.PI);
				var b; 
				switch (type) {
					case Tone.Oscillator.Type.Sine: 
						b = (n <= partialCount) ? 1 : 0;
						break;
					case Tone.Oscillator.Type.Square:
						b = (n & 1) ? 2 * piFactor : 0;
						break;
					case Tone.Oscillator.Type.Sawtooth:
						b = piFactor * ((n & 1) ? 1 : -1);
						break;
					case Tone.Oscillator.Type.Triangle:
						if (n & 1) {
							b = 2 * (piFactor * piFactor) * ((((n - 1) >> 1) & 1) ? -1 : 1);
						} else {
							b = 0;
						}
						break;
					case Tone.Oscillator.Type.Custom: 
						b = this._partials[n - 1];
						break;
					default:
						throw new Error("invalid oscillator type: "+type);
				}
				if (b !== 0){
					real[n] = -b * Math.sin(phase * n);
					imag[n] = b * Math.cos(phase * n);
				} else {
					real[n] = 0;
					imag[n] = 0;
				}
			}
			return [real, imag];
		};

		/**
		 *  Compute the inverse FFT for a given phase.	
		 *  @param  {Float32Array}  real
		 *  @param  {Float32Array}  imag 
		 *  @param  {NormalRange}  phase 
		 *  @return  {AudioRange}
		 *  @private
		 */
		Tone.Oscillator.prototype._inverseFFT = function(real, imag, phase){
			var sum = 0;
			var len = real.length;
			for (var i = 0; i < len; i++){
				sum += real[i] * Math.cos(i * phase) + imag[i] * Math.sin(i * phase);
			}
			return sum;
		};

		/**
		 *  Returns the initial value of the oscillator.
		 *  @return  {AudioRange}
		 *  @private
		 */
		Tone.Oscillator.prototype._getInitialValue = function(){
			var coefs = this._getRealImaginary(this._type, 0);
			var real = coefs[0];
			var imag = coefs[1];
			var maxValue = 0;
			var twoPi = Math.PI * 2;
			//check for peaks in 8 places
			for (var i = 0; i < 8; i++){
				maxValue = Math.max(this._inverseFFT(real, imag, (i / 8) * twoPi), maxValue);
			}
			return -this._inverseFFT(real, imag, this._phase) / maxValue;
		};

		/**
		 * The partials of the waveform. A partial represents 
		 * the amplitude at a harmonic. The first harmonic is the 
		 * fundamental frequency, the second is the octave and so on
		 * following the harmonic series. 
		 * Setting this value will automatically set the type to "custom". 
		 * The value is an empty array when the type is not "custom". 
		 * @memberOf Tone.Oscillator#
		 * @type {Array}
		 * @name partials
		 * @example
		 * osc.partials = [1, 0.2, 0.01];
		 */
		Object.defineProperty(Tone.Oscillator.prototype, "partials", {
			get : function(){
				if (this._type !== Tone.Oscillator.Type.Custom){
					return [];
				} else {
					return this._partials;
				}
			}, 
			set : function(partials){
				this._partials = partials;
				this.type = Tone.Oscillator.Type.Custom;
			}
		});

		/**
		 * The phase of the oscillator in degrees. 
		 * @memberOf Tone.Oscillator#
		 * @type {Degrees}
		 * @name phase
		 * @example
		 * osc.phase = 180; //flips the phase of the oscillator
		 */
		Object.defineProperty(Tone.Oscillator.prototype, "phase", {
			get : function(){
				return this._phase * (180 / Math.PI);
			}, 
			set : function(phase){
				this._phase = phase * Math.PI / 180;
				//reset the type
				this.type = this._type;
			}
		});

		/**
		 *  Dispose and disconnect.
		 *  @return {Tone.Oscillator} this
		 */
		Tone.Oscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			if (this._oscillator !== null){
				this._oscillator.disconnect();
				this._oscillator = null;
			}
			this._wave = null;
			this._writable(["frequency", "detune"]);
			this.frequency.dispose();
			this.frequency = null;
			this.detune.dispose();
			this.detune = null;
			this._partials = null;
			return this;
		};

		return Tone.Oscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 57 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(5), __webpack_require__(38), __webpack_require__(37),
		__webpack_require__(12), __webpack_require__(16), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";
		
		/**
		 *  @class  Base class for sources. Sources have start/stop methods
		 *          and the ability to be synced to the 
		 *          start/stop of Tone.Transport. 
		 *
		 *  @constructor
		 *  @extends {Tone}
		 *  @example
		 * //Multiple state change events can be chained together,
		 * //but must be set in the correct order and with ascending times
		 * 
		 * // OK
		 * state.start().stop("+0.2");
		 * // AND
		 * state.start().stop("+0.2").start("+0.4").stop("+0.7")
		 *
		 * // BAD
		 * state.stop("+0.2").start();
		 * // OR
		 * state.start("+0.3").stop("+0.2");
		 * 
		 */	
		Tone.Source = function(options){
			//Sources only have an output and no input
			Tone.call(this);

			options = this.defaultArg(options, Tone.Source.defaults);

			/**
			 *  The output volume node
			 *  @type  {Tone.Volume}
			 *  @private
			 */
			this._volume = this.output = new Tone.Volume(options.volume);

			/**
			 * The volume of the output in decibels.
			 * @type {Decibels}
			 * @signal
			 * @example
			 * source.volume.value = -6;
			 */
			this.volume = this._volume.volume;
			this._readOnly("volume");

			/**
			 * 	Keep track of the scheduled state.
			 *  @type {Tone.TimelineState}
			 *  @private
			 */
			this._state = new Tone.TimelineState(Tone.State.Stopped);

			/**
			 *  The synced `start` callback function from the transport
			 *  @type {Function}
			 *  @private
			 */
			this._syncStart = function(time, offset){
				time = this.toSeconds(time);
				time += this.toSeconds(this._startDelay);
				this.start(time, offset);
			}.bind(this);

			/**
			 *  The synced `stop` callback function from the transport
			 *  @type {Function}
			 *  @private
			 */
			this._syncStop = this.stop.bind(this);

			/**
			 *  The offset from the start of the Transport `start`
			 *  @type {Time}
			 *  @private
			 */
			this._startDelay = 0;

			//make the output explicitly stereo
			this._volume.output.output.channelCount = 2;
			this._volume.output.output.channelCountMode = "explicit";
		};

		Tone.extend(Tone.Source);

		/**
		 *  The default parameters
		 *  @static
		 *  @const
		 *  @type {Object}
		 */
		Tone.Source.defaults = {
			"volume" : 0,
		};

		/**
		 *  Returns the playback state of the source, either "started" or "stopped".
		 *  @type {Tone.State}
		 *  @readOnly
		 *  @memberOf Tone.Source#
		 *  @name state
		 */
		Object.defineProperty(Tone.Source.prototype, "state", {
			get : function(){
				return this._state.getStateAtTime(this.now());
			}
		});

		/**
		 *  Start the source at the specified time. If no time is given, 
		 *  start the source now.
		 *  @param  {Time} [time=now] When the source should be started.
		 *  @returns {Tone.Source} this
		 *  @example
		 * source.start("+0.5"); //starts the source 0.5 seconds from now
		 */
		Tone.Source.prototype.start = function(time){
			time = this.toSeconds(time);
			if (this._state.getStateAtTime(time) !== Tone.State.Started || this.retrigger){
				this._state.setStateAtTime(Tone.State.Started, time);
				if (this._start){
					this._start.apply(this, arguments);
				}
			}
			return this;
		};

		/**
		 *  Stop the source at the specified time. If no time is given, 
		 *  stop the source now.
		 *  @param  {Time} [time=now] When the source should be stopped. 
		 *  @returns {Tone.Source} this
		 *  @example
		 * source.stop(); // stops the source immediately
		 */
		Tone.Source.prototype.stop = function(time){
			time = this.toSeconds(time);
			if (this._state.getStateAtTime(time) === Tone.State.Started){
				this._state.setStateAtTime(Tone.State.Stopped, time);
				if (this._stop){
					this._stop.apply(this, arguments);
				}
			}
			return this;
		};
		
		/**
		 *  Sync the source to the Transport so that when the transport
		 *  is started, this source is started and when the transport is stopped
		 *  or paused, so is the source. 
		 *
		 *  @param {Time} [delay=0] Delay time before starting the source after the
		 *                               Transport has started. 
		 *  @returns {Tone.Source} this
		 *  @example
		 * //sync the source to start 1 measure after the transport starts
		 * source.sync("1m");
		 * //start the transport. the source will start 1 measure later. 
		 * Tone.Transport.start();
		 */
		Tone.Source.prototype.sync = function(delay){
			this._startDelay = this.defaultArg(delay, 0);
			Tone.Transport.on("start", this._syncStart);
			Tone.Transport.on("stop pause", this._syncStop);
			return this;
		};

		/**
		 *  Unsync the source to the Transport. See Tone.Source.sync
		 *  @returns {Tone.Source} this
		 */
		Tone.Source.prototype.unsync = function(){
			this._startDelay = 0;
			Tone.Transport.off("start", this._syncStart);
			Tone.Transport.off("stop pause", this._syncStop);
			return this;
		};

		/**
		 *	Clean up.
		 *  @return {Tone.Source} this
		 */
		Tone.Source.prototype.dispose = function(){
			this.stop();
			Tone.prototype.dispose.call(this);
			this.unsync();
			this._writable("volume");
			this._volume.dispose();
			this._volume = null;
			this.volume = null;
			this._state.dispose();
			this._state = null;
			this._syncStart = null;
			this._syncStart = null;
		};

		return Tone.Source;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 58 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(59), __webpack_require__(57)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.PolySynth handles voice creation and allocation for any
		 *          instruments passed in as the second paramter. PolySynth is 
		 *          not a synthesizer by itself, it merely manages voices of 
		 *          one of the other types of synths, allowing any of the 
		 *          monophonic synthesizers to be polyphonic. 
		 *
		 *  @constructor
		 *  @extends {Tone.Instrument}
		 *  @param {number|Object} [polyphony=4] The number of voices to create
		 *  @param {function} [voice=Tone.MonoSynth] The constructor of the voices
		 *                                            uses Tone.MonoSynth by default. 
		 *  @example
		 * //a polysynth composed of 6 Voices of MonoSynth
		 * var synth = new Tone.PolySynth(6, Tone.MonoSynth).toMaster();
		 * //set the attributes using the set interface
		 * synth.set("detune", -1200);
		 * //play a chord
		 * synth.triggerAttackRelease(["C4", "E4", "A4"], "4n");
		 */
		Tone.PolySynth = function(){

			Tone.Instrument.call(this);

			var options = this.optionsObject(arguments, ["polyphony", "voice"], Tone.PolySynth.defaults);
			options = this.defaultArg(options, Tone.Instrument.defaults);

			/**
			 *  the array of voices
			 *  @type {Array}
			 */
			this.voices = new Array(options.polyphony);

			/**
			 *  The queue of voices with data about last trigger
			 *  and the triggered note
			 *  @private
			 *  @type {Array}
			 */
			this._triggers = new Array(options.polyphony);

			//create the voices
			for (var i = 0; i < options.polyphony; i++){
				var v = new options.voice(arguments[2], arguments[3]);
				this.voices[i] = v;
				v.connect(this.output);
				this._triggers[i] = {
					release : -1,
					note : null,
					voice : v
				};
			}

			//set the volume initially
			this.volume.value = options.volume;
		};

		Tone.extend(Tone.PolySynth, Tone.Instrument);

		/**
		 *  the defaults
		 *  @const
		 *  @static
		 *  @type {Object}
		 */
		Tone.PolySynth.defaults = {
			"polyphony" : 4,
			"volume" : 0,
			"voice" : Tone.MonoSynth
		};

		/**
		 *  Trigger the attack portion of the note
		 *  @param  {Frequency|Array} notes The notes to play. Accepts a single
		 *                                  Frequency or an array of frequencies.
		 *  @param  {Time} [time=now]  The start time of the note.
		 *  @param {number} [velocity=1] The velocity of the note.
		 *  @returns {Tone.PolySynth} this
		 *  @example
		 * //trigger a chord immediately with a velocity of 0.2
		 * poly.triggerAttack(["Ab3", "C4", "F5"], undefined, 0.2);
		 */
		Tone.PolySynth.prototype.triggerAttack = function(notes, time, velocity){
			if (!Array.isArray(notes)){
				notes = [notes];
			}
			time = this.toSeconds(time);
			for (var i = 0; i < notes.length; i++){
				var val = notes[i];
				//trigger the oldest voice
				var oldest = this._triggers[0];
				var oldestIndex = 0;
				for (var j = 1; j < this._triggers.length; j++){
					if (this._triggers[j].release < oldest.release){
						oldest = this._triggers[j];
						oldestIndex = j;
					}
				}
				oldest.release = Infinity;
				oldest.note = JSON.stringify(val);
				oldest.voice.triggerAttack(val, time, velocity);
			}
			return this;
		};

		/**
		 *  Trigger the attack and release after the specified duration
		 *  
		 *  @param  {Frequency|Array} notes The notes to play. Accepts a single
		 *                                  Frequency or an array of frequencies.
		 *  @param  {Time} duration the duration of the note
		 *  @param  {Time} [time=now]     if no time is given, defaults to now
		 *  @param  {number} [velocity=1] the velocity of the attack (0-1)
		 *  @returns {Tone.PolySynth} this
		 *  @example
		 * //trigger a chord for a duration of a half note 
		 * poly.triggerAttackRelease(["Eb3", "G4", "C5"], "2n");
		 */
		Tone.PolySynth.prototype.triggerAttackRelease = function(notes, duration, time, velocity){
			time = this.toSeconds(time);
			this.triggerAttack(notes, time, velocity);
			this.triggerRelease(notes, time + this.toSeconds(duration));
			return this;
		};

		/**
		 *  Trigger the release of the note. Unlike monophonic instruments, 
		 *  a note (or array of notes) needs to be passed in as the first argument.
		 *  @param  {Frequency|Array} notes The notes to play. Accepts a single
		 *                                  Frequency or an array of frequencies.
		 *  @param  {Time} [time=now]  When the release will be triggered. 
		 *  @returns {Tone.PolySynth} this
		 *  @example
		 * poly.triggerRelease(["Ab3", "C4", "F5"], "+2n");
		 */
		Tone.PolySynth.prototype.triggerRelease = function(notes, time){
			if (!Array.isArray(notes)){
				notes = [notes];
			}
			time = this.toSeconds(time);
			for (var i = 0; i < notes.length; i++){
				//get the voice
				var stringified = JSON.stringify(notes[i]);
				for (var v = 0; v < this._triggers.length; v++){
					var desc = this._triggers[v];
					if (desc.note === stringified && desc.release > time){
						desc.voice.triggerRelease(time);
						desc.release = time;
					}
				}
			}
			return this;
		};

		/**
		 *  Set a member/attribute of the voices. 
		 *  @param {Object|string} params
		 *  @param {number=} value
		 *  @param {Time=} rampTime
		 *  @returns {Tone.PolySynth} this
		 *  @example
		 * poly.set({
		 * 	"filter" : {
		 * 		"type" : "highpass"
		 * 	},
		 * 	"envelope" : {
		 * 		"attack" : 0.25
		 * 	}
		 * });
		 */
		Tone.PolySynth.prototype.set = function(params, value, rampTime){
			for (var i = 0; i < this.voices.length; i++){
				this.voices[i].set(params, value, rampTime);
			}
			return this;
		};

		/**
		 *  Get the synth's attributes. Given no arguments get
		 *  will return all available object properties and their corresponding
		 *  values. Pass in a single attribute to retrieve or an array
		 *  of attributes. The attribute strings can also include a "."
		 *  to access deeper properties.
		 *  @param {Array=} params the parameters to get, otherwise will return 
		 *  					   all available.
		 */
		Tone.PolySynth.prototype.get = function(params){
			return this.voices[0].get(params);
		};

		/**
		 *  Trigger the release portion of all the currently active voices.
		 *  @param {Time} [time=now] When the notes should be released.
		 *  @return {Tone.PolySynth} this
		 */
		Tone.PolySynth.prototype.releaseAll = function(time){
			time = this.toSeconds(time);
			for (var i = 0; i < this._triggers.length; i++){
				var desc = this._triggers[i];
				if (desc.release > time){
					desc.release = time;
					desc.voice.triggerRelease(time);
				}
			}
			return this;
		};

		/**
		 *  Clean up.
		 *  @returns {Tone.PolySynth} this
		 */
		Tone.PolySynth.prototype.dispose = function(){
			Tone.Instrument.prototype.dispose.call(this);
			for (var i = 0; i < this.voices.length; i++){
				this.voices[i].dispose();
				this.voices[i] = null;
			}
			this.voices = null;
			this._triggers = null;
			return this;
		};

		return Tone.PolySynth;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 59 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(60), __webpack_require__(63), 
		__webpack_require__(68), __webpack_require__(9), __webpack_require__(75), __webpack_require__(76)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.MonoSynth is composed of one oscillator, one filter, and two envelopes.
		 *          The amplitude of the Tone.Oscillator and the cutoff frequency of the 
		 *          Tone.Filter are controlled by Tone.Envelopes. 
		 *          <img src="https://docs.google.com/drawings/d/1gaY1DF9_Hzkodqf8JI1Cg2VZfwSElpFQfI94IQwad38/pub?w=924&h=240">
		 *          
		 *  @constructor
		 *  @extends {Tone.Monophonic}
		 *  @param {Object} [options] the options available for the synth 
		 *                          see defaults below
		 *  @example
		 * var synth = new Tone.MonoSynth({
		 * 	"oscillator" : {
		 * 		"type" : "square"
		 *  },
		 *  "envelope" : {
		 *  	"attack" : 0.1
		 *  }
		 * }).toMaster();
		 * synth.triggerAttackRelease("C4", "8n");
		 */
		Tone.MonoSynth = function(options){

			//get the defaults
			options = this.defaultArg(options, Tone.MonoSynth.defaults);
			Tone.Monophonic.call(this, options);

			/**
			 *  The oscillator.
			 *  @type {Tone.OmniOscillator}
			 */
			this.oscillator = new Tone.OmniOscillator(options.oscillator);

			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = this.oscillator.frequency;

			/**
			 *  The detune control.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this.oscillator.detune;

			/**
			 *  The filter.
			 *  @type {Tone.Filter}
			 */
			this.filter = new Tone.Filter(options.filter);

			/**
			 *  The filter envelope.
			 *  @type {Tone.FrequencyEnvelope}
			 */
			this.filterEnvelope = new Tone.FrequencyEnvelope(options.filterEnvelope);

			/**
			 *  The amplitude envelope.
			 *  @type {Tone.AmplitudeEnvelope}
			 */
			this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

			//connect the oscillators to the output
			this.oscillator.chain(this.filter, this.envelope, this.output);
			//start the oscillators
			this.oscillator.start();
			//connect the filter envelope
			this.filterEnvelope.connect(this.filter.frequency);
			this._readOnly(["oscillator", "frequency", "detune", "filter", "filterEnvelope", "envelope"]);
		};

		Tone.extend(Tone.MonoSynth, Tone.Monophonic);

		/**
		 *  @const
		 *  @static
		 *  @type {Object}
		 */
		Tone.MonoSynth.defaults = {
			"frequency" : "C4",
			"detune" : 0,
			"oscillator" : {
				"type" : "square"
			},
			"filter" : {
				"Q" : 6,
				"type" : "lowpass",
				"rolloff" : -24
			},
			"envelope" : {
				"attack" : 0.005,
				"decay" : 0.1,
				"sustain" : 0.9,
				"release" : 1
			},
			"filterEnvelope" : {
				"attack" : 0.06,
				"decay" : 0.2,
				"sustain" : 0.5,
				"release" : 2,
				"baseFrequency" : 200,
				"octaves" : 7,
				"exponent" : 2
			}
		};

		/**
		 *  start the attack portion of the envelope
		 *  @param {Time} [time=now] the time the attack should start
		 *  @param {NormalRange} [velocity=1] the velocity of the note (0-1)
		 *  @returns {Tone.MonoSynth} this
		 *  @private
		 */
		Tone.MonoSynth.prototype._triggerEnvelopeAttack = function(time, velocity){
			//the envelopes
			this.envelope.triggerAttack(time, velocity);
			this.filterEnvelope.triggerAttack(time);	
			return this;	
		};

		/**
		 *  start the release portion of the envelope
		 *  @param {Time} [time=now] the time the release should start
		 *  @returns {Tone.MonoSynth} this
		 *  @private
		 */
		Tone.MonoSynth.prototype._triggerEnvelopeRelease = function(time){
			this.envelope.triggerRelease(time);
			this.filterEnvelope.triggerRelease(time);
			return this;
		};


		/**
		 *  clean up
		 *  @returns {Tone.MonoSynth} this
		 */
		Tone.MonoSynth.prototype.dispose = function(){
			Tone.Monophonic.prototype.dispose.call(this);
			this._writable(["oscillator", "frequency", "detune", "filter", "filterEnvelope", "envelope"]);
			this.oscillator.dispose();
			this.oscillator = null;
			this.envelope.dispose();
			this.envelope = null;
			this.filterEnvelope.dispose();
			this.filterEnvelope = null;
			this.filter.dispose();
			this.filter = null;
			this.frequency = null;
			this.detune = null;
			return this;
		};

		return Tone.MonoSynth;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 60 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(61), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.AmplitudeEnvelope is a Tone.Envelope connected to a gain node. 
		 *          Unlike Tone.Envelope, which outputs the envelope's value, Tone.AmplitudeEnvelope accepts
		 *          an audio signal as the input and will apply the envelope to the amplitude
		 *          of the signal. Read more about ADSR Envelopes on [Wikipedia](https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope).
		 *  
		 *  @constructor
		 *  @extends {Tone.Envelope}
		 *  @param {Time|Object} [attack] The amount of time it takes for the envelope to go from 
		 *                               0 to it's maximum value. 
		 *  @param {Time} [decay]	The period of time after the attack that it takes for the envelope
		 *                       	to fall to the sustain value. 
		 *  @param {NormalRange} [sustain]	The percent of the maximum value that the envelope rests at until
		 *                                	the release is triggered. 
		 *  @param {Time} [release]	The amount of time after the release is triggered it takes to reach 0. 
		 *  @example
		 * var ampEnv = new Tone.AmplitudeEnvelope({
		 * 	"attack": 0.1,
		 * 	"decay": 0.2,
		 * 	"sustain": 1.0,
		 * 	"release": 0.8
		 * }).toMaster();
		 * //create an oscillator and connect it
		 * var osc = new Tone.Oscillator().connect(ampEnv).start();
		 * //trigger the envelopes attack and release "8t" apart
		 * ampEnv.triggerAttackRelease("8t");
		 */
		Tone.AmplitudeEnvelope = function(){

			Tone.Envelope.apply(this, arguments);

			/**
			 *  the input node
			 *  @type {GainNode}
			 *  @private
			 */
			this.input = this.output = new Tone.Gain();

			this._sig.connect(this.output.gain);
		};

		Tone.extend(Tone.AmplitudeEnvelope, Tone.Envelope);

		/**
		 *  Clean up
		 *  @return  {Tone.AmplitudeEnvelope}  this
		 */
		Tone.AmplitudeEnvelope.prototype.dispose = function(){
			this.input.dispose();
			this.input = null;
			Tone.Envelope.prototype.dispose.call(this);
			return this;
		};

		return Tone.AmplitudeEnvelope;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 61 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(8), 
		__webpack_require__(62), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.Envelope is an [ADSR](https://en.wikipedia.org/wiki/Synthesizer#ADSR_envelope)
		 *          envelope generator. Tone.Envelope outputs a signal which 
		 *          can be connected to an AudioParam or Tone.Signal. 
		 *          <img src="https://upload.wikimedia.org/wikipedia/commons/e/ea/ADSR_parameter.svg">
		 *
		 *  @constructor
		 *  @extends {Tone}
		 *  @param {Time} [attack] The amount of time it takes for the envelope to go from 
		 *                         0 to it's maximum value. 
		 *  @param {Time} [decay]	The period of time after the attack that it takes for the envelope
		 *                       	to fall to the sustain value. 
		 *  @param {NormalRange} [sustain]	The percent of the maximum value that the envelope rests at until
		 *                                	the release is triggered. 
		 *  @param {Time} [release]	The amount of time after the release is triggered it takes to reach 0. 
		 *  @example
		 * //an amplitude envelope
		 * var gainNode = Tone.context.createGain();
		 * var env = new Tone.Envelope({
		 * 	"attack" : 0.1,
		 * 	"decay" : 0.2,
		 * 	"sustain" : 1,
		 * 	"release" : 0.8,
		 * });
		 * env.connect(gainNode.gain);
		 */
		Tone.Envelope = function(){

			//get all of the defaults
			var options = this.optionsObject(arguments, ["attack", "decay", "sustain", "release"], Tone.Envelope.defaults);

			/** 
			 *  When triggerAttack is called, the attack time is the amount of
			 *  time it takes for the envelope to reach it's maximum value. 
			 *  @type {Time}
			 */
			this.attack = options.attack;

			/**
			 *  After the attack portion of the envelope, the value will fall
			 *  over the duration of the decay time to it's sustain value. 
			 *  @type {Time}
			 */
			this.decay = options.decay;
			
			/**
			 * 	The sustain value is the value 
			 * 	which the envelope rests at after triggerAttack is
			 * 	called, but before triggerRelease is invoked. 
			 *  @type {NormalRange}
			 */
			this.sustain = options.sustain;

			/**
			 *  After triggerRelease is called, the envelope's
			 *  value will fall to it's miminum value over the
			 *  duration of the release time. 
			 *  @type {Time}
			 */
			this.release = options.release;

			/**
			 *  the next time the envelope is at standby
			 *  @type {number}
			 *  @private
			 */
			this._attackCurve = Tone.Envelope.Type.Linear;

			/**
			 *  the next time the envelope is at standby
			 *  @type {number}
			 *  @private
			 */
			this._releaseCurve = Tone.Envelope.Type.Exponential;

			/**
			 *  the minimum output value
			 *  @type {number}
			 *  @private
			 */
			this._minOutput = 0.00001;

			/**
			 *  the signal
			 *  @type {Tone.TimelineSignal}
			 *  @private
			 */
			this._sig = this.output = new Tone.TimelineSignal();
			this._sig.setValueAtTime(0, 0);

			//set the attackCurve initially
			this.attackCurve = options.attackCurve;
			this.releaseCurve = options.releaseCurve;
		};

		Tone.extend(Tone.Envelope);

		/**
		 *  the default parameters
		 *  @static
		 *  @const
		 */
		Tone.Envelope.defaults = {
			"attack" : 0.01,
			"decay" : 0.1,
			"sustain" : 0.5,
			"release" : 1,
			"attackCurve" : "linear",
			"releaseCurve" : "exponential",
		};

		/**
		 * Read the current value of the envelope. Useful for 
		 * syncronizing visual output to the envelope. 
		 * @memberOf Tone.Envelope#
		 * @type {Number}
		 * @name value
		 * @readOnly
		 */
		Object.defineProperty(Tone.Envelope.prototype, "value", {
			get : function(){
				return this._sig.value;
			}
		});

		/**
		 * The slope of the attack. Either "linear" or "exponential". 
		 * @memberOf Tone.Envelope#
		 * @type {string}
		 * @name attackCurve
		 * @example
		 * env.attackCurve = "linear";
		 */
		Object.defineProperty(Tone.Envelope.prototype, "attackCurve", {
			get : function(){
				return this._attackCurve;
			}, 
			set : function(type){
				if (type === Tone.Envelope.Type.Linear || 
					type === Tone.Envelope.Type.Exponential){
					this._attackCurve = type;
				} else {
					throw Error("attackCurve must be either \"linear\" or \"exponential\". Invalid type: ", type);
				}
			}
		});

		/**
		 * The slope of the Release. Either "linear" or "exponential".
		 * @memberOf Tone.Envelope#
		 * @type {string}
		 * @name releaseCurve
		 * @example
		 * env.releaseCurve = "linear";
		 */
		Object.defineProperty(Tone.Envelope.prototype, "releaseCurve", {
			get : function(){
				return this._releaseCurve;
			}, 
			set : function(type){
				if (type === Tone.Envelope.Type.Linear || 
					type === Tone.Envelope.Type.Exponential){
					this._releaseCurve = type;
				} else {
					throw Error("releaseCurve must be either \"linear\" or \"exponential\". Invalid type: ", type);
				}
			}
		});

		/**
		 *  Trigger the attack/decay portion of the ADSR envelope. 
		 *  @param  {Time} [time=now] When the attack should start.
		 *  @param {NormalRange} [velocity=1] The velocity of the envelope scales the vales.
		 *                               number between 0-1
		 *  @returns {Tone.Envelope} this
		 *  @example
		 *  //trigger the attack 0.5 seconds from now with a velocity of 0.2
		 *  env.triggerAttack("+0.5", 0.2);
		 */
		Tone.Envelope.prototype.triggerAttack = function(time, velocity){
			//to seconds
			var now = this.now() + this.blockTime;
			time = this.toSeconds(time, now);
			var attack = this.toSeconds(this.attack);
			var decay = this.toSeconds(this.decay);
			velocity = this.defaultArg(velocity, 1);
			//check if it's not a complete attack
			var currentValue = this.getValueAtTime(time);
			if (currentValue > 0){
				//subtract the current value from the attack time
				var attackRate = 1 / attack;
				var remainingDistance = 1 - currentValue;
				//the attack is now the remaining time
				attack = remainingDistance / attackRate;
			}
			attack += time;
			//attack
			if (this._attackCurve === Tone.Envelope.Type.Linear){
				this._sig.linearRampToValueBetween(velocity, time, attack);
			} else {
				this._sig.exponentialRampToValueBetween(velocity, time, attack);
			}
			//decay
			this._sig.exponentialRampToValueBetween(velocity * this.sustain, attack + this.sampleTime, attack + decay);
			return this;
		};
		
		/**
		 *  Triggers the release of the envelope.
		 *  @param  {Time} [time=now] When the release portion of the envelope should start. 
		 *  @returns {Tone.Envelope} this
		 *  @example
		 *  //trigger release immediately
		 *  env.triggerRelease();
		 */
		Tone.Envelope.prototype.triggerRelease = function(time){
			var now = this.now() + this.blockTime;
			time = this.toSeconds(time, now);
			if (this.getValueAtTime(time) > 0){
				var release = this.toSeconds(this.release);
				if (this._releaseCurve === Tone.Envelope.Type.Linear){
					this._sig.linearRampToValueBetween(0, time, time + release);
				} else {
					this._sig.exponentialRampToValueBetween(0, time, release + time);
				}
			}
			return this;
		};

		/**
		 *  Get the scheduled value at the given time. This will
		 *  return the unconverted (raw) value.
		 *  @param  {Number}  time  The time in seconds.
		 *  @return  {Number}  The scheduled value at the given time.
		 */
		Tone.Envelope.prototype.getValueAtTime = function(time){
			return this._sig.getValueAtTime(time);
		};

		/**
		 *  triggerAttackRelease is shorthand for triggerAttack, then waiting
		 *  some duration, then triggerRelease. 
		 *  @param {Time} duration The duration of the sustain.
		 *  @param {Time} [time=now] When the attack should be triggered.
		 *  @param {number} [velocity=1] The velocity of the envelope. 
		 *  @returns {Tone.Envelope} this
		 *  @example
		 * //trigger the attack and then the release after 0.6 seconds.
		 * env.triggerAttackRelease(0.6);
		 */
		Tone.Envelope.prototype.triggerAttackRelease = function(duration, time, velocity) {
			time = this.toSeconds(time);
			this.triggerAttack(time, velocity);
			this.triggerRelease(time + this.toSeconds(duration));
			return this;
		};

		/**
		 *  Borrows the connect method from Tone.Signal. 
		 *  @function
		 *  @private
		 */
		Tone.Envelope.prototype.connect = Tone.Signal.prototype.connect;

		/**
		 *  Disconnect and dispose.
		 *  @returns {Tone.Envelope} this
		 */
		Tone.Envelope.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._sig.dispose();
			this._sig = null;
			return this;
		};

	 	/**
		 *  The phase of the envelope. 
		 *  @enum {string}
		 */
		Tone.Envelope.Type = {
			Linear : "linear",
			Exponential : "exponential",
	 	};

		return Tone.Envelope;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 62 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(10)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Pow applies an exponent to the incoming signal. The incoming signal
		 *         must be AudioRange.
		 *
		 *  @extends {Tone.SignalBase}
		 *  @constructor
		 *  @param {Positive} exp The exponent to apply to the incoming signal, must be at least 2. 
		 *  @example
		 * var pow = new Tone.Pow(2);
		 * var sig = new Tone.Signal(0.5).connect(pow);
		 * //output of pow is 0.25. 
		 */
		Tone.Pow = function(exp){

			/**
			 * the exponent
			 * @private
			 * @type {number}
			 */
			this._exp = this.defaultArg(exp, 1);

			/**
			 *  @type {WaveShaperNode}
			 *  @private
			 */
			this._expScaler = this.input = this.output = new Tone.WaveShaper(this._expFunc(this._exp), 8192);
		};

		Tone.extend(Tone.Pow, Tone.SignalBase);

		/**
		 * The value of the exponent.
		 * @memberOf Tone.Pow#
		 * @type {number}
		 * @name value
		 */
		Object.defineProperty(Tone.Pow.prototype, "value", {
			get : function(){
				return this._exp;
			},
			set : function(exp){
				this._exp = exp;
				this._expScaler.setMap(this._expFunc(this._exp));
			}
		});


		/**
		 *  the function which maps the waveshaper
		 *  @param   {number} exp
		 *  @return {function}
		 *  @private
		 */
		Tone.Pow.prototype._expFunc = function(exp){
			return function(val){
				return Math.pow(Math.abs(val), exp);
			};
		};

		/**
		 *  Clean up.
		 *  @returns {Tone.Pow} this
		 */
		Tone.Pow.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._expScaler.dispose();
			this._expScaler = null;
			return this;
		};

		return Tone.Pow;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 63 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(64), __webpack_require__(61)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.FrequencyEnvelope is a Tone.ScaledEnvelope, but instead of `min` and `max`
		 *         it's got a `baseFrequency` and `octaves` parameter. 
		 *
		 *  @extends {Tone.Envelope}
		 *  @constructor
		 *  @param {Time|Object} [attack]	the attack time in seconds
		 *  @param {Time} [decay]	the decay time in seconds
		 *  @param {number} [sustain] 	a percentage (0-1) of the full amplitude
		 *  @param {Time} [release]	the release time in seconds
		 *  @example
		 *  var env = new Tone.FrequencyEnvelope({
		 *  	"attack" : 0.2,
		 *  	"baseFrequency" : "C2",
		 *  	"octaves" : 4
		 *  });
		 *  scaledEnv.connect(oscillator.frequency);
		 */
		Tone.FrequencyEnvelope = function(){

			var options = this.optionsObject(arguments, ["attack", "decay", "sustain", "release"], Tone.Envelope.defaults);
			Tone.ScaledEnvelope.call(this, options);
			options = this.defaultArg(options, Tone.FrequencyEnvelope.defaults);

			/**
			 *  Stores the octave value
			 *  @type {Positive}
			 *  @private
			 */
			this._octaves = options.octaves;

			//setup
			this.baseFrequency = options.baseFrequency;
			this.octaves = options.octaves;
		};

		Tone.extend(Tone.FrequencyEnvelope, Tone.Envelope);

		/**
		 *  the default parameters
		 *  @static
		 */
		Tone.FrequencyEnvelope.defaults = {
			"baseFrequency" : 200,
			"octaves" : 4,
			"exponent" : 2
		};

		/**
		 * The envelope's mininum output value. This is the value which it
		 * starts at. 
		 * @memberOf Tone.FrequencyEnvelope#
		 * @type {Frequency}
		 * @name baseFrequency
		 */
		Object.defineProperty(Tone.FrequencyEnvelope.prototype, "baseFrequency", {
			get : function(){
				return this._scale.min;
			},
			set : function(min){
				this._scale.min = this.toFrequency(min);
			}
		});

		/**
		 * The number of octaves above the baseFrequency that the
		 * envelope will scale to.
		 * @memberOf Tone.FrequencyEnvelope#
		 * @type {Positive}
		 * @name octaves
		 */
		Object.defineProperty(Tone.FrequencyEnvelope.prototype, "octaves", {
			get : function(){
				return this._octaves;
			},
			set : function(octaves){
				this._octaves = octaves;
				this._scale.max = this.baseFrequency * Math.pow(2, octaves);
			}
		});

		/**
		 * The envelope's exponent value. 
		 * @memberOf Tone.FrequencyEnvelope#
		 * @type {number}
		 * @name exponent
		 */
		Object.defineProperty(Tone.FrequencyEnvelope.prototype, "exponent", {
			get : function(){
				return this._exp.value;
			},
			set : function(exp){
				this._exp.value = exp;
			}
		});
		
		/**
		 *  clean up
		 *  @returns {Tone.FrequencyEnvelope} this
		 */
		Tone.FrequencyEnvelope.prototype.dispose = function(){
			Tone.ScaledEnvelope.prototype.dispose.call(this);
			return this;
		};

		return Tone.FrequencyEnvelope;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 64 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(61), __webpack_require__(65)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.ScaledEnvelop is an envelope which can be scaled 
		 *         to any range. It's useful for applying an envelope 
		 *         to a frequency or any other non-NormalRange signal 
		 *         parameter. 
		 *
		 *  @extends {Tone.Envelope}
		 *  @constructor
		 *  @param {Time|Object} [attack]	the attack time in seconds
		 *  @param {Time} [decay]	the decay time in seconds
		 *  @param {number} [sustain] 	a percentage (0-1) of the full amplitude
		 *  @param {Time} [release]	the release time in seconds
		 *  @example
		 *  var scaledEnv = new Tone.ScaledEnvelope({
		 *  	"attack" : 0.2,
		 *  	"min" : 200,
		 *  	"max" : 2000
		 *  });
		 *  scaledEnv.connect(oscillator.frequency);
		 */
		Tone.ScaledEnvelope = function(){

			//get all of the defaults
			var options = this.optionsObject(arguments, ["attack", "decay", "sustain", "release"], Tone.Envelope.defaults);
			Tone.Envelope.call(this, options);
			options = this.defaultArg(options, Tone.ScaledEnvelope.defaults);

			/** 
			 *  scale the incoming signal by an exponent
			 *  @type {Tone.Pow}
			 *  @private
			 */
			this._exp = this.output = new Tone.Pow(options.exponent);

			/**
			 *  scale the signal to the desired range
			 *  @type {Tone.Multiply}
			 *  @private
			 */
			this._scale = this.output = new Tone.Scale(options.min, options.max);

			this._sig.chain(this._exp, this._scale);
		};

		Tone.extend(Tone.ScaledEnvelope, Tone.Envelope);

		/**
		 *  the default parameters
		 *  @static
		 */
		Tone.ScaledEnvelope.defaults = {
			"min" : 0,
			"max" : 1,
			"exponent" : 1
		};

		/**
		 * The envelope's min output value. This is the value which it
		 * starts at. 
		 * @memberOf Tone.ScaledEnvelope#
		 * @type {number}
		 * @name min
		 */
		Object.defineProperty(Tone.ScaledEnvelope.prototype, "min", {
			get : function(){
				return this._scale.min;
			},
			set : function(min){
				this._scale.min = min;
			}
		});

		/**
		 * The envelope's max output value. In other words, the value
		 * at the peak of the attack portion of the envelope. 
		 * @memberOf Tone.ScaledEnvelope#
		 * @type {number}
		 * @name max
		 */
		Object.defineProperty(Tone.ScaledEnvelope.prototype, "max", {
			get : function(){
				return this._scale.max;
			},
			set : function(max){
				this._scale.max = max;
			}
		});

		/**
		 * The envelope's exponent value. 
		 * @memberOf Tone.ScaledEnvelope#
		 * @type {number}
		 * @name exponent
		 */
		Object.defineProperty(Tone.ScaledEnvelope.prototype, "exponent", {
			get : function(){
				return this._exp.value;
			},
			set : function(exp){
				this._exp.value = exp;
			}
		});
		
		/**
		 *  clean up
		 *  @returns {Tone.ScaledEnvelope} this
		 */
		Tone.ScaledEnvelope.prototype.dispose = function(){
			Tone.Envelope.prototype.dispose.call(this);
			this._scale.dispose();
			this._scale = null;
			this._exp.dispose();
			this._exp = null;
			return this;
		};

		return Tone.ScaledEnvelope;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 65 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(66), __webpack_require__(67), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";
		
		/**
		 *  @class  Performs a linear scaling on an input signal.
		 *          Scales a NormalRange input to between
		 *          outputMin and outputMax.
		 *
		 *  @constructor
		 *  @extends {Tone.SignalBase}
		 *  @param {number} [outputMin=0] The output value when the input is 0. 
		 *  @param {number} [outputMax=1]	The output value when the input is 1. 
		 *  @example
		 * var scale = new Tone.Scale(50, 100);
		 * var signal = new Tone.Signal(0.5).connect(scale);
		 * //the output of scale equals 75
		 */
		Tone.Scale = function(outputMin, outputMax){

			/** 
			 *  @private
			 *  @type {number}
			 */
			this._outputMin = this.defaultArg(outputMin, 0);

			/** 
			 *  @private
			 *  @type {number}
			 */
			this._outputMax = this.defaultArg(outputMax, 1);


			/** 
			 *  @private
			 *  @type {Tone.Multiply}
			 *  @private
			 */
			this._scale = this.input = new Tone.Multiply(1);
			
			/** 
			 *  @private
			 *  @type {Tone.Add}
			 *  @private
			 */
			this._add = this.output = new Tone.Add(0);

			this._scale.connect(this._add);
			this._setRange();
		};

		Tone.extend(Tone.Scale, Tone.SignalBase);

		/**
		 * The minimum output value. This number is output when 
		 * the value input value is 0. 
		 * @memberOf Tone.Scale#
		 * @type {number}
		 * @name min
		 */
		Object.defineProperty(Tone.Scale.prototype, "min", {
			get : function(){
				return this._outputMin;
			},
			set : function(min){
				this._outputMin = min;
				this._setRange();
			}
		});

		/**
		 * The maximum output value. This number is output when 
		 * the value input value is 1. 
		 * @memberOf Tone.Scale#
		 * @type {number}
		 * @name max
		 */
		Object.defineProperty(Tone.Scale.prototype, "max", {
			get : function(){
				return this._outputMax;
			},
			set : function(max){
				this._outputMax = max;
				this._setRange();
			}
		});

		/**
		 *  set the values
		 *  @private
		 */
		Tone.Scale.prototype._setRange = function() {
			this._add.value = this._outputMin;
			this._scale.value = this._outputMax - this._outputMin;
		};

		/**
		 *  Clean up.
		 *  @returns {Tone.Scale} this
		 */
		Tone.Scale.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._add.dispose();
			this._add = null;
			this._scale.dispose();
			this._scale = null;
			return this;
		}; 

		return Tone.Scale;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 66 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Add a signal and a number or two signals. When no value is
		 *         passed into the constructor, Tone.Add will sum <code>input[0]</code>
		 *         and <code>input[1]</code>. If a value is passed into the constructor, 
		 *         the it will be added to the input.
		 *  
		 *  @constructor
		 *  @extends {Tone.Signal}
		 *  @param {number=} value If no value is provided, Tone.Add will sum the first
		 *                         and second inputs. 
		 *  @example
		 * var signal = new Tone.Signal(2);
		 * var add = new Tone.Add(2);
		 * signal.connect(add);
		 * //the output of add equals 4
		 *  @example
		 * //if constructed with no arguments
		 * //it will add the first and second inputs
		 * var add = new Tone.Add();
		 * var sig0 = new Tone.Signal(3).connect(add, 0, 0);
		 * var sig1 = new Tone.Signal(4).connect(add, 0, 1);
		 * //the output of add equals 7. 
		 */
		Tone.Add = function(value){

			Tone.call(this, 2, 0);

			/**
			 *  the summing node
			 *  @type {GainNode}
			 *  @private
			 */
			this._sum = this.input[0] = this.input[1] = this.output = this.context.createGain();

			/**
			 *  @private
			 *  @type {Tone.Signal}
			 */
			this._param = this.input[1] = new Tone.Signal(value);

			this._param.connect(this._sum);
		};

		Tone.extend(Tone.Add, Tone.Signal);
		
		/**
		 *  Clean up.
		 *  @returns {Tone.Add} this
		 */
		Tone.Add.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._sum.disconnect();
			this._sum = null;
			this._param.dispose();
			this._param = null;
			return this;
		}; 

		return Tone.Add;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 67 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Multiply two incoming signals. Or, if a number is given in the constructor, 
		 *          multiplies the incoming signal by that value. 
		 *
		 *  @constructor
		 *  @extends {Tone.Signal}
		 *  @param {number=} value Constant value to multiple. If no value is provided,
		 *                         it will return the product of the first and second inputs
		 *  @example
		 * var mult = new Tone.Multiply();
		 * var sigA = new Tone.Signal(3);
		 * var sigB = new Tone.Signal(4);
		 * sigA.connect(mult, 0, 0);
		 * sigB.connect(mult, 0, 1);
		 * //output of mult is 12.
		 *  @example
		 * var mult = new Tone.Multiply(10);
		 * var sig = new Tone.Signal(2).connect(mult);
		 * //the output of mult is 20. 
		 */
		Tone.Multiply = function(value){

			Tone.call(this, 2, 0);

			/**
			 *  the input node is the same as the output node
			 *  it is also the GainNode which handles the scaling of incoming signal
			 *  
			 *  @type {GainNode}
			 *  @private
			 */
			this._mult = this.input[0] = this.output = this.context.createGain();

			/**
			 *  the scaling parameter
			 *  @type {AudioParam}
			 *  @private
			 */
			this._param = this.input[1] = this.output.gain;
			
			this._param.value = this.defaultArg(value, 0);
		};

		Tone.extend(Tone.Multiply, Tone.Signal);

		/**
		 *  clean up
		 *  @returns {Tone.Multiply} this
		 */
		Tone.Multiply.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._mult.disconnect();
			this._mult = null;
			this._param = null;
			return this;
		}; 

		return Tone.Multiply;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }),
/* 68 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(56), __webpack_require__(69), __webpack_require__(70), 
		__webpack_require__(71), __webpack_require__(72), __webpack_require__(74)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.OmniOscillator aggregates Tone.Oscillator, Tone.PulseOscillator,
		 *         Tone.PWMOscillator, Tone.FMOscillator, Tone.AMOscillator, and Tone.FatOscillator
		 *         into one class. The oscillator class can be changed by setting the `type`. 
		 *         `omniOsc.type = "pwm"` will set it to the Tone.PWMOscillator. Prefixing
		 *         any of the basic types ("sine", "square4", etc.) with "fm", "am", or "fat"
		 *         will use the FMOscillator, AMOscillator or FatOscillator respectively. 
		 *         For example: `omniOsc.type = "fatsawtooth"` will create set the oscillator
		 *         to a FatOscillator of type "sawtooth". 
		 *
		 *  @extends {Tone.Oscillator}
		 *  @constructor
		 *  @param {Frequency} frequency The initial frequency of the oscillator.
		 *  @param {String} type The type of the oscillator.
		 *  @example
		 *  var omniOsc = new Tone.OmniOscillator("C#4", "pwm");
		 */
		Tone.OmniOscillator = function(){
			var options = this.optionsObject(arguments, ["frequency", "type"], Tone.OmniOscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The detune control
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = new Tone.Signal(options.detune, Tone.Type.Cents);

			/**
			 *  the type of the oscillator source
			 *  @type {String}
			 *  @private
			 */
			this._sourceType = undefined;

			/**
			 *  the oscillator
			 *  @type {Tone.Oscillator}
			 *  @private
			 */
			this._oscillator = null;

			//set the oscillator
			this.type = options.type;
			this._readOnly(["frequency", "detune"]);
			//set the options
			this.set(options);
		};

		Tone.extend(Tone.OmniOscillator, Tone.Oscillator);

		/**
		 *  default values
		 *  @static
		 *  @type {Object}
		 *  @const
		 */
		Tone.OmniOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"type" : "sine",
			"phase" : 0,
		};

		/**
		 *  @enum {String}
		 *  @private
		 */
		var OmniOscType = {
			Pulse : "PulseOscillator",
			PWM : "PWMOscillator",
			Osc : "Oscillator",
			FM : "FMOscillator",
			AM : "AMOscillator",
			Fat : "FatOscillator"
		};

		/**
		 *  start the oscillator
		 *  @param {Time} [time=now] the time to start the oscillator
		 *  @private
		 */
		Tone.OmniOscillator.prototype._start = function(time){
			this._oscillator.start(time);
		};

		/**
		 *  start the oscillator
		 *  @param {Time} [time=now] the time to start the oscillator
		 *  @private
		 */
		Tone.OmniOscillator.prototype._stop = function(time){
			this._oscillator.stop(time);
		};

		/**
		 * The type of the oscillator. Can be any of the basic types: sine, square, triangle, sawtooth. Or
		 * prefix the basic types with "fm", "am", or "fat" to use the FMOscillator, AMOscillator or FatOscillator
		 * types. The oscillator could also be set to "pwm" or "pulse". All of the parameters of the
		 * oscillator's class are accessible when the oscillator is set to that type, but throws an error 
		 * when it's not.
		 * 
		 * @memberOf Tone.OmniOscillator#
		 * @type {String}
		 * @name type
		 * @example
		 * omniOsc.type = "pwm";
		 * //modulationFrequency is parameter which is available
		 * //only when the type is "pwm". 
		 * omniOsc.modulationFrequency.value = 0.5;
		 * @example
		 * //an square wave frequency modulated by a sawtooth
		 * omniOsc.type = "fmsquare";
		 * omniOsc.modulationType = "sawtooth";
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "type", {
			get : function(){
				var prefix = "";
				if (this._sourceType === OmniOscType.FM){
					prefix = "fm";
				} else if (this._sourceType === OmniOscType.AM){
					prefix = "am";
				} else if (this._sourceType === OmniOscType.Fat){
					prefix = "fat";
				}
				return prefix + this._oscillator.type;
			}, 
			set : function(type){
				if (type.substr(0, 2) === "fm"){
					this._createNewOscillator(OmniOscType.FM);
					this._oscillator.type = type.substr(2);
				} else if (type.substr(0, 2) === "am"){
					this._createNewOscillator(OmniOscType.AM);
					this._oscillator.type = type.substr(2);
				} else if (type.substr(0, 3) === "fat"){
					this._createNewOscillator(OmniOscType.Fat);
					this._oscillator.type = type.substr(3);
				} else if (type === "pwm"){
					this._createNewOscillator(OmniOscType.PWM);
				} else if (type === "pulse"){
					this._createNewOscillator(OmniOscType.Pulse);
				} else {
					this._createNewOscillator(OmniOscType.Osc);
					this._oscillator.type = type;
				}
			}
		});

		/**
		 * The partials of the waveform. A partial represents 
		 * the amplitude at a harmonic. The first harmonic is the 
		 * fundamental frequency, the second is the octave and so on
		 * following the harmonic series. 
		 * Setting this value will automatically set the type to "custom". 
		 * The value is an empty array when the type is not "custom". 
		 * This is not available on "pwm" and "pulse" oscillator types.
		 * @memberOf Tone.OmniOscillator#
		 * @type {Array}
		 * @name partials
		 * @example
		 * osc.partials = [1, 0.2, 0.01];
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "partials", {
			get : function(){
				return this._oscillator.partials;
			}, 
			set : function(partials){
				this._oscillator.partials = partials;
			}
		});

		/**
		 *  Set a member/attribute of the oscillator. 
		 *  @param {Object|String} params
		 *  @param {number=} value
		 *  @param {Time=} rampTime
		 *  @returns {Tone.OmniOscillator} this
		 */
		Tone.OmniOscillator.prototype.set = function(params, value){
			//make sure the type is set first
			if (params === "type"){
				this.type = value;
			} else if (this.isObject(params) && params.hasOwnProperty("type")){
				this.type = params.type;
			}
			//then set the rest
			Tone.prototype.set.apply(this, arguments);
			return this;
		};

		/**
		 *  connect the oscillator to the frequency and detune signals
		 *  @private
		 */
		Tone.OmniOscillator.prototype._createNewOscillator = function(oscType){
			if (oscType !== this._sourceType){
				this._sourceType = oscType;
				var OscillatorConstructor = Tone[oscType];
				//short delay to avoid clicks on the change
				var now = this.now() + this.blockTime;
				if (this._oscillator !== null){
					var oldOsc = this._oscillator;
					oldOsc.stop(now);
					//dispose the old one
					setTimeout(function(){
						oldOsc.dispose();
						oldOsc = null;
					}, this.blockTime * 1000);
				}
				this._oscillator = new OscillatorConstructor();
				this.frequency.connect(this._oscillator.frequency);
				this.detune.connect(this._oscillator.detune);
				this._oscillator.connect(this.output);
				if (this.state === Tone.State.Started){
					this._oscillator.start(now);
				}
			}
		};

		/**
		 * The phase of the oscillator in degrees. 
		 * @memberOf Tone.OmniOscillator#
		 * @type {Degrees}
		 * @name phase
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "phase", {
			get : function(){
				return this._oscillator.phase;
			}, 
			set : function(phase){
				this._oscillator.phase = phase;
			}
		});

		/**
		 * The width of the oscillator (only if the oscillator is set to "pulse")
		 * @memberOf Tone.OmniOscillator#
		 * @type {NormalRange}
		 * @signal
		 * @name width
		 * @example
		 * var omniOsc = new Tone.OmniOscillator(440, "pulse");
		 * //can access the width attribute only if type === "pulse"
		 * omniOsc.width.value = 0.2; 
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "width", {
			get : function(){
				if (this._sourceType === OmniOscType.Pulse){
					return this._oscillator.width;
				} 
			}
		});

		/**
		 * The number of detuned oscillators
		 * @memberOf Tone.OmniOscillator#
		 * @type {Number}
		 * @name count
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "count", {
			get : function(){
				if (this._sourceType === OmniOscType.Fat){
					return this._oscillator.count;
				} 
			},
			set : function(count){
				if (this._sourceType === OmniOscType.Fat){
					this._oscillator.count = count;
				} 
			}
		});

		/**
		 * The detune spread between the oscillators. If "count" is
		 * set to 3 oscillators and the "spread" is set to 40,
		 * the three oscillators would be detuned like this: [-20, 0, 20]
		 * for a total detune spread of 40 cents. See Tone.FatOscillator
		 * for more info.
		 * @memberOf Tone.OmniOscillator#
		 * @type {Cents}
		 * @name spread
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "spread", {
			get : function(){
				if (this._sourceType === OmniOscType.Fat){
					return this._oscillator.spread;
				} 
			},
			set : function(spread){
				if (this._sourceType === OmniOscType.Fat){
					this._oscillator.spread = spread;
				} 
			}
		});

		/**
		 * The type of the modulator oscillator. Only if the oscillator
		 * is set to "am" or "fm" types. see. Tone.AMOscillator or Tone.FMOscillator
		 * for more info. 
		 * @memberOf Tone.OmniOscillator#
		 * @type {String}
		 * @name modulationType
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "modulationType", {
			get : function(){
				if (this._sourceType === OmniOscType.FM || this._sourceType === OmniOscType.AM){
					return this._oscillator.modulationType;
				} 
			},
			set : function(mType){
				if (this._sourceType === OmniOscType.FM || this._sourceType === OmniOscType.AM){
					this._oscillator.modulationType = mType;
				} 
			}
		});

		/**
		 * The modulation index which is in essence the depth or amount of the modulation. In other terms it is the 
		 * ratio of the frequency of the modulating signal (mf) to the amplitude of the 
		 * modulating signal (ma) -- as in ma/mf. 
		 * See Tone.FMOscillator for more info. 
		 * @type {Positive}
		 * @signal
		 * @name modulationIndex
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "modulationIndex", {
			get : function(){
				if (this._sourceType === OmniOscType.FM){
					return this._oscillator.modulationIndex;
				} 
			}
		});

		/**
		 *  Harmonicity is the frequency ratio between the carrier and the modulator oscillators. 
		 *  A harmonicity of 1 gives both oscillators the same frequency. 
		 *  Harmonicity = 2 means a change of an octave. See Tone.AMOscillator or Tone.FMOscillator
		 *  for more info. 
		 *  @memberOf Tone.OmniOscillator#
		 *  @signal
		 *  @type {Positive}
		 *  @name harmonicity
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "harmonicity", {
			get : function(){
				if (this._sourceType === OmniOscType.FM || this._sourceType === OmniOscType.AM){
					return this._oscillator.harmonicity;
				} 
			}
		});

		/**
		 * The modulationFrequency Signal of the oscillator 
		 * (only if the oscillator type is set to pwm). See 
		 * Tone.PWMOscillator for more info. 
		 * @memberOf Tone.OmniOscillator#
		 * @type {Frequency}
		 * @signal
		 * @name modulationFrequency
		 * @example
		 * var omniOsc = new Tone.OmniOscillator(440, "pwm");
		 * //can access the modulationFrequency attribute only if type === "pwm"
		 * omniOsc.modulationFrequency.value = 0.2; 
		 */
		Object.defineProperty(Tone.OmniOscillator.prototype, "modulationFrequency", {
			get : function(){
				if (this._sourceType === OmniOscType.PWM){
					return this._oscillator.modulationFrequency;
				} 
			}
		});

		/**
		 *  Clean up.
		 *  @return {Tone.OmniOscillator} this
		 */
		Tone.OmniOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._writable(["frequency", "detune"]);
			this.detune.dispose();
			this.detune = null;
			this.frequency.dispose();
			this.frequency = null;
			this._oscillator.dispose();
			this._oscillator = null;
			this._sourceType = null;
			return this;
		};

		return Tone.OmniOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 69 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(56), __webpack_require__(9), __webpack_require__(10)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.PulseOscillator is a pulse oscillator with control over pulse width,
		 *         also known as the duty cycle. At 50% duty cycle (width = 0.5) the wave is 
		 *         a square and only odd-numbered harmonics are present. At all other widths 
		 *         even-numbered harmonics are present. Read more 
		 *         [here](https://wigglewave.wordpress.com/2014/08/16/pulse-waveforms-and-harmonics/).
		 *
		 *  @constructor
		 *  @extends {Tone.Oscillator}
		 *  @param {Frequency} [frequency] The frequency of the oscillator
		 *  @param {NormalRange} [width] The width of the pulse
		 *  @example
		 * var pulse = new Tone.PulseOscillator("E5", 0.4).toMaster().start();
		 */
		Tone.PulseOscillator = function(){

			var options = this.optionsObject(arguments, ["frequency", "width"], Tone.Oscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The width of the pulse. 
			 *  @type {NormalRange}
			 *  @signal
			 */
			this.width = new Tone.Signal(options.width, Tone.Type.NormalRange);

			/**
			 *  gate the width amount
			 *  @type {GainNode}
			 *  @private
			 */
			this._widthGate = this.context.createGain();

			/**
			 *  the sawtooth oscillator
			 *  @type {Tone.Oscillator}
			 *  @private
			 */
			this._sawtooth = new Tone.Oscillator({
				frequency : options.frequency,
				detune : options.detune,
				type : "sawtooth",
				phase : options.phase
			});

			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = this._sawtooth.frequency;

			/**
			 *  The detune in cents. 
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this._sawtooth.detune;

			/**
			 *  Threshold the signal to turn it into a square
			 *  @type {Tone.WaveShaper}
			 *  @private
			 */
			this._thresh = new Tone.WaveShaper(function(val){
				if (val < 0){
					return -1;
				} else {
					return 1;
				}
			});

			//connections
			this._sawtooth.chain(this._thresh, this.output);
			this.width.chain(this._widthGate, this._thresh);
			this._readOnly(["width", "frequency", "detune"]);
		};

		Tone.extend(Tone.PulseOscillator, Tone.Oscillator);

		/**
		 *  The default parameters.
		 *  @static
		 *  @const
		 *  @type {Object}
		 */
		Tone.PulseOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"width" : 0.2,
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} time 
		 *  @private
		 */
		Tone.PulseOscillator.prototype._start = function(time){
			time = this.toSeconds(time);
			this._sawtooth.start(time);
			this._widthGate.gain.setValueAtTime(1, time);
		};

		/**
		 *  stop the oscillator
		 *  @param  {Time} time 
		 *  @private
		 */
		Tone.PulseOscillator.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._sawtooth.stop(time);
			//the width is still connected to the output. 
			//that needs to be stopped also
			this._widthGate.gain.setValueAtTime(0, time);
		};

		/**
		 * The phase of the oscillator in degrees.
		 * @memberOf Tone.PulseOscillator#
		 * @type {Degrees}
		 * @name phase
		 */
		Object.defineProperty(Tone.PulseOscillator.prototype, "phase", {
			get : function(){
				return this._sawtooth.phase;
			}, 
			set : function(phase){
				this._sawtooth.phase = phase;
			}
		});

		/**
		 * The type of the oscillator. Always returns "pulse".
		 * @readOnly
		 * @memberOf Tone.PulseOscillator#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.PulseOscillator.prototype, "type", {
			get : function(){
				return "pulse";
			}
		});

		/**
		 * The partials of the waveform. Cannot set partials for this waveform type
		 * @memberOf Tone.PulseOscillator#
		 * @type {Array}
		 * @name partials
		 * @private
		 */
		Object.defineProperty(Tone.PulseOscillator.prototype, "partials", {
			get : function(){
				return [];
			}
		});

		/**
		 *  Clean up method.
		 *  @return {Tone.PulseOscillator} this
		 */
		Tone.PulseOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._sawtooth.dispose();
			this._sawtooth = null;
			this._writable(["width", "frequency", "detune"]);
			this.width.dispose();
			this.width = null;
			this._widthGate.disconnect();
			this._widthGate = null;
			this._widthGate = null;
			this._thresh.disconnect();
			this._thresh = null;
			this.frequency = null;
			this.detune = null;
			return this;
		};

		return Tone.PulseOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 70 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(69), __webpack_require__(56), __webpack_require__(67)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.PWMOscillator modulates the width of a Tone.PulseOscillator 
		 *         at the modulationFrequency. This has the effect of continuously
		 *         changing the timbre of the oscillator by altering the harmonics 
		 *         generated.
		 *
		 *  @extends {Tone.Oscillator}
		 *  @constructor
		 *  @param {Frequency} frequency The starting frequency of the oscillator. 
		 *  @param {Frequency} modulationFrequency The modulation frequency of the width of the pulse. 
		 *  @example
		 *  var pwm = new Tone.PWMOscillator("Ab3", 0.3).toMaster().start();
		 */
		Tone.PWMOscillator = function(){
			var options = this.optionsObject(arguments, ["frequency", "modulationFrequency"], Tone.PWMOscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  the pulse oscillator
			 *  @type {Tone.PulseOscillator}
			 *  @private
			 */
			this._pulse = new Tone.PulseOscillator(options.modulationFrequency);
			//change the pulse oscillator type
			this._pulse._sawtooth.type = "sine";

			/**
			 *  the modulator
			 *  @type {Tone.Oscillator}
			 *  @private
			 */
			this._modulator = new Tone.Oscillator({
				"frequency" : options.frequency,
				"detune" : options.detune,
				"phase" : options.phase
			});

			/**
			 *  Scale the oscillator so it doesn't go silent 
			 *  at the extreme values.
			 *  @type {Tone.Multiply}
			 *  @private
			 */
			this._scale = new Tone.Multiply(1.01);

			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = this._modulator.frequency;

			/**
			 *  The detune of the oscillator.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this._modulator.detune;

			/**
			 *  The modulation rate of the oscillator. 
			 *  @type {Frequency}
			 *  @signal
			 */
			this.modulationFrequency = this._pulse.frequency;	

			//connections
			this._modulator.chain(this._scale, this._pulse.width);
			this._pulse.connect(this.output);
			this._readOnly(["modulationFrequency", "frequency", "detune"]);
		};

		Tone.extend(Tone.PWMOscillator, Tone.Oscillator);

		/**
		 *  default values
		 *  @static
		 *  @type {Object}
		 *  @const
		 */
		Tone.PWMOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"modulationFrequency" : 0.4,
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} [time=now]
		 *  @private
		 */
		Tone.PWMOscillator.prototype._start = function(time){
			time = this.toSeconds(time);
			this._modulator.start(time);
			this._pulse.start(time);
		};

		/**
		 *  stop the oscillator
		 *  @param  {Time} time (optional) timing parameter
		 *  @private
		 */
		Tone.PWMOscillator.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._modulator.stop(time);
			this._pulse.stop(time);
		};

		/**
		 * The type of the oscillator. Always returns "pwm".
		 * @readOnly
		 * @memberOf Tone.PWMOscillator#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.PWMOscillator.prototype, "type", {
			get : function(){
				return "pwm";
			}
		});

		/**
		 * The partials of the waveform. Cannot set partials for this waveform type
		 * @memberOf Tone.PWMOscillator#
		 * @type {Array}
		 * @name partials
		 * @private
		 */
		Object.defineProperty(Tone.PWMOscillator.prototype, "partials", {
			get : function(){
				return [];
			}
		});

		/**
		 * The phase of the oscillator in degrees.
		 * @memberOf Tone.PWMOscillator#
		 * @type {number}
		 * @name phase
		 */
		Object.defineProperty(Tone.PWMOscillator.prototype, "phase", {
			get : function(){
				return this._modulator.phase;
			}, 
			set : function(phase){
				this._modulator.phase = phase;
			}
		});

		/**
		 *  Clean up.
		 *  @return {Tone.PWMOscillator} this
		 */
		Tone.PWMOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._pulse.dispose();
			this._pulse = null;
			this._scale.dispose();
			this._scale = null;
			this._modulator.dispose();
			this._modulator = null;
			this._writable(["modulationFrequency", "frequency", "detune"]);
			this.frequency = null;
			this.detune = null;
			this.modulationFrequency = null;
			return this;
		};

		return Tone.PWMOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 71 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(56), __webpack_require__(67), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.FMOscillator 
		 *
		 *  @extends {Tone.Oscillator}
		 *  @constructor
		 *  @param {Frequency} frequency The starting frequency of the oscillator. 
		 *  @param {String} type The type of the carrier oscillator.
		 *  @param {String} modulationType The type of the modulator oscillator.
		 *  @example
		 * //a sine oscillator frequency-modulated by a square wave
		 * var fmOsc = new Tone.FMOscillator("Ab3", "sine", "square").toMaster().start();
		 */
		Tone.FMOscillator = function(){

			var options = this.optionsObject(arguments, ["frequency", "type", "modulationType"], Tone.FMOscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The carrier oscillator
			 *  @type {Tone.Oscillator}
			 *  @private
			 */
			this._carrier = new Tone.Oscillator(options.frequency, options.type);

			/**
			 *  The oscillator's frequency
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The detune control signal.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this._carrier.detune;
			this.detune.value = options.detune;

			/**
			 *  The modulation index which is in essence the depth or amount of the modulation. In other terms it is the 
			 *  ratio of the frequency of the modulating signal (mf) to the amplitude of the 
			 *  modulating signal (ma) -- as in ma/mf. 
			 *	@type {Positive}
			 *	@signal
			 */
			this.modulationIndex = new Tone.Multiply(options.modulationIndex);
			this.modulationIndex.units = Tone.Type.Positive;

			/**
			 *  The modulating oscillator
			 *  @type  {Tone.Oscillator}
			 *  @private
			 */
			this._modulator = new Tone.Oscillator(options.frequency, options.modulationType);

			/**
			 *  Harmonicity is the frequency ratio between the carrier and the modulator oscillators. 
			 *  A harmonicity of 1 gives both oscillators the same frequency. 
			 *  Harmonicity = 2 means a change of an octave. 
			 *  @type {Positive}
			 *  @signal
			 *  @example
			 * //pitch the modulator an octave below carrier
			 * synth.harmonicity.value = 0.5;
			 */
			this.harmonicity = new Tone.Multiply(options.harmonicity);
			this.harmonicity.units = Tone.Type.Positive;

			/**
			 *  the node where the modulation happens
			 *  @type {Tone.Gain}
			 *  @private
			 */
			this._modulationNode = new Tone.Gain(0);

			//connections
			this.frequency.connect(this._carrier.frequency);
			this.frequency.chain(this.harmonicity, this._modulator.frequency);
			this.frequency.chain(this.modulationIndex, this._modulationNode);
			this._modulator.connect(this._modulationNode.gain);
			this._modulationNode.connect(this._carrier.frequency);
			this._carrier.connect(this.output);
			this.detune.connect(this._modulator.detune);

			this.phase = options.phase;

			this._readOnly(["modulationIndex", "frequency", "detune", "harmonicity"]);
		};

		Tone.extend(Tone.FMOscillator, Tone.Oscillator);

		/**
		 *  default values
		 *  @static
		 *  @type {Object}
		 *  @const
		 */
		Tone.FMOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"modulationIndex" : 2,
			"modulationType" : "square",
			"harmonicity" : 1
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} [time=now]
		 *  @private
		 */
		Tone.FMOscillator.prototype._start = function(time){
			time = this.toSeconds(time);
			this._modulator.start(time);
			this._carrier.start(time);
		};

		/**
		 *  stop the oscillator
		 *  @param  {Time} time (optional) timing parameter
		 *  @private
		 */
		Tone.FMOscillator.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._modulator.stop(time);
			this._carrier.stop(time);
		};

		/**
		 * The type of the carrier oscillator
		 * @memberOf Tone.FMOscillator#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.FMOscillator.prototype, "type", {
			get : function(){
				return this._carrier.type;
			},
			set : function(type){
				this._carrier.type = type;	
			}
		});

		/**
		 * The type of the modulator oscillator
		 * @memberOf Tone.FMOscillator#
		 * @type {String}
		 * @name modulationType
		 */
		Object.defineProperty(Tone.FMOscillator.prototype, "modulationType", {
			get : function(){
				return this._modulator.type;
			},
			set : function(type){
				this._modulator.type = type;	
			}
		});

		/**
		 * The phase of the oscillator in degrees.
		 * @memberOf Tone.FMOscillator#
		 * @type {number}
		 * @name phase
		 */
		Object.defineProperty(Tone.FMOscillator.prototype, "phase", {
			get : function(){
				return this._carrier.phase;
			}, 
			set : function(phase){
				this._carrier.phase = phase;
				this._modulator.phase = phase;
			}
		});

		/**
		 * The partials of the carrier waveform. A partial represents 
		 * the amplitude at a harmonic. The first harmonic is the 
		 * fundamental frequency, the second is the octave and so on
		 * following the harmonic series. 
		 * Setting this value will automatically set the type to "custom". 
		 * The value is an empty array when the type is not "custom". 
		 * @memberOf Tone.FMOscillator#
		 * @type {Array}
		 * @name partials
		 * @example
		 * osc.partials = [1, 0.2, 0.01];
		 */
		Object.defineProperty(Tone.FMOscillator.prototype, "partials", {
			get : function(){
				return this._carrier.partials;
			}, 
			set : function(partials){
				this._carrier.partials = partials;
			}
		});

		/**
		 *  Clean up.
		 *  @return {Tone.FMOscillator} this
		 */
		Tone.FMOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._writable(["modulationIndex", "frequency", "detune", "harmonicity"]);
			this.frequency.dispose();
			this.frequency = null;
			this.detune = null;
			this.harmonicity.dispose();
			this.harmonicity = null;
			this._carrier.dispose();
			this._carrier = null;
			this._modulator.dispose();
			this._modulator = null;
			this._modulationNode.dispose();
			this._modulationNode = null;
			this.modulationIndex.dispose();
			this.modulationIndex = null;
			return this;
		};

		return Tone.FMOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 72 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(56), __webpack_require__(67), 
		__webpack_require__(14), __webpack_require__(73)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.AMOscillator 
		 *
		 *  @extends {Tone.Oscillator}
		 *  @constructor
		 *  @param {Frequency} frequency The starting frequency of the oscillator. 
		 *  @param {String} type The type of the carrier oscillator.
		 *  @param {String} modulationType The type of the modulator oscillator.
		 *  @example
		 * //a sine oscillator frequency-modulated by a square wave
		 * var fmOsc = new Tone.AMOscillator("Ab3", "sine", "square").toMaster().start();
		 */
		Tone.AMOscillator = function(){

			var options = this.optionsObject(arguments, ["frequency", "type", "modulationType"], Tone.AMOscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The carrier oscillator
			 *  @type {Tone.Oscillator}
			 *  @private
			 */
			this._carrier = new Tone.Oscillator(options.frequency, options.type);

			/**
			 *  The oscillator's frequency
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = this._carrier.frequency;

			/**
			 *  The detune control signal.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this._carrier.detune;
			this.detune.value = options.detune;

			/**
			 *  The modulating oscillator
			 *  @type  {Tone.Oscillator}
			 *  @private
			 */
			this._modulator = new Tone.Oscillator(options.frequency, options.modulationType);

			/**
			 *  convert the -1,1 output to 0,1
			 *  @type {Tone.AudioToGain}
			 *  @private
			 */
			this._modulationScale = new Tone.AudioToGain();

			/**
			 *  Harmonicity is the frequency ratio between the carrier and the modulator oscillators. 
			 *  A harmonicity of 1 gives both oscillators the same frequency. 
			 *  Harmonicity = 2 means a change of an octave. 
			 *  @type {Positive}
			 *  @signal
			 *  @example
			 * //pitch the modulator an octave below carrier
			 * synth.harmonicity.value = 0.5;
			 */
			this.harmonicity = new Tone.Multiply(options.harmonicity);
			this.harmonicity.units = Tone.Type.Positive;

			/**
			 *  the node where the modulation happens
			 *  @type {Tone.Gain}
			 *  @private
			 */
			this._modulationNode = new Tone.Gain(0);

			//connections
			this.frequency.chain(this.harmonicity, this._modulator.frequency);
			this.detune.connect(this._modulator.detune);
			this._modulator.chain(this._modulationScale, this._modulationNode.gain);
			this._carrier.chain(this._modulationNode, this.output);

			this.phase = options.phase;

			this._readOnly(["frequency", "detune", "harmonicity"]);
		};

		Tone.extend(Tone.AMOscillator, Tone.Oscillator);

		/**
		 *  default values
		 *  @static
		 *  @type {Object}
		 *  @const
		 */
		Tone.AMOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"modulationType" : "square",
			"harmonicity" : 1
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} [time=now]
		 *  @private
		 */
		Tone.AMOscillator.prototype._start = function(time){
			time = this.toSeconds(time);
			this._modulator.start(time);
			this._carrier.start(time);
		};

		/**
		 *  stop the oscillator
		 *  @param  {Time} time (optional) timing parameter
		 *  @private
		 */
		Tone.AMOscillator.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._modulator.stop(time);
			this._carrier.stop(time);
		};

		/**
		 * The type of the carrier oscillator
		 * @memberOf Tone.AMOscillator#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.AMOscillator.prototype, "type", {
			get : function(){
				return this._carrier.type;
			},
			set : function(type){
				this._carrier.type = type;	
			}
		});

		/**
		 * The type of the modulator oscillator
		 * @memberOf Tone.AMOscillator#
		 * @type {string}
		 * @name modulationType
		 */
		Object.defineProperty(Tone.AMOscillator.prototype, "modulationType", {
			get : function(){
				return this._modulator.type;
			},
			set : function(type){
				this._modulator.type = type;	
			}
		});

		/**
		 * The phase of the oscillator in degrees.
		 * @memberOf Tone.AMOscillator#
		 * @type {number}
		 * @name phase
		 */
		Object.defineProperty(Tone.AMOscillator.prototype, "phase", {
			get : function(){
				return this._carrier.phase;
			}, 
			set : function(phase){
				this._carrier.phase = phase;
				this._modulator.phase = phase;
			}
		});

		/**
		 * The partials of the carrier waveform. A partial represents 
		 * the amplitude at a harmonic. The first harmonic is the 
		 * fundamental frequency, the second is the octave and so on
		 * following the harmonic series. 
		 * Setting this value will automatically set the type to "custom". 
		 * The value is an empty array when the type is not "custom". 
		 * @memberOf Tone.AMOscillator#
		 * @type {Array}
		 * @name partials
		 * @example
		 * osc.partials = [1, 0.2, 0.01];
		 */
		Object.defineProperty(Tone.AMOscillator.prototype, "partials", {
			get : function(){
				return this._carrier.partials;
			}, 
			set : function(partials){
				this._carrier.partials = partials;
			}
		});

		/**
		 *  Clean up.
		 *  @return {Tone.AMOscillator} this
		 */
		Tone.AMOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._writable(["frequency", "detune", "harmonicity"]);
			this.frequency = null;
			this.detune = null;
			this.harmonicity.dispose();
			this.harmonicity = null;
			this._carrier.dispose();
			this._carrier = null;
			this._modulator.dispose();
			this._modulator = null;
			this._modulationNode.dispose();
			this._modulationNode = null;
			this._modulationScale.dispose();
			this._modulationScale = null;
			return this;
		};

		return Tone.AMOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 73 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(10), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class AudioToGain converts an input in AudioRange [-1,1] to NormalRange [0,1]. 
		 *         See Tone.GainToAudio.
		 *
		 *  @extends {Tone.SignalBase}
		 *  @constructor
		 *  @example
		 *  var a2g = new Tone.AudioToGain();
		 */
		Tone.AudioToGain = function(){

			/**
			 *  @type {WaveShaperNode}
			 *  @private
			 */
			this._norm = this.input = this.output = new Tone.WaveShaper(function(x){
				return (x + 1) / 2;
			});
		};

		Tone.extend(Tone.AudioToGain, Tone.SignalBase);

		/**
		 *  clean up
		 *  @returns {Tone.AudioToGain} this
		 */
		Tone.AudioToGain.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._norm.dispose();
			this._norm = null;
			return this;
		};

		return Tone.AudioToGain;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 74 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(56), __webpack_require__(67), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class Tone.FatOscillator 
		 *
		 *  @extends {Tone.Oscillator}
		 *  @constructor
		 *  @param {Frequency} frequency The starting frequency of the oscillator. 
		 *  @param {String} type The type of the carrier oscillator.
		 *  @param {String} modulationType The type of the modulator oscillator.
		 *  @example
		 * //a sine oscillator frequency-modulated by a square wave
		 * var fmOsc = new Tone.FatOscillator("Ab3", "sine", "square").toMaster().start();
		 */
		Tone.FatOscillator = function(){

			var options = this.optionsObject(arguments, ["frequency", "type", "spread"], Tone.FatOscillator.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The oscillator's frequency
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The detune control signal.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = new Tone.Signal(options.detune, Tone.Type.Cents);

			/**
			 *  The array of oscillators
			 *  @type {Array}
			 *  @private
			 */
			this._oscillators = [];

			/**
			 *  The total spread of the oscillators
			 *  @type  {Cents}
			 *  @private
			 */
			this._spread = options.spread;

			/**
			 *  The type of the oscillator
			 *  @type {String}
			 *  @private
			 */
			this._type = options.type;

			/**
			 *  The phase of the oscillators
			 *  @type {Degrees}
			 *  @private
			 */
			this._phase = options.phase;

			/**
			 *  The partials array
			 *  @type {Array}
			 *  @private
			 */
			this._partials = this.defaultArg(options.partials, []);

			//set the count initially
			this.count = options.count;

			this._readOnly(["frequency", "detune"]);
		};

		Tone.extend(Tone.FatOscillator, Tone.Oscillator);

		/**
		 *  default values
		 *  @static
		 *  @type {Object}
		 *  @const
		 */
		Tone.FatOscillator.defaults = {
			"frequency" : 440,
			"detune" : 0,
			"phase" : 0,
			"spread" : 20,
			"count" : 3,
			"type" : "sawtooth"
		};

		/**
		 *  start the oscillator
		 *  @param  {Time} [time=now]
		 *  @private
		 */
		Tone.FatOscillator.prototype._start = function(time){
			time = this.toSeconds(time);
			this._forEach(function(osc){
				osc.start(time);
			});
		};

		/**
		 *  stop the oscillator
		 *  @param  {Time} time (optional) timing parameter
		 *  @private
		 */
		Tone.FatOscillator.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._forEach(function(osc){
				osc.stop(time);
			});
		};

		/**
		 *  Iterate over all of the oscillators
		 *  @param  {Function}  iterator  The iterator function
		 *  @private
		 */
		Tone.FatOscillator.prototype._forEach = function(iterator){
			for (var i = 0; i < this._oscillators.length; i++){
				iterator.call(this, this._oscillators[i], i);
			}
		};

		/**
		 * The type of the carrier oscillator
		 * @memberOf Tone.FatOscillator#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.FatOscillator.prototype, "type", {
			get : function(){
				return this._type;
			},
			set : function(type){
				this._type = type;
				this._forEach(function(osc){
					osc.type = type;
				});
			}
		});

		/**
		 * The detune spread between the oscillators. If "count" is
		 * set to 3 oscillators and the "spread" is set to 40,
		 * the three oscillators would be detuned like this: [-20, 0, 20]
		 * for a total detune spread of 40 cents.
		 * @memberOf Tone.FatOscillator#
		 * @type {Cents}
		 * @name spread
		 */
		Object.defineProperty(Tone.FatOscillator.prototype, "spread", {
			get : function(){
				return this._spread;
			},
			set : function(spread){
				this._spread = spread;
				if (this._oscillators.length > 1){
					var start = -spread/2;
					var step = spread / (this._oscillators.length - 1);
					this._forEach(function(osc, i){
						osc.detune.value = start + step * i;
					});
				}
			}
		});

		/**
		 * The number of detuned oscillators
		 * @memberOf Tone.FatOscillator#
		 * @type {Number}
		 * @name count
		 */
		Object.defineProperty(Tone.FatOscillator.prototype, "count", {
			get : function(){
				return this._oscillators.length;
			},
			set : function(count){
				count = Math.max(count, 1);
				if (this._oscillators.length !== count){
					// var partials = this.partials;
					// var type = this.type;
					//dispose the previous oscillators
					this._forEach(function(osc){
						osc.dispose();
					});
					this._oscillators = [];
					for (var i = 0; i < count; i++){
						var osc = new Tone.Oscillator();
						if (this.type === Tone.Oscillator.Type.Custom){
							osc.partials = this._partials;
						} else {
							osc.type = this._type;
						}
						osc.phase = this._phase;
						osc.volume.value = -6 - count;
						this.frequency.connect(osc.frequency);
						this.detune.connect(osc.detune);
						osc.connect(this.output);
						this._oscillators[i] = osc;
					}
					//set the spread
					this.spread = this._spread;
					if (this.state === Tone.State.Started){
						this._forEach(function(osc){
							osc.start();
						});						
					}
				}
			}
		});

		/**
		 * The phase of the oscillator in degrees.
		 * @memberOf Tone.FatOscillator#
		 * @type {Number}
		 * @name phase
		 */
		Object.defineProperty(Tone.FatOscillator.prototype, "phase", {
			get : function(){
				return this._phase;
			}, 
			set : function(phase){
				this._phase = phase;
				this._forEach(function(osc){
					osc.phase = phase;
				});
			}
		});

		/**
		 * The partials of the carrier waveform. A partial represents 
		 * the amplitude at a harmonic. The first harmonic is the 
		 * fundamental frequency, the second is the octave and so on
		 * following the harmonic series. 
		 * Setting this value will automatically set the type to "custom". 
		 * The value is an empty array when the type is not "custom". 
		 * @memberOf Tone.FatOscillator#
		 * @type {Array}
		 * @name partials
		 * @example
		 * osc.partials = [1, 0.2, 0.01];
		 */
		Object.defineProperty(Tone.FatOscillator.prototype, "partials", {
			get : function(){
				return this._partials;
			}, 
			set : function(partials){
				this._partials = partials;
				this._type = Tone.Oscillator.Type.Custom;
				this._forEach(function(osc){
					osc.partials = partials;
				});
			}
		});

		/**
		 *  Clean up.
		 *  @return {Tone.FatOscillator} this
		 */
		Tone.FatOscillator.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this._writable(["frequency", "detune"]);
			this.frequency.dispose();
			this.frequency = null;
			this.detune.dispose();
			this.detune = null;
			this._forEach(function(osc){
				osc.dispose();
			});
			this._oscillators = null;
			this._partials = null;
			return this;
		};

		return Tone.FatOscillator;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 75 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.Filter is a filter which allows for all of the same native methods
		 *          as the [BiquadFilterNode](http://webaudio.github.io/web-audio-api/#the-biquadfilternode-interface). 
		 *          Tone.Filter has the added ability to set the filter rolloff at -12 
		 *          (default), -24 and -48. 
		 *
		 *  @constructor
		 *  @extends {Tone}
		 *  @param {Frequency|Object} [frequency] The cutoff frequency of the filter.
		 *  @param {string=} type The type of filter.
		 *  @param {number=} rolloff The drop in decibels per octave after the cutoff frequency.
		 *                            3 choices: -12, -24, and -48
		 *  @example
		 *  var filter = new Tone.Filter(200, "highpass");
		 */
		Tone.Filter = function(){
			Tone.call(this);

			var options = this.optionsObject(arguments, ["frequency", "type", "rolloff"], Tone.Filter.defaults);

			/**
			 *  the filter(s)
			 *  @type {Array}
			 *  @private
			 */
			this._filters = [];

			/**
			 *  The cutoff frequency of the filter. 
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = new Tone.Signal(options.frequency, Tone.Type.Frequency);

			/**
			 *  The detune parameter
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = new Tone.Signal(0, Tone.Type.Cents);

			/**
			 *  The gain of the filter, only used in certain filter types
			 *  @type {Number}
			 *  @signal
			 */
			this.gain = new Tone.Signal({
				"value" : options.gain, 
				"convert" : false
			});

			/**
			 *  The Q or Quality of the filter
			 *  @type {Positive}
			 *  @signal
			 */
			this.Q = new Tone.Signal(options.Q);

			/**
			 *  the type of the filter
			 *  @type {string}
			 *  @private
			 */
			this._type = options.type;

			/**
			 *  the rolloff value of the filter
			 *  @type {number}
			 *  @private
			 */
			this._rolloff = options.rolloff;

			//set the rolloff;
			this.rolloff = options.rolloff;
			this._readOnly(["detune", "frequency", "gain", "Q"]);
		};

		Tone.extend(Tone.Filter);

		/**
		 *  the default parameters
		 *
		 *  @static
		 *  @type {Object}
		 */
		Tone.Filter.defaults = {
			"type" : "lowpass",
			"frequency" : 350,
			"rolloff" : -12,
			"Q" : 1,
			"gain" : 0,
		};

		/**
		 * The type of the filter. Types: "lowpass", "highpass", 
		 * "bandpass", "lowshelf", "highshelf", "notch", "allpass", or "peaking". 
		 * @memberOf Tone.Filter#
		 * @type {string}
		 * @name type
		 */
		Object.defineProperty(Tone.Filter.prototype, "type", {
			get : function(){
				return this._type;
			},
			set : function(type){
				var types = ["lowpass", "highpass", "bandpass", "lowshelf", "highshelf", "notch", "allpass", "peaking"];
				if (types.indexOf(type)=== -1){
					throw new Error("Tone.Filter does not have filter type "+type);
				}
				this._type = type;
				for (var i = 0; i < this._filters.length; i++){
					this._filters[i].type = type;
				}
			}
		});

		/**
		 * The rolloff of the filter which is the drop in db
		 * per octave. Implemented internally by cascading filters.
		 * Only accepts the values -12, -24, -48 and -96.
		 * @memberOf Tone.Filter#
		 * @type {number}
		 * @name rolloff
		 */
		Object.defineProperty(Tone.Filter.prototype, "rolloff", {
			get : function(){
				return this._rolloff;
			},
			set : function(rolloff){
				rolloff = parseInt(rolloff, 10);
				var possibilities = [-12, -24, -48, -96];
				var cascadingCount = possibilities.indexOf(rolloff);
				//check the rolloff is valid
				if (cascadingCount === -1){
					throw new Error("Filter rolloff can only be -12, -24, -48 or -96");
				} 
				cascadingCount += 1;
				this._rolloff = rolloff;
				//first disconnect the filters and throw them away
				this.input.disconnect();
				for (var i = 0; i < this._filters.length; i++) {
					this._filters[i].disconnect();
					this._filters[i] = null;
				}
				this._filters = new Array(cascadingCount);
				for (var count = 0; count < cascadingCount; count++){
					var filter = this.context.createBiquadFilter();
					filter.type = this._type;
					this.frequency.connect(filter.frequency);
					this.detune.connect(filter.detune);
					this.Q.connect(filter.Q);
					this.gain.connect(filter.gain);
					this._filters[count] = filter;
				}
				//connect them up
				var connectionChain = [this.input].concat(this._filters).concat([this.output]);
				this.connectSeries.apply(this, connectionChain);
			}
		});

		/**
		 *  Clean up. 
		 *  @return {Tone.Filter} this
		 */
		Tone.Filter.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			for (var i = 0; i < this._filters.length; i++) {
				this._filters[i].disconnect();
				this._filters[i] = null;
			}
			this._filters = null;
			this._writable(["detune", "frequency", "gain", "Q"]);
			this.frequency.dispose();
			this.Q.dispose();
			this.frequency = null;
			this.Q = null;
			this.detune.dispose();
			this.detune = null;
			this.gain.dispose();
			this.gain = null;
			return this;
		};

		return Tone.Filter;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 76 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(77), __webpack_require__(9)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  This is an abstract base class for other monophonic instruments to 
		 *          extend. IMPORTANT: It does not make any sound on its own and
		 *          shouldn't be directly instantiated.
		 *
		 *  @constructor
		 *  @abstract
		 *  @extends {Tone.Instrument}
		 */
		Tone.Monophonic = function(options){

			//get the defaults
			options = this.defaultArg(options, Tone.Monophonic.defaults);

			Tone.Instrument.call(this, options);

			/**
			 *  The glide time between notes. 
			 *  @type {Time}
			 */
			this.portamento = options.portamento;
		};

		Tone.extend(Tone.Monophonic, Tone.Instrument);

		/**
		 *  @static
		 *  @const
		 *  @type {Object}
		 */
		Tone.Monophonic.defaults = {
			"portamento" : 0
		};

		/**
		 *  Trigger the attack of the note optionally with a given velocity. 
		 *  
		 *  
		 *  @param  {Frequency} note     The note to trigger.
		 *  @param  {Time} [time=now]     When the note should start.
		 *  @param  {number} [velocity=1] velocity The velocity scaler 
		 *                                determines how "loud" the note 
		 *                                will be triggered.
		 *  @returns {Tone.Monophonic} this
		 *  @example
		 * synth.triggerAttack("C4");
		 *  @example
		 * //trigger the note a half second from now at half velocity
		 * synth.triggerAttack("C4", "+0.5", 0.5);
		 */
		Tone.Monophonic.prototype.triggerAttack = function(note, time, velocity) {
			time = this.toSeconds(time);
			this._triggerEnvelopeAttack(time, velocity);
			this.setNote(note, time);
			return this;
		};

		/**
		 *  Trigger the release portion of the envelope
		 *  @param  {Time} [time=now] If no time is given, the release happens immediatly
		 *  @returns {Tone.Monophonic} this
		 *  @example
		 * synth.triggerRelease();
		 */
		Tone.Monophonic.prototype.triggerRelease = function(time){
			this._triggerEnvelopeRelease(time);
			return this;
		};

		/**
		 *  override this method with the actual method
		 *  @abstract
		 *  @private
		 */	
		Tone.Monophonic.prototype._triggerEnvelopeAttack = function() {};

		/**
		 *  override this method with the actual method
		 *  @abstract
		 *  @private
		 */	
		Tone.Monophonic.prototype._triggerEnvelopeRelease = function() {};

		/**
		 *  Set the note at the given time. If no time is given, the note
		 *  will set immediately. 
		 *  @param {Frequency} note The note to change to.
		 *  @param  {Time} [time=now] The time when the note should be set. 
		 *  @returns {Tone.Monophonic} this
		 * @example
		 * //change to F#6 in one quarter note from now.
		 * synth.setNote("F#6", "+4n");
		 * @example
		 * //change to Bb4 right now
		 * synth.setNote("Bb4");
		 */
		Tone.Monophonic.prototype.setNote = function(note, time){
			time = this.toSeconds(time);
			if (this.portamento > 0){
				var currentNote = this.frequency.value;
				this.frequency.setValueAtTime(currentNote, time);
				var portTime = this.toSeconds(this.portamento);
				this.frequency.exponentialRampToValueAtTime(note, time + portTime);
			} else {
				this.frequency.setValueAtTime(note, time);
			}
			return this;
		};

		return Tone.Monophonic;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 77 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(12)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Base-class for all instruments
		 *  
		 *  @constructor
		 *  @extends {Tone}
		 */
		Tone.Instrument = function(options){

			//get the defaults
			options = this.defaultArg(options, Tone.Instrument.defaults);

			/**
			 *  The output and volume triming node
			 *  @type  {Tone.Volume}
			 *  @private
			 */
			this._volume = this.output = new Tone.Volume(options.volume);

			/**
			 * The volume of the output in decibels.
			 * @type {Decibels}
			 * @signal
			 * @example
			 * source.volume.value = -6;
			 */
			this.volume = this._volume.volume;
			this._readOnly("volume");
		};

		Tone.extend(Tone.Instrument);

		/**
		 *  the default attributes
		 *  @type {object}
		 */
		Tone.Instrument.defaults = {
			/** the volume of the output in decibels */
			"volume" : 0
		};

		/**
		 *  @abstract
		 *  @param {string|number} note the note to trigger
		 *  @param {Time} [time=now] the time to trigger the ntoe
		 *  @param {number} [velocity=1] the velocity to trigger the note
		 */
		Tone.Instrument.prototype.triggerAttack = Tone.noOp;

		/**
		 *  @abstract
		 *  @param {Time} [time=now] when to trigger the release
		 */
		Tone.Instrument.prototype.triggerRelease = Tone.noOp;

		/**
		 *  Trigger the attack and then the release after the duration. 
		 *  @param  {Frequency} note     The note to trigger.
		 *  @param  {Time} duration How long the note should be held for before
		 *                          triggering the release.
		 *  @param {Time} [time=now]  When the note should be triggered.
		 *  @param  {NormalRange} [velocity=1] The velocity the note should be triggered at.
		 *  @returns {Tone.Instrument} this
		 *  @example
		 * //trigger "C4" for the duration of an 8th note
		 * synth.triggerAttackRelease("C4", "8n");
		 */
		Tone.Instrument.prototype.triggerAttackRelease = function(note, duration, time, velocity){
			time = this.toSeconds(time);
			duration = this.toSeconds(duration);
			this.triggerAttack(note, time, velocity);
			this.triggerRelease(time + duration);
			return this;
		};

		/**
		 *  clean up
		 *  @returns {Tone.Instrument} this
		 */
		Tone.Instrument.prototype.dispose = function(){
			Tone.prototype.dispose.call(this);
			this._volume.dispose();
			this._volume = null;
			this._writable(["volume"]);
			this.volume = null;
			return this;
		};

		return Tone.Instrument;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 78 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(60), __webpack_require__(68), __webpack_require__(9), __webpack_require__(76)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Tone.SimpleSynth is composed simply of a Tone.OmniOscillator
		 *          routed through a Tone.AmplitudeEnvelope. 
		 *          <img src="https://docs.google.com/drawings/d/1-1_0YW2Z1J2EPI36P8fNCMcZG7N1w1GZluPs4og4evo/pub?w=1163&h=231">
		 *
		 *  @constructor
		 *  @extends {Tone.Monophonic}
		 *  @param {Object} [options] the options available for the synth 
		 *                          see defaults below
		 *  @example
		 * var synth = new Tone.SimpleSynth().toMaster();
		 * synth.triggerAttackRelease("C4", "8n");
		 */
		Tone.SimpleSynth = function(options){

			//get the defaults
			options = this.defaultArg(options, Tone.SimpleSynth.defaults);
			Tone.Monophonic.call(this, options);

			/**
			 *  The oscillator.
			 *  @type {Tone.OmniOscillator}
			 */
			this.oscillator = new Tone.OmniOscillator(options.oscillator);

			/**
			 *  The frequency control.
			 *  @type {Frequency}
			 *  @signal
			 */
			this.frequency = this.oscillator.frequency;

			/**
			 *  The detune control.
			 *  @type {Cents}
			 *  @signal
			 */
			this.detune = this.oscillator.detune;

			/**
			 *  The amplitude envelope.
			 *  @type {Tone.AmplitudeEnvelope}
			 */
			this.envelope = new Tone.AmplitudeEnvelope(options.envelope);

			//connect the oscillators to the output
			this.oscillator.chain(this.envelope, this.output);
			//start the oscillators
			this.oscillator.start();
			this._readOnly(["oscillator", "frequency", "detune", "envelope"]);
		};

		Tone.extend(Tone.SimpleSynth, Tone.Monophonic);

		/**
		 *  @const
		 *  @static
		 *  @type {Object}
		 */
		Tone.SimpleSynth.defaults = {
			"oscillator" : {
				"type" : "triangle"
			},
			"envelope" : {
				"attack" : 0.005,
				"decay" : 0.1,
				"sustain" : 0.3,
				"release" : 1
			}
		};

		/**
		 *  start the attack portion of the envelope
		 *  @param {Time} [time=now] the time the attack should start
		 *  @param {number} [velocity=1] the velocity of the note (0-1)
		 *  @returns {Tone.SimpleSynth} this
		 *  @private
		 */
		Tone.SimpleSynth.prototype._triggerEnvelopeAttack = function(time, velocity){
			//the envelopes
			this.envelope.triggerAttack(time, velocity);
			return this;	
		};

		/**
		 *  start the release portion of the envelope
		 *  @param {Time} [time=now] the time the release should start
		 *  @returns {Tone.SimpleSynth} this
		 *  @private
		 */
		Tone.SimpleSynth.prototype._triggerEnvelopeRelease = function(time){
			this.envelope.triggerRelease(time);
			return this;
		};


		/**
		 *  clean up
		 *  @returns {Tone.SimpleSynth} this
		 */
		Tone.SimpleSynth.prototype.dispose = function(){
			Tone.Monophonic.prototype.dispose.call(this);
			this._writable(["oscillator", "frequency", "detune", "envelope"]);
			this.oscillator.dispose();
			this.oscillator = null;
			this.envelope.dispose();
			this.envelope = null;
			this.frequency = null;
			this.detune = null;
			return this;
		};

		return Tone.SimpleSynth;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 79 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(80), __webpack_require__(82), __webpack_require__(83), __webpack_require__(85)], __WEBPACK_AMD_DEFINE_RESULT__ = function (interfaceStyle, SoundSelection, PlayButton, Microphone) {

		var Interface = function(container){

			this._interface = document.createElement("div");
			this._interface.id = "SongControls";
			container.appendChild(this._interface);

			this._soundButtons = new SoundSelection(this._interface);

			this._playButton = new PlayButton(this._interface);

			this._microphone = new Microphone(this._interface, this._soundButtons.microphone);

			this._microphone.onstart = this._startRec.bind(this);
			this._microphone.onstop = this._stopRec.bind(this);
			this._microphone.oncancel = this._recCanceled.bind(this);

			this._onRec = function(){};
		};

		Interface.prototype.onPlay = function(cb){
			this._playButton.onPlay = cb;
		};

		Interface.prototype.onInstrument = function(cb){
			this._soundButtons.onSelect = cb;
		};

		Interface.prototype.onScore = function(cb){
			this._playButton.onScore = cb;
		};

		Interface.prototype.onRecord = function(cb){
			this._onRec = cb;
		};

		Interface.prototype.onBuffer = function(cb){
			this._microphone.onbuffer = cb;
		};

		Interface.prototype._startRec = function(){
			this._soundButtons.recording(true);
			this._onRec(true);
		};

		Interface.prototype._stopRec = function(){
			this._soundButtons.recording(false);
			this._onRec(false);
		};

		Interface.prototype._recCanceled = function(){
			this._soundButtons.recording(false);
			this._soundButtons.previous();
			this._onRec(false);
		};

		//force it to a stop
		Interface.prototype.stop = function(){
			this._playButton.stop();
		};

		return Interface;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 80 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(81);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./interface.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./interface.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 81 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, "/** \r\n *  SIZING\r\n */\n.Button {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  background-color: white;\n  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.4);\n  text-align: center;\n  font-family: sans-serif;\n  cursor: pointer;\n  color: #666666;\n  font-size: 80px;\n  line-height: 80px;\n  transition: transform 0.05s ease-in, opacity 350ms ease-in-out; }\n  .Button.Shifted {\n    transform: translateY(-100px); }\n  .Button.Hidden {\n    opacity: 0; }\n\n.Button:active {\n  transform: scale(1.1); }\n  .Button:active.Shifted {\n    transform: scale(1.1) translateY(-100px); }\n\n.TextButton {\n  -ms-flex-align: center;\n      align-items: center;\n  background-color: white;\n  border-radius: 40px;\n  bottom: 40px;\n  box-shadow: 0px 0px 10px 0px rgba(0, 0, 0, 0.4);\n  cursor: pointer;\n  color: #666666;\n  display: -ms-flexbox;\n  display: flex;\n  font-family: 'Roboto', sans-serif;\n  font-size: 16px;\n  height: 40px;\n  left: 50%;\n  line-height: 40px;\n  max-width: 350px;\n  opacity: 0;\n  overflow: hidden;\n  padding: 5px 18px;\n  position: absolute;\n  text-align: center;\n  transform: translateX(-50%);\n  transition: opacity 350ms ease-in-out;\n  visibility: hidden;\n  width: auto; }\n  .TextButton span {\n    margin: 5px; }\n    .TextButton span.Text {\n      overflow: hidden;\n      text-overflow: ellipsis;\n      white-space: nowrap; }\n  .TextButton.Active {\n    opacity: 1;\n    visibility: visible; }\n\n#ContextLoading {\n  z-index: 100000;\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  text-align: center;\n  background-color: rgba(0, 0, 0, 0.4);\n  color: white;\n  font-size: 20px;\n  line-height: 200px;\n  font-family: sans-serif; }\n\n#SynthControls {\n  position: fixed;\n  bottom: 0px;\n  left: 0px;\n  width: 100%;\n  height: 120px;\n  background-color: #efefef;\n  box-shadow: inset 0 10px 10px -10px rgba(0, 0, 0, 0.4);\n  z-index: 111; }\n  #SynthControls .Button {\n    position: fixed;\n    bottom: 60px;\n    margin-left: -40px;\n    margin-bottom: -40px;\n    background-repeat: no-repeat;\n    text-align: center;\n    cursor: pointer; }\n  #SynthControls .Button.Active {\n    background-color: #ffb729;\n    color: white; }\n  #SynthControls #Piano {\n    left: calc(50% - 120px); }\n  #SynthControls #Synth {\n    left: 50%; }\n  @media screen and (max-width: 360px) {\n    #SynthControls #Piano {\n      left: calc(50% - 100px) !important; }\n    #SynthControls #Sampler {\n      left: calc(50% + 100px) !important; } }\n  #SynthControls #Sampler {\n    left: calc(50% + 120px);\n    z-index: 1000; }\n    #SynthControls #Sampler #MeterRing {\n      position: absolute;\n      margin-left: -40px;\n      margin-top: -40px;\n      left: 50%;\n      top: 50%;\n      border: 1px solid #efefef;\n      width: 100%;\n      height: 100%;\n      border-radius: 50%;\n      box-sizing: border-box;\n      opacity: 0; }\n  #SynthControls #Sampler.Unsupported {\n    opacity: 0.5;\n    background-color: #efefef; }\n\n#SynthControls.Recording {\n  background-color: transparent;\n  box-shadow: none; }\n  #SynthControls.Recording .Button {\n    display: none; }\n  #SynthControls.Recording #Sampler.Active {\n    display: initial;\n    background-color: #db4437; }\n    #SynthControls.Recording #Sampler.Active #MeterRing {\n      opacity: 1; }\n\n#SongControls {\n  position: fixed;\n  bottom: 120px;\n  left: 0px;\n  width: 100%;\n  height: 0px;\n  z-index: 100; }\n  #SongControls #PlayPause {\n    font-size: 80px;\n    position: absolute;\n    bottom: 20px;\n    left: 50%;\n    margin-left: -40px; }\n  #SongControls .ScoreButton {\n    position: absolute;\n    height: 40px;\n    width: 40px;\n    line-height: 40px;\n    bottom: 20px;\n    margin-left: -20px;\n    transition: opacity 0.2s, transform 0.05s; }\n  #SongControls .ScoreButton:before {\n    font-size: 40px;\n    line-height: 40px;\n    width: 100%;\n    height: 100%;\n    position: absolute;\n    top: 0px;\n    left: 0px; }\n  #SongControls .ScoreButton.Disabled {\n    opacity: 0;\n    pointer-events: none; }\n  #SongControls #Previous {\n    left: calc(50% - 80px); }\n  #SongControls #Next {\n    left: calc(50% + 80px); }\n\n#Scrubber {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: calc(100% - 120px); }\n", ""]);

	// exports


/***/ }),
/* 82 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(80)], __WEBPACK_AMD_DEFINE_RESULT__ = function (interfaceStyle) {

		var SoundSelection = function(container){

			this._buttons = document.createElement("DIV");
			this._buttons.id = "SynthControls";
			container.appendChild(this._buttons);

			this._piano = document.createElement("DIV");
			this._piano.id = "Piano";
			this._piano.classList.add("Button");
			this._piano.classList.add("icon-svg_piano");
			this._piano.addEventListener("click", this._clicked.bind(this, "piano"));
			this._buttons.appendChild(this._piano);

			this._synth = document.createElement("DIV");
			this._synth.id = "Synth";
			this._synth.classList.add("Button");
			this._synth.classList.add("icon-svg_wave_form");
			this._synth.addEventListener("click", this._clicked.bind(this, "synth"));
			this._buttons.appendChild(this._synth);

			this.microphone = document.createElement("DIV");
			this.microphone.id = "Sampler";
			this.microphone.classList.add("Button");
			this.microphone.classList.add("icon-svg_record");
			this.microphone.addEventListener("click", this._clicked.bind(this, "sampler"));
			this._buttons.appendChild(this.microphone);

			//the currently active element
			this._currentInstrument = "synth";
			this.setInstrument(this._currentInstrument);

			this._lastInstrument = null;

			this.onSelect = function(){};
		};

		SoundSelection.prototype._clicked = function(which, e){
			this.onSelect(which);
			this.setInstrument(which);
		};

		SoundSelection.prototype.recording = function(isRec){
			if (isRec){
				this._buttons.classList.add("Recording");
			} else {
				this._buttons.classList.remove("Recording");
			}
		};

		//return to the previously selected button
		SoundSelection.prototype.previous = function(){
			if (this._lastInstrument){
				this._clicked(this._lastInstrument);
			}
		};

		SoundSelection.prototype.setInstrument = function(inst){
			this._lastInstrument = this._currentInstrument;
			this._currentInstrument = inst;
			//remove the currently active element
			var activeEl = this._buttons.querySelector(".Active");
			if (activeEl){
				activeEl.classList.remove("Active");
			}
			switch(inst){
				case "synth" :
					this._synth.classList.add("Active");
					break;
				case "piano" :
					this._piano.classList.add("Active");
					break;
				case "sampler" :
					this.microphone.classList.add("Active");
					break;
			}
		};

		return SoundSelection;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 83 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(80), __webpack_require__(84), __webpack_require__(5), __webpack_require__(32)], __WEBPACK_AMD_DEFINE_RESULT__ = function (interfaceStyle, Scores, Transport, Loader) {

		var PlayButton = function(container){

			//the play button
			this._playButton = document.createElement("div");
			this._playButton.id = "PlayPause";
			this._playButton.classList.add("Button");
			container.appendChild(this._playButton);
			this._playButton.addEventListener("click", this._play.bind(this));

			//the midi file title
			this._midiButton = document.createElement("div");
			this._midiButton.id = "Midi";
			this._midiButton.classList.add("TextButton");
			var xSpan = document.createElement("span");
			var textSpan = document.createElement("span");
			xSpan.innerHTML = "×";
			textSpan.classList.add("Text");
			textSpan.innerHTML = "testfile.mid";
			this._midiButton.appendChild(xSpan);
			this._midiButton.appendChild(textSpan);
			container.appendChild(this._midiButton);
	        this._midiButton.addEventListener("click", this._clearMidiFile.bind(this));

			//the prev button
			this._prevButton = document.createElement("div");
			this._prevButton.id = "Previous";
			this._prevButton.classList.add("Button");
			this._prevButton.classList.add("ScoreButton");
			this._prevButton.classList.add("icon-svg_left_arrow");
			container.appendChild(this._prevButton);
			this._prevButton.addEventListener("click", this._selectScore.bind(this, -1));

			//the next button
			this._nextButton = document.createElement("div");
			this._nextButton.id = "Next";
			this._nextButton.classList.add("Button");
			this._nextButton.classList.add("ScoreButton");
			this._nextButton.classList.add("icon-svg_right_arrow");
			container.appendChild(this._nextButton);
			this._nextButton.addEventListener("click", this._selectScore.bind(this, 1));

			this._scoreIndex = 0;
			this._setScoreControls();

			//the callbacks
			this.onPlay = function(){};
			this.onScore = function(){};

			this._setPlayIcon();

			//load the first score
			// this._loadScore();
		};

		PlayButton.prototype._clearMidiFile = function() {
	        document.getElementById('PlayPause').classList.remove('Shifted');
	        document.querySelectorAll('#Previous, #Next').forEach(function(n) { n.classList.remove('Hidden') });
	        document.getElementById('Midi').classList.remove('Active');
			this._loadScore();
			this.onPlay(false);
			this.stop();
		};

		PlayButton.prototype._selectScore = function(move){
			this._setPlayIcon();
			this._scoreIndex += move;
			this._setScoreControls();
			this._loadScore(Scores[this._scoreIndex]);
		};

		PlayButton.prototype.stop = function(move){
			this._setPlayIcon();
		};

		PlayButton.prototype._play = function(){
			if (Transport.state === "started"){
				Transport.stop();
				this._setPlayIcon();
				this.onPlay(false);
			} else {
				this._setPauseIcon();
				Transport.start();
				this.onPlay(true);
			}
		};

		PlayButton.prototype._setPlayIcon = function(){
			this._playButton.classList.remove("icon-svg_pause");
			this._playButton.classList.add("icon-svg_play");
			this._playButton.classList.remove("Active");
		};

		PlayButton.prototype._setPauseIcon = function(){
			this._playButton.classList.add("icon-svg_pause");
			this._playButton.classList.remove("icon-svg_play");
			this._playButton.classList.add("Active");

		};

		PlayButton.prototype._loadScore = function(){
			//pause before the score
			Transport.stop();
			this.onPlay(false);
			var name = Scores[this._scoreIndex];
			var loader = new Loader("score");
			var xhr = new XMLHttpRequest();
			xhr.open("GET", "./midi/" + name + ".json");
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						var json = JSON.parse(xhr.responseText);
						loader.resolve();
						this.onScore(json);
					} else {
						console.log('Error: ' + xhr.status); // An error occurred during the request.
					}
				}
			}.bind(this);
			xhr.send(null);
		};

		PlayButton.prototype._setScoreControls = function(){
			if (this._scoreIndex === 0){
				this._prevButton.classList.add("Disabled");
			} else {
				this._prevButton.classList.remove("Disabled");
			}

			if (this._scoreIndex === Scores.length - 1){
				this._nextButton.classList.add("Disabled");
			} else {
				this._nextButton.classList.remove("Disabled");
			}
		};

		return PlayButton;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 84 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_RESULT__ = function () {
		return ["preludeInC", "turkishMarch", "beethoven5", "MinuetInG", "satie"];
	}.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 85 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(86), __webpack_require__(90)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Overlay, Mic) {

		var Microphone = function(container, micButton){

			this._container = container;

			this._micButton = micButton;

			this._meterRing = document.createElement("DIV");
			this._meterRing.id = "MeterRing";
			this._micButton.appendChild(this._meterRing);


			this._overlay = new Overlay(container, this._meterRing);
			this._overlay.onclose = this._doneRecording.bind(this);
			this._overlay.oncancel = this._wasCanceled.bind(this);
			this._overlay.ondenied = this._wasDenied.bind(this);

			this.onstart = function(){};
			this.onstop = function(){};
			this.oncancel = function(){};
			this.onbuffer = function(){};

			//check if the mic is supported
			if (!Mic.supported){
				this._micButton.classList.add("Unsupported");
				this._micButton.classList.remove("icon-svg_record");
				this._micButton.classList.add("icon-svg_no_record");
				this._micButton.addEventListener("click", this._unsupported.bind(this));
			} else {
				this._micButton.addEventListener("click", this._startRecording.bind(this));
			}
		};

		Microphone.prototype._startRecording = function(e){
			e.preventDefault();
			if (!this._overlay.isRecording){
				this._overlay.open();
				this._micButton.classList.add("Recording");
				this.onstart();
			} else {
				this._overlay.close();
			}
		};

		Microphone.prototype._doneRecording = function(){
			this.onstop();
			this._micButton.classList.remove("Recording");
			this.onbuffer(this._overlay.buffer, this._overlay.duration, this._overlay.onset);
		};

		Microphone.prototype._wasCanceled = function(){
			this.onstop();
			this._micButton.classList.remove("Recording");
			this.oncancel();
		};

		Microphone.prototype._wasDenied = function(){
			window.parent.postMessage("error3","*");
			this.oncancel();
		};

		Microphone.prototype._unsupported = function(){
			window.parent.postMessage("error2","*");
			this.oncancel();
		};


		return Microphone;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 86 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(87), __webpack_require__(89), __webpack_require__(92), __webpack_require__(78)], __WEBPACK_AMD_DEFINE_RESULT__ = function (micStyle, Recorder, Waveform, SimpleSynth) {

		var MicOverlay = function(container, meterButton){

			this._element = document.createElement("DIV");
			this._element.id = "MicOverlay";
			container.appendChild(this._element);

			this._closeButton = document.createElement("DIV");
			this._closeButton.id = "Cancel";
			this._closeButton.classList.add("Button");
			this._closeButton.classList.add("icon-svg_close-button");
			this._element.appendChild(this._closeButton);
			this._closeButton.addEventListener("click", this.cancel.bind(this));

			/**
			 *  if the thing is recording now
			 *  @type  {Boolean}
			 */
			this.isRecording = false;

			/**
			 *  the element to scale with the meter
			 */
			this._meterButton = meterButton;

			/**
			 *  the buffer recorder
			 */
			this._recorder = new Recorder();
			this._recorder.onended = this.close.bind(this);

			/**
			 *  The waveform drawer
			 *  @type  {Waveform}
			 */
			this._waveform = new Waveform(this._element, this._recorder.audioBuffer);


			/**
			 *  the onclose event
			 */
			this.onclose = function(){};


			/**
			 *  called when cancel is hit
			 */
			this.oncancel = function(){};

			/**
			 *  called when the mic is denied
			 */
			this.ondenied = function(){};

			/**
			 *  the animation frame id;
			 */
			this._animationFrame = -1;

			/**
			 *  the duration of the sample
			 */
			this.duration = 0;

			/**
			 *  the recorded buffer
			 */
			this.buffer = this._recorder.audioBuffer;

			/**
			 *  the onset of the start of the recorded buffer
			 */
			this.onset = 0;

			/**
			 *  the countdown interval
			 */
			this._countDownNumber = 0;

			/**
			 *  metronome tick sound
			 */
			this._countDownSynth = new SimpleSynth().toMaster().set("envelope.release", 0.1);

		};

		MicOverlay.prototype.activateMicrophone = function() {
			//start the microphone
			this._recorder.activate();
		};

		MicOverlay.prototype.open = function() {
			//start the microphone
			this._waveform.clear();
			this._element.classList.add("Visible");
			this._recorder.open(function(){
				this.meter();
				this._countDownNumber = 0;
				this.countDown();
			}.bind(this), function(){
				this.close();
				this.ondenied();
			}.bind(this));
		};

		MicOverlay.prototype.countDown = function(){
			if (this._countDownNumber === 0){
				this._countDownSynth.triggerAttackRelease("C5", 0.05);
				this._countDownSynth.triggerAttackRelease("C6", 0.125, "+0.125");
				this._countDownTimeout = setTimeout(this.start.bind(this), 500);
			} 
			this._countDownNumber--;
		};

		MicOverlay.prototype.close = function() {
			this.stop();
			this._element.classList.remove("Visible");
			cancelAnimationFrame(this._animationFrame);
			clearTimeout(this._countDownTimeout);
			this._waveform.clear();
			this.onclose();
		};

		MicOverlay.prototype.cancel = function() {
			this.stop();
			this._element.classList.remove("Visible");
			cancelAnimationFrame(this._animationFrame);
			clearTimeout(this._countDownTimeout);
			this._waveform.clear();
			this.oncancel();
		};

		MicOverlay.prototype.meter = function() {
			this._animationFrame = requestAnimationFrame(this.meter.bind(this));
			var meterVal = this._recorder.meter;
			var transformString = "scale("+(1 + meterVal * 2).toString()+")";
			this._meterButton.style.transform = transformString;
			this._meterButton.style.webkitTransform = transformString;
			if (this.isRecording){
				this._waveform.draw(this._recorder.bufferArray, this._recorder.head);
			}
		};

		MicOverlay.prototype.start = function() {
			this.isRecording = true;
			this._recorder.start(function(){
				this._waveform.start();
			}.bind(this));
		};

		MicOverlay.prototype.stop = function() {
			this.isRecording = false;
			// this.recordButton.classList.remove("Active");
			this._recorder.stop();
			//get the duration
			this.duration = this._recorder.duration;
			this.onset = this._recorder.onset;
		};

		MicOverlay.prototype.closeMic = function() {
			this._recorder.close();
		};

		return MicOverlay;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 87 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(88);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./mic.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./mic.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 88 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, "/** \r\n *  SIZING\r\n */\n#MicOverlay {\n  position: fixed;\n  width: 100%;\n  height: 100%;\n  background-color: white;\n  left: 0px;\n  top: 0px;\n  opacity: 0;\n  z-index: 0;\n  transition: opacity 0.1s;\n  pointer-events: none;\n  display: none; }\n  #MicOverlay #WaveformContainer {\n    position: absolute;\n    width: 100%;\n    height: 200px;\n    left: 0px;\n    top: 50%;\n    margin-top: -100px; }\n    #MicOverlay #WaveformContainer canvas {\n      position: absolute;\n      width: 100%;\n      height: 100%;\n      left: 0px;\n      top: 0px; }\n    #MicOverlay #WaveformContainer #Playhead {\n      border-radius: 5px;\n      position: absolute;\n      left: 0px;\n      height: 100%;\n      background-color: #db4437;\n      width: 10px;\n      margin-left: 2px; }\n  #MicOverlay #CountDown {\n    position: absolute;\n    width: 100%;\n    text-align: center;\n    font-size: 40px;\n    height: 40px;\n    line-height: 40px;\n    top: 30%;\n    font-family: sans-serif; }\n  #MicOverlay #Cancel {\n    position: absolute;\n    top: 10px;\n    left: 10px;\n    margin-left: 0px;\n    box-shadow: none;\n    color: #cbcbcb;\n    background-color: white;\n    font-size: 40px; }\n  #MicOverlay #Cancel:active {\n    color: black; }\n\n@keyframes Scrub {\n  0% {\n    left: 0px;\n    opacity: 0; }\n  3% {\n    left: 0px;\n    opacity: 0; }\n  3.5% {\n    left: 0px;\n    opacity: 1; }\n  14% {\n    left: 0px;\n    opacity: 1; }\n  100% {\n    left: 100%;\n    opacity: 1; } }\n\n#MicOverlay.Visible {\n  display: initial;\n  opacity: 1;\n  pointer-events: initial;\n  z-index: 110; }\n  #MicOverlay.Visible #WaveformContainer #Playhead {\n    transition: left 50ms; }\n", ""]);

	// exports


/***/ }),
/* 89 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(90), __webpack_require__(6)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Microphone, Tone) {

		/**
		 *  the max buffer duration
		 */
		var bufferDuration = 3;

		/**
		 *  the recorder
		 */
		var Recorder = function(){

			/**
			 *  the mic input
			 *  @type  {Tone.Microphone}
			 */
			this.mic = new Microphone();

			/** 
			 *  @private
			 *  @type {ScriptProcessorNode}
			 */
			this.jsNode = Tone.context.createScriptProcessor(4096, 1, 1);
			//so it doesn't get garbage collected
			this.jsNode.noGC();

			this.mic.connect(this.jsNode);

			/**
			 *  The buffer to record into
			 */
			this.audioBuffer = Tone.context.createBuffer(1, Tone.context.sampleRate * bufferDuration, Tone.context.sampleRate);

			/**
			 *  the array to record into
			 */
			this.bufferArray = this.audioBuffer.getChannelData(0);

			/**
			 *  the position of the recording head within the buffer
			 */
			this.bufferPosition = 0;

			/**
			 *  if it's recording or not
			 */
			this.isRecording = false;

			/**
			 *  the current value of the meter
			 *  values between 0-1
			 */
			 this.meter = 0;

			 /**
			  *  the current recording head position 0-1.
			  */
			 this.head = 0;

			 /**
			  *  the callback when it's done recording
			  */
			 this.onended = Tone.noOp;

			 /**
			  *  the recorded duration
			  */
			 this.duration = 0;

			 /**
			  *  the computed onset of the recorded buffer
			  */
			 this.onset = 0;
		};

		/**
		 *  start the microphone
		 */
		Recorder.prototype.open = function(callback, err) {
			this.jsNode.onaudioprocess = this._onprocess.bind(this);
			this.mic.open(callback, err);
		};

		/**
		 *  record the input
		 */
		Recorder.prototype.start = function() {
			//0 out the buffer
			for (var i = 0; i < this.bufferArray.length; i++){
				this.bufferArray[i] = 0;
			}
			this.isRecording = true;
			this.bufferPosition = 0;
			this.head = 0;
			this.mic.start();
		};

		/**
		 *  stop recording
		 */
		Recorder.prototype.stop = function() {
			//blank callback
			this.mic.close();
			this.jsNode.onaudioprocess = function(){};
			this.isRecording = false;
			//compute the onset
			for (var i = 0; i < this.bufferArray.length; i++){
				if (Math.abs(this.bufferArray[i]) > 0.01){
					this.onset = (i / this.bufferArray.length) * bufferDuration;
					break;
				}
			}
		};

		/**
		 *  the audio process event
		 */
		Recorder.prototype._onprocess = function(event){
			//meter the input
			var bufferSize = this.jsNode.bufferSize;
			var smoothing = 0.3;
			var input = event.inputBuffer.getChannelData(0);
			var sum = 0;
			var x;
			var recordBufferLen = this.bufferArray.length;
			for (var i = 0; i < bufferSize; i++){
				x = input[i];
		    	sum += x * x;
				//if it's recording, fill the record buffer
				if (this.isRecording){
					if (this.bufferPosition < recordBufferLen){
						this.bufferArray[this.bufferPosition] = x;
						this.bufferPosition++;
					} else {
						this.stop();
						//get out of the audio thread
						setTimeout(this.onended.bind(this), 5);
					}
				}
			}
			this.head = this.bufferPosition / recordBufferLen;
			this.duration = this.head * bufferDuration;
			var rms = Math.sqrt(sum / bufferSize);
			this.meter = Math.max(rms, this.meter * smoothing);
		};

		return Recorder;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 90 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(91)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		/**
		 *  @class  Opens up the default source (typically the microphone).
		 *
		 *  @constructor
		 *  @extends {Tone.ExternalInput}
		 *  @example
		 *  //mic will feedback if played through master
		 *  var mic = new Tone.Microphone();
		 *  mic.open(function(){
		 *  	//start the mic at ten seconds
		 *  	mic.start(10);
		 *  });
		 *  //stop the mic
		 *  mic.stop(20);
		 */
		Tone.Microphone = function(){

			Tone.ExternalInput.call(this, 0);

		};

		Tone.extend(Tone.Microphone, Tone.ExternalInput);

		/**
		 *  If getUserMedia is supported by the browser.
		 *  @type  {Boolean}
		 *  @memberOf Tone.Microphone#
		 *  @name supported
		 *  @static
		 *  @readOnly
		 */
		Object.defineProperty(Tone.Microphone, "supported", {
			get : function(){
				return Tone.ExternalInput.supported;
			}
		});

		return Tone.Microphone;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 91 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(6), __webpack_require__(57), __webpack_require__(14)], __WEBPACK_AMD_DEFINE_RESULT__ = function(Tone){

		"use strict";

		//polyfill for getUserMedia
		navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || 
			navigator.mozGetUserMedia || navigator.msGetUserMedia;

		/**
		 *  @class  Tone.ExternalInput is a WebRTC Audio Input. Check 
		 *          [Media Stream API Support](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_API)
		 *          to see which browsers are supported. As of
		 *          writing this, Chrome, Firefox, and Opera 
		 *          support Media Stream. Chrome allows enumeration 
		 *          of the sources, and access to device name over a 
		 *          secure (HTTPS) connection. See [https://simpl.info](https://simpl.info/getusermedia/sources/index.html) 
		 *          vs [http://simple.info](https://simpl.info/getusermedia/sources/index.html) 
		 *          on a Chrome browser for the difference.
		 *         
		 *  @constructor
		 *  @extends {Tone.Source}
		 *  @param {number} [inputNum=0] If multiple inputs are present, select the input number. Chrome only.
		 *  @example
		 * //select the third input
		 * var motu = new Tone.ExternalInput(3);
		 * 
		 * //opening the input asks the user to activate their mic
		 * motu.open(function(){
		 * 	//opening is activates the microphone
		 * 	//starting lets audio through
		 * 	motu.start(10);
		 * });
		 */

		Tone.ExternalInput = function(){

			var options = this.optionsObject(arguments, ["inputNum"], Tone.ExternalInput.defaults);
			Tone.Source.call(this, options);

			/**
			 *  The MediaStreamNode 
			 *  @type {MediaStreamAudioSourceNode}
			 *  @private
			 */
			this._mediaStream = null;
			
			/**
			 *  The media stream created by getUserMedia.
			 *  @type {LocalMediaStream}
			 *  @private
			 */
			this._stream = null;
			
			/**
			 *  The constraints argument for getUserMedia
			 *  @type {Object}
			 *  @private
			 */
			this._constraints = {"audio" : true};

			/**
			 *  The input source position in Tone.ExternalInput.sources. 
			 *  Set before ExternalInput.open().
			 *  @type {Number}
			 *  @private
			 */
			this._inputNum = options.inputNum;

			/**
			 *  Gates the input signal for start/stop. 
			 *  Initially closed.
			 *  @type {GainNode}
			 *  @private
			 */
			this._gate = new Tone.Gain(0).connect(this.output);
		};

		Tone.extend(Tone.ExternalInput, Tone.Source);

		/**
		 * the default parameters
		 * @type {Object}
		 */
		Tone.ExternalInput.defaults = {
			"inputNum" : 0
		};

		/**
		 * wrapper for getUserMedia function
		 * @param {function} callback
		 * @param {function} error
		 * @private
		 */
		Tone.ExternalInput.prototype._getUserMedia = function(callback, error){
			if (!Tone.ExternalInput.supported){
				error("browser does not support 'getUserMedia'");
			}
			if (Tone.ExternalInput.sources[this._inputNum]){
				this._constraints = {
					audio : {
						optional : [{sourceId: Tone.ExternalInput.sources[this._inputNum].id}]
					}
				};
			}
			navigator.getUserMedia(this._constraints, function(stream){
				this._onStream(stream);
				callback();
			}.bind(this), function(err){
				error(err);
			});
		};

		/**
		 * called when the stream is successfully setup
		 * @param  {LocalMediaStream} stream
		 * @private
		 */
		Tone.ExternalInput.prototype._onStream = function(stream){
			if (!this.isFunction(this.context.createMediaStreamSource)){
				throw new Error("browser does not support the 'MediaStreamSourceNode'");
			}
			//can only start a new source if the previous one is closed
			if (!this._stream){
				this._stream = stream;
				//Wrap a MediaStreamSourceNode around the live input stream.
				this._mediaStream = this.context.createMediaStreamSource(stream);
				//Connect the MediaStreamSourceNode to a gate gain node
				this._mediaStream.connect(this._gate);
			} 
		};

		/**
		 *  Open the media stream 
		 *  @param  {function=} callback The callback function to 
		 *                       execute when the stream is open
		 *  @param  {function=} error The callback function to execute
		 *                            when the media stream can't open. 
		 *                            This is fired either because the browser
		 *                            doesn't support the media stream,
		 *                            or the user blocked opening the microphone. 
		 *  @return {Tone.ExternalInput} this
		 */
		Tone.ExternalInput.prototype.open = function(callback, error){
			callback = this.defaultArg(callback, Tone.noOp);
			error = this.defaultArg(error, Tone.noOp);
			Tone.ExternalInput.getSources(function(){
				this._getUserMedia(callback, error);
			}.bind(this));
			return this;
		};

		/**
		 *  Close the media stream
		 *  @return {Tone.ExternalInput} this
		 */
		Tone.ExternalInput.prototype.close = function(){
			if(this._stream){
				var track = this._stream.getTracks()[this._inputNum];
				if (!this.isUndef(track)){
					track.stop();
				} 
				this._stream = null;
			}
			return this;
		};

		/**
		 *  Start the stream
		 *  @private
		 */
		Tone.ExternalInput.prototype._start = function(time){
			time = this.toSeconds(time);
			this._gate.gain.setValueAtTime(1, time);
			return this;
		};

		/**
		 *  Stops the stream.
		 *  @private
		 */
		Tone.ExternalInput.prototype._stop = function(time){
			time = this.toSeconds(time);
			this._gate.gain.setValueAtTime(0, time);
			return this;
		};

		/**
		 * Clean up.
		 * @return {Tone.ExternalInput} this
		 */
		Tone.ExternalInput.prototype.dispose = function(){
			Tone.Source.prototype.dispose.call(this);
			this.close();
			if (this._mediaStream){
				this._mediaStream.disconnect();
				this._mediaStream = null;
			}
			this._constraints = null;
			this._gate.dispose();
			this._gate = null;
			return this;
		};

		///////////////////////////////////////////////////////////////////////////
		// STATIC METHODS
		///////////////////////////////////////////////////////////////////////////

		/**
		 * The array of available sources, different depending on whether connection is secure
		 * @type {Array}
		 * @static
		 */
		Tone.ExternalInput.sources = [];

		/**
		 * indicates whether browser supports MediaStreamTrack.getSources (i.e. Chrome vs Firefox)
		 * @type {Boolean}
		 * @private
		 */
		Tone.ExternalInput._canGetSources = !Tone.prototype.isUndef(window.MediaStreamTrack) && Tone.prototype.isFunction(MediaStreamTrack.getSources);

		/**
		 *  If getUserMedia is supported by the browser.
		 *  @type  {Boolean}
		 *  @memberOf Tone.ExternalInput#
		 *  @name supported
		 *  @static
		 *  @readOnly
		 */
		Object.defineProperty(Tone.ExternalInput, "supported", {
			get : function(){
				return Tone.prototype.isFunction(navigator.getUserMedia);
			}
		});

		/**
		 *  Populates the source list. Invokes the callback with an array of 
		 *  possible audio sources.
		 *  @param  {function=} callback Callback to be executed after populating list 
		 *  @return {Tone.ExternalInput} this
		 *  @static
		 *  @example
		 * var soundflower = new Tone.ExternalInput();
		 * Tone.ExternalInput.getSources(selectSoundflower);
		 *
		 * function selectSoundflower(sources){
		 * 	for(var i = 0; i < sources.length; i++){
		 * 		if(sources[i].label === "soundflower"){
		 * 			soundflower.inputNum = i;
		 * 			soundflower.open(function(){
		 * 				soundflower.start();
		 * 			});
		 * 			break;
		 * 		}
		 * 	}
		 * };
		 */
		Tone.ExternalInput.getSources = function(callback){
			if(Tone.ExternalInput.sources.length === 0 && Tone.ExternalInput._canGetSources){
				MediaStreamTrack.getSources(function (media_sources){
					for(var i = 0; i < media_sources.length; i++) {
						if(media_sources[i].kind === "audio"){
							Tone.ExternalInput.sources[i] = media_sources[i];
						}
					}
					callback(Tone.ExternalInput.sources);
				});
			} else {
				callback(Tone.ExternalInput.sources);
			}
			return this;
		};

		return Tone.ExternalInput;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 92 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function () {

		var waveformHeight = 200;

		/**
		 *  draws a waveform
		 *  and let's you select the start position
		 */
		var Waveform = function(container, buffer){

			/**
			 *  the waveform container
			 */
			this.element = document.createElement("DIV");
			this.element.id = "WaveformContainer";
			container.appendChild(this.element);

			/**
			 *  the waveform canvas
			 */
			this.canvas = document.createElement("canvas");
			this.element.appendChild(this.canvas);

			/**
			 *  the playhead
			 */
			this.playhead = document.createElement("div");
			this.playhead.id = "Playhead";
			this.element.appendChild(this.playhead);

			/**
			 *  the drawing context
			 */
			this.context = this.canvas.getContext("2d");

			this.width = window.innerWidth * 2;
			this.height = waveformHeight * 2;

			//size it
			this.context.canvas.width = this.width;
			this.context.canvas.height = this.height;

			/**
			 *  the last drawn position
			 */
			this.lastPosition = 0;

			/**
			 *  the amplitudes
			 */
			this.amplitudes = [];
		};

		/**
		 *  Add a value to the waveform at a specific position
		 */
		Waveform.prototype.add = function(value, position) {
			//draw a rectange at that position
			if (position - this.lastPosition > 0){
				this.context.clearRect(0, 0, this.width, this.height);
				// this.context.fillStyle = "rgb(204, 204, 204)";
				this.context.fillStyle = "blue";
				this.context.lineJoin = "round";
				this.amplitudes.push({
					position : position,
					value : Math.pow(value, 0.8)
				});
				var lastPosition = 0;
				this.context.beginPath();
				var sample, height, currentPosition;
				this.context.moveTo(0, (this.height) / 2);
				for (var i = 0; i < this.amplitudes.length; i++){
					sample = this.amplitudes[i];
					height = Math.max(Math.round(this.height * sample.value), 1);
					currentPosition = Math.round(sample.position * this.width);
					this.context.lineTo(currentPosition, (this.height - height) / 2);
				}
				//draw the line down to the current position on the bottom side
				for (var j = this.amplitudes.length - 1; j >= 0; j--){
					sample = this.amplitudes[j];
					height = Math.max(Math.round(this.height * sample.value), 1);
					currentPosition = Math.round(sample.position * this.width);
					this.context.lineTo(currentPosition, (this.height + height) / 2);
				}
				this.context.lineTo(0, (this.height) / 2);
				this.context.closePath();
				this.context.fill();
				// var height = Math.max(Math.round(this.height * value), 1);
				// var currentPosition = Math.round(position * this.width);
				// var lastPosition = Math.round(this.lastPosition * this.width);
				// this.context.fillRect(lastPosition, (this.height - height) / 2, currentPosition - lastPosition, height);

			}
			this.setHead(position);
			this.lastPosition = position;
		};

		Waveform.prototype.draw = function(array, position){
			this.playhead.style.left = (position * 100).toFixed(1) + "%";
			// var array = buffer.getChannelData(0);		
			var context = this.context;
			context.clearRect(0, 0, this.width, this.height);
			context.fillStyle = "rgb(204, 204, 204)";
			var len = array.length;
			var height = this.height;
			var chunkSize = len / this.width;
			var chunkWidth = 2;
			var halfHeight = this.height / 2;
			var lastSample = 0;
			for (var x = 0; x < this.width * position; x+=chunkWidth){
				var y = Math.abs(array[Math.floor(x * chunkSize)]);
				y = Math.pow(y, 0.5);
				y = Math.max(lastSample * 0.9, y);
				lastSample = y;
				y *= halfHeight;
				context.fillRect(x, halfHeight - y/2, chunkWidth * 3, y);
			}
		};

		/**
		 *  move the playhead. position value should be normalized 0-1.
		 */
		Waveform.prototype.setHead = function(position) {

		};

		/**
		 *  start the waveform recording
		 */
		Waveform.prototype.start = function() {
			this.clear();
			this.lastPosition = 0;
		};

		/**
		 *  start the waveform recording
		 */
		Waveform.prototype.clear = function() {
			this.setHead(0);
			this.amplitudes = [];
			this.context.clearRect(0, 0, this.width, this.height);
			this.context.fillStyle = "black";
			this.playhead.style.left = "0px";
		};

		return Waveform;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 93 */
/***/ (function(module, exports) {

	module.exports = {"header":{"tempo":64,"timeSignature":[4,4]},"notes":[{"time":"0i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"12i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"24i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"36i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"48i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"60i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"72i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"84i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"96i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"108i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"120i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"132i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"144i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"156i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"168i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"180i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"192i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"204i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"216i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"228i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"240i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"252i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"264i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"276i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"288i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"300i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"312i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"324i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"336i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"348i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"360i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"372i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"384i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"396i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"408i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"420i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"432i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"444i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"456i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"468i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"480i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"492i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"504i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"516i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"528i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"540i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"552i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"564i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"576i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"588i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"600i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"612i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"624i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"636i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"648i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"660i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"672i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"684i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"696i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"708i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"720i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"732i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"744i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"756i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"768i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"780i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"792i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"804i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"816i","midiNote":81,"note":"A5","velocity":1,"duration":"12i"},{"time":"828i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"840i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"852i","midiNote":81,"note":"A5","velocity":1,"duration":"12i"},{"time":"864i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"876i","midiNote":64,"note":"E4","velocity":1,"duration":"84i"},{"time":"888i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"900i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"912i","midiNote":81,"note":"A5","velocity":1,"duration":"12i"},{"time":"924i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"936i","midiNote":76,"note":"E5","velocity":1,"duration":"12i"},{"time":"948i","midiNote":81,"note":"A5","velocity":1,"duration":"12i"},{"time":"960i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"972i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"984i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"996i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"1008i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1020i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1032i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"1044i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1056i","midiNote":60,"note":"C4","velocity":1,"duration":"96i"},{"time":"1068i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"1080i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1092i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"1104i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1116i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1128i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"1140i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1152i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"1164i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"1176i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1188i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1200i","midiNote":79,"note":"G5","velocity":1,"duration":"12i"},{"time":"1212i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1224i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1236i","midiNote":79,"note":"G5","velocity":1,"duration":"12i"},{"time":"1248i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"1260i","midiNote":62,"note":"D4","velocity":1,"duration":"84i"},{"time":"1272i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1284i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1296i","midiNote":79,"note":"G5","velocity":1,"duration":"12i"},{"time":"1308i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1320i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"1332i","midiNote":79,"note":"G5","velocity":1,"duration":"12i"},{"time":"1344i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"1356i","midiNote":60,"note":"C4","velocity":1,"duration":"84i"},{"time":"1368i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1380i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1392i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1404i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1416i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1428i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1440i","midiNote":59,"note":"B3","velocity":1,"duration":"96i"},{"time":"1452i","midiNote":60,"note":"C4","velocity":1,"duration":"84i"},{"time":"1464i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1476i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1488i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1500i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1512i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1524i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1536i","midiNote":57,"note":"A3","velocity":1,"duration":"96i"},{"time":"1548i","midiNote":60,"note":"C4","velocity":1,"duration":"84i"},{"time":"1560i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1572i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1584i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1596i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1608i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1620i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1632i","midiNote":57,"note":"A3","velocity":1,"duration":"96i"},{"time":"1644i","midiNote":60,"note":"C4","velocity":1,"duration":"84i"},{"time":"1656i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1668i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1680i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1692i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"1704i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1716i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1728i","midiNote":50,"note":"D3","velocity":1,"duration":"96i"},{"time":"1740i","midiNote":57,"note":"A3","velocity":1,"duration":"84i"},{"time":"1752i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1764i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1776i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1788i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1800i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1812i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1824i","midiNote":50,"note":"D3","velocity":1,"duration":"96i"},{"time":"1836i","midiNote":57,"note":"A3","velocity":1,"duration":"84i"},{"time":"1848i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1860i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1872i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1884i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1896i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"1908i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"1920i","midiNote":55,"note":"G3","velocity":1,"duration":"96i"},{"time":"1932i","midiNote":59,"note":"B3","velocity":1,"duration":"84i"},{"time":"1944i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1956i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"1968i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"1980i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"1992i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2004i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2016i","midiNote":55,"note":"G3","velocity":1,"duration":"96i"},{"time":"2028i","midiNote":59,"note":"B3","velocity":1,"duration":"84i"},{"time":"2040i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2052i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2064i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2076i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2088i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2100i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2112i","midiNote":55,"note":"G3","velocity":1,"duration":"96i"},{"time":"2124i","midiNote":58,"note":"A#3","velocity":1,"duration":"84i"},{"time":"2136i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"2148i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2160i","midiNote":73,"note":"C#5","velocity":1,"duration":"12i"},{"time":"2172i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"2184i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2196i","midiNote":73,"note":"C#5","velocity":1,"duration":"12i"},{"time":"2208i","midiNote":55,"note":"G3","velocity":1,"duration":"96i"},{"time":"2220i","midiNote":58,"note":"A#3","velocity":1,"duration":"84i"},{"time":"2232i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"2244i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2256i","midiNote":73,"note":"C#5","velocity":1,"duration":"12i"},{"time":"2268i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"2280i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2292i","midiNote":73,"note":"C#5","velocity":1,"duration":"12i"},{"time":"2304i","midiNote":53,"note":"F3","velocity":1,"duration":"96i"},{"time":"2316i","midiNote":57,"note":"A3","velocity":1,"duration":"84i"},{"time":"2328i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2340i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"2352i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"2364i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2376i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"2388i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"2400i","midiNote":53,"note":"F3","velocity":1,"duration":"96i"},{"time":"2412i","midiNote":57,"note":"A3","velocity":1,"duration":"84i"},{"time":"2424i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2436i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"2448i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"2460i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2472i","midiNote":69,"note":"A4","velocity":1,"duration":"12i"},{"time":"2484i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"2496i","midiNote":53,"note":"F3","velocity":1,"duration":"96i"},{"time":"2508i","midiNote":56,"note":"G#3","velocity":1,"duration":"84i"},{"time":"2520i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2532i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2544i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2556i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2568i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2580i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2592i","midiNote":53,"note":"F3","velocity":1,"duration":"96i"},{"time":"2604i","midiNote":56,"note":"G#3","velocity":1,"duration":"84i"},{"time":"2616i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2628i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2640i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2652i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"2664i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2676i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"2688i","midiNote":52,"note":"E3","velocity":1,"duration":"96i"},{"time":"2700i","midiNote":55,"note":"G3","velocity":1,"duration":"84i"},{"time":"2712i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2724i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2736i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"2748i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2760i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2772i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"2784i","midiNote":52,"note":"E3","velocity":1,"duration":"96i"},{"time":"2796i","midiNote":55,"note":"G3","velocity":1,"duration":"84i"},{"time":"2808i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2820i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2832i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"2844i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2856i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"2868i","midiNote":72,"note":"C5","velocity":1,"duration":"12i"},{"time":"2880i","midiNote":52,"note":"E3","velocity":1,"duration":"96i"},{"time":"2892i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"2904i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"2916i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2928i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2940i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"2952i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"2964i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"2976i","midiNote":52,"note":"E3","velocity":1,"duration":"96i"},{"time":"2988i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"3000i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3012i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3024i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3036i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3048i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3060i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3072i","midiNote":50,"note":"D3","velocity":1,"duration":"96i"},{"time":"3084i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"3096i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3108i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3120i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3132i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3144i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3156i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3168i","midiNote":50,"note":"D3","velocity":1,"duration":"96i"},{"time":"3180i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"3192i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3204i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3216i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3228i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3240i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3252i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3264i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"3276i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"3288i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3300i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"3312i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3324i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3336i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"3348i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3360i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"3372i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"3384i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3396i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"3408i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3420i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3432i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"3444i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"3456i","midiNote":48,"note":"C3","velocity":1,"duration":"96i"},{"time":"3468i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"3480i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3492i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3504i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3516i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3528i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3540i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3552i","midiNote":48,"note":"C3","velocity":1,"duration":"96i"},{"time":"3564i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"3576i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3588i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3600i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3612i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"3624i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3636i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3648i","midiNote":48,"note":"C3","velocity":1,"duration":"96i"},{"time":"3660i","midiNote":55,"note":"G3","velocity":1,"duration":"84i"},{"time":"3672i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"3684i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3696i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3708i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"3720i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3732i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3744i","midiNote":48,"note":"C3","velocity":1,"duration":"96i"},{"time":"3756i","midiNote":55,"note":"G3","velocity":1,"duration":"84i"},{"time":"3768i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"3780i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3792i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3804i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"3816i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3828i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3840i","midiNote":41,"note":"F2","velocity":1,"duration":"96i"},{"time":"3852i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"3864i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3876i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3888i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3900i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3912i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3924i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3936i","midiNote":41,"note":"F2","velocity":1,"duration":"96i"},{"time":"3948i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"3960i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"3972i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"3984i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"3996i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"4008i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4020i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"4032i","midiNote":42,"note":"F#2","velocity":1,"duration":"96i"},{"time":"4044i","midiNote":48,"note":"C3","velocity":1,"duration":"84i"},{"time":"4056i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"4068i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4080i","midiNote":63,"note":"D#4","velocity":1,"duration":"12i"},{"time":"4092i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"4104i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4116i","midiNote":63,"note":"D#4","velocity":1,"duration":"12i"},{"time":"4128i","midiNote":42,"note":"F#2","velocity":1,"duration":"96i"},{"time":"4140i","midiNote":48,"note":"C3","velocity":1,"duration":"84i"},{"time":"4152i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"4164i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4176i","midiNote":63,"note":"D#4","velocity":1,"duration":"12i"},{"time":"4188i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"4200i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4212i","midiNote":63,"note":"D#4","velocity":1,"duration":"12i"},{"time":"4224i","midiNote":44,"note":"G#2","velocity":1,"duration":"96i"},{"time":"4236i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"4248i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4260i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4272i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4284i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4296i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4308i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4320i","midiNote":44,"note":"G#2","velocity":1,"duration":"96i"},{"time":"4332i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"4344i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4356i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4368i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4380i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4392i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4404i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4416i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4428i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"4440i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4452i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4464i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4476i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4488i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4500i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4512i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4524i","midiNote":53,"note":"F3","velocity":1,"duration":"84i"},{"time":"4536i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4548i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4560i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4572i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4584i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"4596i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"4608i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4620i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"4632i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4644i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4656i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"4668i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4680i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4692i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"4704i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4716i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"4728i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4740i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4752i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"4764i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4776i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4788i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"4800i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4812i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"4824i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4836i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4848i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"4860i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4872i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4884i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"4896i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"4908i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"4920i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4932i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4944i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"4956i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"4968i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"4980i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"4992i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5004i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5016i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5028i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5040i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5052i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5064i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5076i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5088i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5100i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5112i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5124i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5136i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5148i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5160i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5172i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5184i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5196i","midiNote":51,"note":"D#3","velocity":1,"duration":"84i"},{"time":"5208i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"5220i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5232i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"5244i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"5256i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5268i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"5280i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5292i","midiNote":51,"note":"D#3","velocity":1,"duration":"84i"},{"time":"5304i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"5316i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5328i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"5340i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"5352i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5364i","midiNote":66,"note":"F#4","velocity":1,"duration":"12i"},{"time":"5376i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5388i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"5400i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5412i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5424i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"5436i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5448i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5460i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"5472i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5484i","midiNote":52,"note":"E3","velocity":1,"duration":"84i"},{"time":"5496i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5508i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5520i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"5532i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5544i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5556i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"5568i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5580i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5592i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5604i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5616i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5628i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5640i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5652i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5664i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5676i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5688i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5700i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5712i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5724i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5736i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"5748i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5760i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5772i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5784i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5796i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5808i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5820i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5832i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5844i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5856i","midiNote":43,"note":"G2","velocity":1,"duration":"96i"},{"time":"5868i","midiNote":50,"note":"D3","velocity":1,"duration":"84i"},{"time":"5880i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5892i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5904i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5916i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5928i","midiNote":59,"note":"B3","velocity":1,"duration":"12i"},{"time":"5940i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"5952i","midiNote":36,"note":"C2","velocity":1,"duration":"96i"},{"time":"5964i","midiNote":48,"note":"C3","velocity":1,"duration":"84i"},{"time":"5976i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"5988i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"6000i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"6012i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"6024i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"6036i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"6048i","midiNote":36,"note":"C2","velocity":1,"duration":"96i"},{"time":"6060i","midiNote":48,"note":"C3","velocity":1,"duration":"84i"},{"time":"6072i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"6084i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"6096i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"6108i","midiNote":55,"note":"G3","velocity":1,"duration":"12i"},{"time":"6120i","midiNote":58,"note":"A#3","velocity":1,"duration":"12i"},{"time":"6132i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"6144i","midiNote":36,"note":"C2","velocity":1,"duration":"192i"},{"time":"6156i","midiNote":48,"note":"C3","velocity":1,"duration":"180i"},{"time":"6168i","midiNote":53,"note":"F3","velocity":1,"duration":"12i"},{"time":"6180i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"6192i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"6204i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"6216i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"6228i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"6240i","midiNote":60,"note":"C4","velocity":1,"duration":"12i"},{"time":"6252i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"6264i","midiNote":53,"note":"F3","velocity":1,"duration":"12i"},{"time":"6276i","midiNote":57,"note":"A3","velocity":1,"duration":"12i"},{"time":"6288i","midiNote":53,"note":"F3","velocity":1,"duration":"12i"},{"time":"6300i","midiNote":50,"note":"D3","velocity":1,"duration":"12i"},{"time":"6312i","midiNote":53,"note":"F3","velocity":1,"duration":"12i"},{"time":"6324i","midiNote":50,"note":"D3","velocity":1,"duration":"12i"},{"time":"6336i","midiNote":36,"note":"C2","velocity":1,"duration":"192i"},{"time":"6348i","midiNote":47,"note":"B2","velocity":1,"duration":"180i"},{"time":"6360i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"6372i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"6384i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"6396i","midiNote":77,"note":"F5","velocity":1,"duration":"12i"},{"time":"6408i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"6420i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"6432i","midiNote":74,"note":"D5","velocity":1,"duration":"12i"},{"time":"6444i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"6456i","midiNote":67,"note":"G4","velocity":1,"duration":"12i"},{"time":"6468i","midiNote":71,"note":"B4","velocity":1,"duration":"12i"},{"time":"6480i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"6492i","midiNote":65,"note":"F4","velocity":1,"duration":"12i"},{"time":"6504i","midiNote":64,"note":"E4","velocity":1,"duration":"12i"},{"time":"6516i","midiNote":62,"note":"D4","velocity":1,"duration":"12i"},{"time":"6528i","midiNote":36,"note":"C2","velocity":1,"duration":"192i"},{"time":"6528i","midiNote":48,"note":"C3","velocity":1,"duration":"192i"},{"time":"6528i","midiNote":64,"note":"E4","velocity":1,"duration":"192i"},{"time":"6528i","midiNote":67,"note":"G4","velocity":1,"duration":"192i"},{"time":"6528i","midiNote":72,"note":"C5","velocity":1,"duration":"192i"}]}

/***/ }),
/* 94 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 *  StartAudioContext.js
	 *  @author Yotam Mann
	 *  @license http://opensource.org/licenses/MIT MIT License
	 *  @copyright 2016 Yotam Mann
	 */
	(function (root, factory) {
		if (true) {
			!(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory), __WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ? (__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__))
		 } else if (typeof module === "object" && module.exports) {
	        module.exports = factory()
		} else {
			root.StartAudioContext = factory()
	  }
	}(this, function () {

		//TAP LISTENER/////////////////////////////////////////////////////////////

		/**
		 * @class  Listens for non-dragging tap ends on the given element
		 * @param {Element} element
		 * @internal
		 */
		var TapListener = function(element, context){

			this._dragged = false

			this._element = element

			this._bindedMove = this._moved.bind(this)
			this._bindedEnd = this._ended.bind(this, context)

			element.addEventListener("touchstart", this._bindedEnd)
			element.addEventListener("touchmove", this._bindedMove)
			element.addEventListener("touchend", this._bindedEnd)
			element.addEventListener("mouseup", this._bindedEnd)
		}

		/**
		 * drag move event
		 */
		TapListener.prototype._moved = function(e){
			this._dragged = true
		};

		/**
		 * tap ended listener
		 */
		TapListener.prototype._ended = function(context){
			if (!this._dragged){
				startContext(context)
			}
			this._dragged = false
		};

		/**
		 * remove all the bound events
		 */
		TapListener.prototype.dispose = function(){
			this._element.removeEventListener("touchstart", this._bindedEnd)
			this._element.removeEventListener("touchmove", this._bindedMove)
			this._element.removeEventListener("touchend", this._bindedEnd)
			this._element.removeEventListener("mouseup", this._bindedEnd)
			this._bindedMove = null
			this._bindedEnd = null
			this._element = null
		};

		//END TAP LISTENER/////////////////////////////////////////////////////////

		/**
		 * Plays a silent sound and also invoke the "resume" method
		 * @param {AudioContext} context
		 * @private
		 */
		function startContext(context){
			// this accomplishes the iOS specific requirement
			var buffer = context.createBuffer(1, 1, context.sampleRate)
			var source = context.createBufferSource()
			source.buffer = buffer
			source.connect(context.destination)
			source.start(0)

			// resume the audio context
			if (context.resume){
				context.resume()
			}
		}

		/**
		 * Returns true if the audio context is started
		 * @param  {AudioContext}  context
		 * @return {Boolean}
		 * @private
		 */
		function isStarted(context){
			 return context.state === "running"
		}

		/**
		 * Invokes the callback as soon as the AudioContext
		 * is started
		 * @param  {AudioContext}   context
		 * @param  {Function} callback
		 */
		function onStarted(context, callback){

			function checkLoop(){
				if (isStarted(context)){
					callback()
				} else {
					requestAnimationFrame(checkLoop)
					if (context.resume){
						context.resume()
					}
				}
			}

			if (isStarted(context)){
				callback()
			} else {
				checkLoop()
			}
		}

		/**
		 * Add a tap listener to the audio context
		 * @param  {Array|Element|String|jQuery} element
		 * @param {Array} tapListeners
		 */
		function bindTapListener(element, tapListeners, context){
			if (Array.isArray(element) || (NodeList && element instanceof NodeList)){
				for (var i = 0; i < element.length; i++){
					bindTapListener(element[i], tapListeners, context)
				}
			} else if (typeof element === "string"){
				bindTapListener(document.querySelectorAll(element), tapListeners, context)
			} else if (element.jquery && typeof element.toArray === "function"){
				bindTapListener(element.toArray(), tapListeners, context)
			} else if (Element && element instanceof Element){
				//if it's an element, create a TapListener
				var tap = new TapListener(element, context)
				tapListeners.push(tap)
			} 
		}

		/**
		 * @param {AudioContext} context The AudioContext to start.
		 * @param {Array|String|Element|jQuery=} elements For iOS, the list of elements
		 *                                               to bind tap event listeners
		 *                                               which will start the AudioContext. If
		 *                                               no elements are given, it will bind
		 *                                               to the document.body.
		 * @param {Function=} callback The callback to invoke when the AudioContext is started.
		 * @return {Promise} The promise is invoked when the AudioContext
		 *                       is started.
		 */
		function StartAudioContext(context, elements, callback){

			//the promise is invoked when the AudioContext is started
			var promise = new Promise(function(success) {
				onStarted(context, success)
			})

			// The TapListeners bound to the elements
			var tapListeners = []

			// add all the tap listeners
			if (!elements){
				elements = document.body
			}
			bindTapListener(elements, tapListeners, context)

			//dispose all these tap listeners when the context is started
			promise.then(function(){
				for (var i = 0; i < tapListeners.length; i++){
					tapListeners[i].dispose()
				}
				tapListeners = null

				if (callback){
					callback()
				}
			})

			return promise
		}

		return StartAudioContext
	}))

/***/ }),
/* 95 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(96);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./main.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./main.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 96 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, "@charset \"UTF-8\";\n@font-face {\n  font-family: \"icons\";\n  src: url(\"https://gweb-musiclab-site.appspot.com/static/fonts/icons/icons.eot\");\n  src: url(\"https://gweb-musiclab-site.appspot.com/static/fonts/icons/icons.eot?#iefix\") format(\"eot\"), url(\"https://gweb-musiclab-site.appspot.com/static/fonts/icons/icons.woff\") format(\"woff\"), url(\"https://gweb-musiclab-site.appspot.com/static/fonts/icons/icons.ttf\") format(\"truetype\"), url(\"https://gweb-musiclab-site.appspot.com/static/fonts/icons/icons.svg#icons\") format(\"svg\"); }\n\n.icon-svg_808:before, .icon-svg_back_arrow:before, .icon-svg_bird:before, .icon-svg_close-button:before, .icon-svg_computer:before, .icon-svg_facebook:before, .icon-svg_fast_man:before, .icon-svg_flute:before, .icon-svg_frowny_face:before, .icon-svg_go_arrow:before, .icon-svg_gplus:before, .icon-svg_hamburger_menu:before, .icon-svg_hand:before, .icon-svg_harp:before, .icon-svg_horn:before, .icon-svg_left_arrow:before, .icon-svg_man:before, .icon-svg_metronome:before, .icon-svg_no_record:before, .icon-svg_pause:before, .icon-svg_piano:before, .icon-svg_play:before, .icon-svg_record:before, .icon-svg_right_arrow:before, .icon-svg_rotate_phone:before, .icon-svg_slow_man:before, .icon-svg_twitter:before, .icon-svg_wave_form:before, .icon-svg_wine_glass:before {\n  font-family: \"icons\";\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n  font-style: normal;\n  font-variant: normal;\n  font-weight: normal;\n  text-decoration: none;\n  text-transform: none; }\n\n.icon-svg_808:before {\n  content: \"\\E001\"; }\n\n.icon-svg_back_arrow:before {\n  content: \"\\E002\"; }\n\n.icon-svg_bird:before {\n  content: \"\\E003\"; }\n\n.icon-svg_close-button:before {\n  content: \"\\E004\"; }\n\n.icon-svg_computer:before {\n  content: \"\\E005\"; }\n\n.icon-svg_facebook:before {\n  content: \"\\E006\"; }\n\n.icon-svg_fast_man:before {\n  content: \"\\E007\"; }\n\n.icon-svg_flute:before {\n  content: \"\\E008\"; }\n\n.icon-svg_frowny_face:before {\n  content: \"\\E009\"; }\n\n.icon-svg_go_arrow:before {\n  content: \"\\E00A\"; }\n\n.icon-svg_gplus:before {\n  content: \"\\E00B\"; }\n\n.icon-svg_hamburger_menu:before {\n  content: \"\\E00C\"; }\n\n.icon-svg_hand:before {\n  content: \"\\E00D\"; }\n\n.icon-svg_harp:before {\n  content: \"\\E00E\"; }\n\n.icon-svg_horn:before {\n  content: \"\\E00F\"; }\n\n.icon-svg_left_arrow:before {\n  content: \"\\E010\"; }\n\n.icon-svg_man:before {\n  content: \"\\E011\"; }\n\n.icon-svg_metronome:before {\n  content: \"\\E012\"; }\n\n.icon-svg_no_record:before {\n  content: \"\\E013\"; }\n\n.icon-svg_pause:before {\n  content: \"\\E014\"; }\n\n.icon-svg_piano:before {\n  content: \"\\E015\"; }\n\n.icon-svg_play:before {\n  content: \"\\E016\"; }\n\n.icon-svg_record:before {\n  content: \"\\E017\"; }\n\n.icon-svg_right_arrow:before {\n  content: \"\\E018\"; }\n\n.icon-svg_rotate_phone:before {\n  content: \"\\E019\"; }\n\n.icon-svg_slow_man:before {\n  content: \"\\E01A\"; }\n\n.icon-svg_twitter:before {\n  content: \"\\E01B\"; }\n\n.icon-svg_wave_form:before {\n  content: \"\\E01C\"; }\n\n.icon-svg_wine_glass:before {\n  content: \"\\E01D\"; }\n\nhtml, body {\n  position: fixed;\n  overflow: hidden;\n  margin: 0px;\n  width: 100%;\n  height: 100%;\n  /* font-family: \"Roboto\";\r\n\tfont-size: 24px;\r\n\tfont-weight: 300; */\n  -webkit-touch-callout: none;\n  -webkit-tap-highlight-color: rgba(0, 0, 0, 0); }\n\n#iOSTap {\n  position: absolute;\n  left: 0px;\n  top: 0px;\n  width: 100%;\n  height: 100%;\n  z-index: 10000;\n  background-color: white; }\n", ""]);

	// exports


/***/ }),
/* 97 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;/**
	 * Copyright 2016 Google Inc.
	 *
	 * Licensed under the Apache License, Version 2.0 (the "License");
	 * you may not use this file except in compliance with the License.
	 * You may obtain a copy of the License at
	 *
	 *     http://www.apache.org/licenses/LICENSE-2.0
	 *
	 * Unless required by applicable law or agreed to in writing, software
	 * distributed under the License is distributed on an "AS IS" BASIS,
	 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	 * See the License for the specific language governing permissions and
	 * limitations under the License.
	 */

	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(5)], __WEBPACK_AMD_DEFINE_RESULT__ = function (Transport) {

		var OrientationListener = function(callback){

			window.addEventListener("orientationchange", this._changed.bind(this));
			if (window.screen && window.screen.orientation){
				window.screen.orientation.addEventListener("change", this._screenChange.bind(this));
			}

			//also pause when it's resized (since that throws the playback off)
			window.addEventListener("resize", callback);

			this._callback = callback;
		};

		OrientationListener.prototype._changed = function(){
			//check if it's landscape
			if (Math.abs(window.orientation) === 90){
				if (Transport.state === "started"){
					this._callback();
				}
			}
		};

		OrientationListener.prototype._screenChange = function(){		
			//check if it's landscape
			if (Math.abs(window.screen.orientation.angle) === 90){
				if (Transport.state === "started"){
					this._callback();
				}
			}
		};

		return OrientationListener;
	}.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 98 */
/***/ (function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;!(__WEBPACK_AMD_DEFINE_ARRAY__ = [__webpack_require__(99), __webpack_require__(101), __webpack_require__(32), __webpack_require__(5)], __WEBPACK_AMD_DEFINE_RESULT__ = function (overlayStyle, MidiConvert, Loader, Transport) {
	        const MIDI_UPLOAD_MSG_ERROR = 'Only MIDI files will work here.';
	        const MIDI_UPLOAD_MSG = 'Drop your MIDI file here.';

	        var Overlay = function (container, roll, interface) {
	            this._roll = roll;
	            this._interface = interface;
	            this._withinEnter = false;
	            this._loader = null;
	            this._timeout = null;

	            this._overlay = document.createElement("div");
	            this._overlay.classList.add("Overlay");
	            this._overlay.innerHTML = MIDI_UPLOAD_MSG;
	            container.appendChild(this._overlay);

	            container.addEventListener('dragover', this._handleDragOver.bind(this));
	            container.addEventListener('dragenter', this._handleDragEnter.bind(this));
	            container.addEventListener('dragleave', this._handleDragLeave.bind(this));
	            container.addEventListener('drop', this._handleDrop.bind(this));
	        };

	        Overlay.prototype._handleDragOver = function(e) {
	            e.preventDefault();
	        };

	        Overlay.prototype._handleDragLeave = function(e) {
	            if (!this._withinEnter) {
	                this._overlay.classList.remove('Active');
	                this._overlay.innerHTML = MIDI_UPLOAD_MSG;
	            }
	            this._withinEnter = false;
	        };

	        Overlay.prototype._handleDragEnter = function(e) {
	            e.preventDefault();
	            clearTimeout(this._timeout);
	            this._withinEnter = true;
	            setTimeout(function () {
	                this._withinEnter = false;
	            }, 0);
	            this._overlay.classList.add('Active');

	        };

	        Overlay.prototype._handleDrop = function(e) {
	            e.preventDefault();
	            const files = e.dataTransfer.files || e.target.files;
	            if (files) {
	                const file = files[0];
	                if (file.type === 'audio/midi' || file.type === 'audio/mid') {
	                    if (Transport.state === "started") {
	                        Transport.stop();
	                        this._interface.stop();
	                        this._interface._playButton.onPlay(false);
	                    }

	                    this._overlay.classList.remove('Active');
	                    this._loader = new Loader();

	                    var reader = new FileReader();
	                    reader.onload = function (e) {
	                        var midi = MidiConvert.parse(e.target.result);
	                        const maxNotes = Math.max.apply(Math, midi.tracks.map(function (t) {
	                            return t.notes.length;
	                        }));
	                        const longestTrack = midi.tracks.find(function (t) {
	                            return t.notes.length === maxNotes;
	                        });

	                        midi.notes = longestTrack.notes;
	                        midi.header.tempo = midi.header.bpm;

	                        for (var i = 0; i < midi.notes.length; i++) {
	                            var t = midi.notes[i].time;
	                            var d = midi.notes[i].duration;
	                            midi.notes[i].time = Math.floor(t * 100) + 'i';
	                            midi.notes[i].duration = Math.floor(d * 100) + 'i';
	                            midi.notes[i].midiNote = midi.notes[i].midi;
	                            midi.notes[i].note = midi.notes[i].name;
	                        }

	                        this._roll.setScore(midi);
	                        this._loader.resolve();

	                        document.getElementById('PlayPause').classList.add('Shifted');
	                        document.querySelectorAll('#Previous, #Next').forEach(function(n) { n.classList.add('Hidden') });
	                        document.getElementById('Midi').querySelector('.Text').innerHTML = file.name || "untitled.mid";
	                        document.getElementById('Midi').classList.add('Active');
	                    }.bind(this);
	                    reader.readAsBinaryString(file);

	                } else {
	                    this._overlay.innerHTML = MIDI_UPLOAD_MSG_ERROR;

	                    this._timeout = setTimeout(function() {
	                        this._overlay.classList.remove('Active');
	                        this._overlay.innerHTML = MIDI_UPLOAD_MSG;
	                        this._withinEnter = false;
	                    }.bind(this), 2000);
	                }
	            }
	        };

	        return Overlay;
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ }),
/* 99 */
/***/ (function(module, exports, __webpack_require__) {

	// style-loader: Adds some css to the DOM by adding a <style> tag

	// load the styles
	var content = __webpack_require__(100);
	if(typeof content === 'string') content = [[module.id, content, '']];
	// add the styles to the DOM
	var update = __webpack_require__(25)(content, {});
	if(content.locals) module.exports = content.locals;
	// Hot Module Replacement
	if(false) {
		// When the styles change, update the <style> tags
		if(!content.locals) {
			module.hot.accept("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./overlay.scss", function() {
				var newContent = require("!!../node_modules/css-loader/index.js!../node_modules/autoprefixer-loader/index.js!../node_modules/sass-loader/index.js!./overlay.scss");
				if(typeof newContent === 'string') newContent = [[module.id, newContent, '']];
				update(newContent);
			});
		}
		// When the module is disposed, remove the <style> tags
		module.hot.dispose(function() { update(); });
	}

/***/ }),
/* 100 */
/***/ (function(module, exports, __webpack_require__) {

	exports = module.exports = __webpack_require__(24)();
	// imports


	// module
	exports.push([module.id, ".Overlay {\n  -ms-flex-align: center;\n      align-items: center;\n  background-color: rgba(255, 255, 255, 0.9);\n  bottom: 0;\n  color: #333;\n  display: -ms-flexbox;\n  display: flex;\n  font-family: 'Roboto', sans-serif;\n  font-size: 24px;\n  font-weight: 700;\n  -ms-flex-pack: center;\n      justify-content: center;\n  left: 0;\n  opacity: 0;\n  outline: 2px dashed black;\n  outline-offset: -40px;\n  position: fixed;\n  right: 0;\n  top: 0;\n  visibility: hidden;\n  z-index: 2147483647; }\n  .Overlay.Active {\n    opacity: 1;\n    visibility: visible; }\n", ""]);

	// exports


/***/ }),
/* 101 */
/***/ (function(module, exports, __webpack_require__) {

	!function(t,e){ true?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.MidiConvert=e():t.MidiConvert=e()}(this,function(){return function(t){function e(r){if(n[r])return n[r].exports;var i=n[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}var n={};return e.m=t,e.c=n,e.i=function(t){return t},e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:r})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=7)}([function(t,e,n){"use strict";n.d(e,"a",function(){return r}),n.d(e,"b",function(){return i}),n.d(e,"c",function(){return a});var r=["acoustic grand piano","bright acoustic piano","electric grand piano","honky-tonk piano","electric piano 1","electric piano 2","harpsichord","clavi","celesta","glockenspiel","music box","vibraphone","marimba","xylophone","tubular bells","dulcimer","drawbar organ","percussive organ","rock organ","church organ","reed organ","accordion","harmonica","tango accordion","acoustic guitar (nylon)","acoustic guitar (steel)","electric guitar (jazz)","electric guitar (clean)","electric guitar (muted)","overdriven guitar","distortion guitar","guitar harmonics","acoustic bass","electric bass (finger)","electric bass (pick)","fretless bass","slap bass 1","slap bass 2","synth bass 1","synth bass 2","violin","viola","cello","contrabass","tremolo strings","pizzicato strings","orchestral harp","timpani","string ensemble 1","string ensemble 2","synthstrings 1","synthstrings 2","choir aahs","voice oohs","synth voice","orchestra hit","trumpet","trombone","tuba","muted trumpet","french horn","brass section","synthbrass 1","synthbrass 2","soprano sax","alto sax","tenor sax","baritone sax","oboe","english horn","bassoon","clarinet","piccolo","flute","recorder","pan flute","blown bottle","shakuhachi","whistle","ocarina","lead 1 (square)","lead 2 (sawtooth)","lead 3 (calliope)","lead 4 (chiff)","lead 5 (charang)","lead 6 (voice)","lead 7 (fifths)","lead 8 (bass + lead)","pad 1 (new age)","pad 2 (warm)","pad 3 (polysynth)","pad 4 (choir)","pad 5 (bowed)","pad 6 (metallic)","pad 7 (halo)","pad 8 (sweep)","fx 1 (rain)","fx 2 (soundtrack)","fx 3 (crystal)","fx 4 (atmosphere)","fx 5 (brightness)","fx 6 (goblins)","fx 7 (echoes)","fx 8 (sci-fi)","sitar","banjo","shamisen","koto","kalimba","bag pipe","fiddle","shanai","tinkle bell","agogo","steel drums","woodblock","taiko drum","melodic tom","synth drum","reverse cymbal","guitar fret noise","breath noise","seashore","bird tweet","telephone ring","helicopter","applause","gunshot"],i=["piano","chromatic percussion","organ","guitar","bass","strings","ensemble","brass","reed","pipe","synth lead","synth pad","synth effects","ethnic","percussive","sound effects"],a={0:"standard kit",8:"room kit",16:"power kit",24:"electronic kit",25:"tr-808 kit",32:"jazz kit",40:"brush kit",48:"orchestra kit",56:"sound fx kit"}},function(t,e,n){"use strict";function r(t){return t.replace(/\u0000/g,"")}function i(t,e){return 60/e.bpm*(t/e.PPQ)}function a(t){return"number"==typeof t}function o(t){return"string"==typeof t}function s(t){return["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"][t%12]+(Math.floor(t/12)-1)}e.b=r,e.a=i,e.c=a,n.d(e,"d",function(){return u}),e.e=s,n.d(e,"f",function(){return c});var u=function(){var t=/^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i;return function(e){return o(e)&&t.test(e)}}(),c=function(){var t=/^([a-g]{1}(?:b|#|x|bb)?)(-?[0-9]+)/i,e={cbb:-2,cb:-1,c:0,"c#":1,cx:2,dbb:0,db:1,d:2,"d#":3,dx:4,ebb:2,eb:3,e:4,"e#":5,ex:6,fbb:3,fb:4,f:5,"f#":6,fx:7,gbb:5,gb:6,g:7,"g#":8,gx:9,abb:7,ab:8,a:9,"a#":10,ax:11,bbb:9,bb:10,b:11,"b#":12,bx:13};return function(n){var r=t.exec(n),i=r[1],a=r[2];return e[i.toLowerCase()]+12*(parseInt(a)+1)}}()},function(t,e,n){"use strict";function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}n.d(e,"a",function(){return h});var i=n(11),a=(n.n(i),n(10)),o=(n.n(a),n(1)),s=n(9),u=n(5),c=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),h=function(){function t(){r(this,t),this.header={bpm:120,timeSignature:[4,4],PPQ:480},this.tracks=[]}return c(t,null,[{key:"fromJSON",value:function(e){var n=new t;return n.header=e.header,e.tracks.forEach(function(t){var e=s.a.fromJSON(t);n.tracks.push(e)}),n}}]),c(t,[{key:"load",value:function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"GET";return new Promise(function(i,a){var o=new XMLHttpRequest;o.open(r,t),o.responseType="arraybuffer",o.addEventListener("load",function(){4===o.readyState&&200===o.status?i(e.decode(o.response)):a(o.status)}),o.addEventListener("error",a),o.send(n)}).catch(function(t){console.log(t)})}},{key:"decode",value:function(t){var e=this;if(t instanceof ArrayBuffer){var r=new Uint8Array(t);t=String.fromCharCode.apply(null,r)}var a=i(t);return this.header=n.i(u.a)(a),this.tracks=[],a.tracks.forEach(function(t,n){var r=new s.a;r.id=n,e.tracks.push(r);var i=0;t.forEach(function(t){i+=o.a(t.deltaTime,e.header),"meta"===t.type&&"trackName"===t.subtype?r.name=o.b(t.text):"noteOn"===t.subtype?(r.noteOn(t.noteNumber,i,t.velocity/127),-1===r.channelNumber&&(r.channelNumber=t.channel)):"noteOff"===t.subtype?r.noteOff(t.noteNumber,i):"controller"===t.subtype&&t.controllerType?r.cc(t.controllerType,i,t.value/127):"meta"===t.type&&"instrumentName"===t.subtype?r.instrument=t.text:"channel"===t.type&&"programChange"===t.subtype&&(r.patch(t.programNumber),r.channelNumber=t.channel)}),e.header.name||r.length||!r.name||(e.header.name=r.name)}),this}},{key:"encode",value:function(){var t=this,e=new a.File({ticks:this.header.PPQ}),n=this.tracks.filter(function(t){return!t.length})[0];if(this.header.name&&(!n||n.name!==this.header.name)){e.addTrack().addEvent(new a.MetaEvent({time:0,type:a.MetaEvent.TRACK_NAME,data:this.header.name}))}return this.tracks.forEach(function(n){var r=e.addTrack();r.setTempo(t.bpm),n.name&&r.addEvent(new a.MetaEvent({time:0,type:a.MetaEvent.TRACK_NAME,data:n.name})),n.encode(r,t.header)}),e.toBytes()}},{key:"toArray",value:function(){for(var t=this.encode(),e=new Array(t.length),n=0;n<t.length;n++)e[n]=t.charCodeAt(n);return e}},{key:"toJSON",value:function(){var t={header:this.header,startTime:this.startTime,duration:this.duration,tracks:(this.tracks||[]).map(function(t){return t.toJSON()})};return t.header.name||(t.header.name=""),t}},{key:"track",value:function(t){var e=new s.a(t);return this.tracks.push(e),e}},{key:"get",value:function(t){return o.c(t)?this.tracks[t]:this.tracks.find(function(e){return e.name===t})}},{key:"slice",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:this.duration,r=new t;return r.header=this.header,r.tracks=this.tracks.map(function(t){return t.slice(e,n)}),r}},{key:"startTime",get:function(){var t=this.tracks.map(function(t){return t.startTime});return t.length?Math.min.apply(Math,t)||0:0}},{key:"bpm",get:function(){return this.header.bpm},set:function(t){var e=this.header.bpm;this.header.bpm=t;var n=e/t;this.tracks.forEach(function(t){return t.scale(n)})}},{key:"timeSignature",get:function(){return this.header.timeSignature},set:function(t){this.header.timeSignature=t}},{key:"duration",get:function(){var t=this.tracks.map(function(t){return t.duration});return t.length?Math.max.apply(Math,t)||0:0}}]),t}()},function(t,e,n){"use strict";function r(t,e){var n=0,r=t.length,i=r;if(r>0&&t[r-1].time<=e)return r-1;for(;n<i;){var a=Math.floor(n+(i-n)/2),o=t[a],s=t[a+1];if(o.time===e){for(var u=a;u<t.length;u++){t[u].time===e&&(a=u)}return a}if(o.time<e&&s.time>e)return a;o.time>e?i=a:o.time<e&&(n=a+1)}return-1}function i(t,e){if(t.length){var n=r(t,e.time);t.splice(n+1,0,e)}else t.push(e)}n.d(e,"a",function(){return i})},function(t,e,n){"use strict";function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}n.d(e,"a",function(){return o});var i=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),a={1:"modulationWheel",2:"breath",4:"footController",5:"portamentoTime",7:"volume",8:"balance",10:"pan",64:"sustain",65:"portamentoTime",66:"sostenuto",67:"softPedal",68:"legatoFootswitch",84:"portamentoContro"},o=function(){function t(e,n,i){r(this,t),this.number=e,this.time=n,this.value=i}return i(t,[{key:"name",get:function(){if(a.hasOwnProperty(this.number))return a[this.number]}}]),t}()},function(t,e,n){"use strict";function r(t){for(var e={PPQ:t.header.ticksPerBeat},n=0;n<t.tracks.length;n++)for(var r=t.tracks[n],i=0;i<r.length;i++){var a=r[i];"meta"===a.type&&("timeSignature"===a.subtype?e.timeSignature=[a.numerator,a.denominator]:"setTempo"===a.subtype&&(e.bpm||(e.bpm=6e7/a.microsecondsPerBeat)))}return e.bpm=e.bpm||120,e}n.d(e,"a",function(){return r})},function(t,e,n){"use strict";function r(t,e){for(var n=0;n<t.length;n++){var r=t[n],i=e[n];if(r.length>i)return!0}return!1}function i(t,e,n){for(var r=0,i=1/0,a=0;a<t.length;a++){var o=t[a],s=e[a];o[s]&&o[s].time<i&&(r=a,i=o[s].time)}n[r](t[r][e[r]]),e[r]+=1}function a(){for(var t=arguments.length,e=Array(t),n=0;n<t;n++)e[n]=arguments[n];for(var a=e.filter(function(t,e){return e%2==0}),o=new Uint32Array(a.length),s=e.filter(function(t,e){return e%2==1});r(a,o);)i(a,o,s)}n.d(e,"a",function(){return a})},function(t,e,n){"use strict";function r(t){return(new s.a).decode(t)}function i(t,e){var n=(new s.a).load(t);return e&&n.then(e),n}function a(){return new s.a}function o(t){return s.a.fromJSON(t)}Object.defineProperty(e,"__esModule",{value:!0}),e.parse=r,e.load=i,e.create=a,e.fromJSON=o;var s=n(2),u=n(0);n.d(e,"instrumentByPatchID",function(){return u.a}),n.d(e,"instrumentFamilyByID",function(){return u.b}),n.d(e,"drumKitByPatchID",function(){return u.c})},function(t,e,n){"use strict";function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}n.d(e,"a",function(){return o});var i=n(1),a=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),o=function(){function t(e,n){var a=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,o=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1;if(r(this,t),i.c(e))this.midi=e;else{if(!i.d(e))throw new Error("the midi value must either be in Pitch Notation (e.g. C#4) or a midi value");this.name=e}this.time=n,this.duration=a,this.velocity=o}return a(t,null,[{key:"fromJSON",value:function(e){return new t(e.midi,e.time,e.duration,e.velocity)}}]),a(t,[{key:"match",value:function(t){return i.c(t)?this.midi===t:i.d(t)?this.name.toLowerCase()===t.toLowerCase():void 0}},{key:"toJSON",value:function(){return{name:this.name,midi:this.midi,time:this.time,velocity:this.velocity,duration:this.duration}}},{key:"name",get:function(){return i.e(this.midi)},set:function(t){this.midi=i.f(t)}},{key:"noteOn",get:function(){return this.time},set:function(t){this.time=t}},{key:"noteOff",get:function(){return this.time+this.duration},set:function(t){this.duration=t-this.time}}]),t}()},function(t,e,n){"use strict";function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}n.d(e,"a",function(){return h});var i=n(3),a=n(4),o=n(6),s=n(8),u=n(0),c=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),h=function(){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:-1,i=arguments.length>2&&void 0!==arguments[2]?arguments[2]:-1;r(this,t),this.name=e,this.channelNumber=i,this.notes=[],this.controlChanges={},this.instrumentNumber=n}return c(t,null,[{key:"fromJSON",value:function(e){var n=new t(e.name,e.instrumentNumber,e.channelNumber);return n.id=e.id,e.notes&&e.notes.forEach(function(t){var e=s.a.fromJSON(t);n.notes.push(e)}),e.controlChanges&&(n.controlChanges=e.controlChanges),n}}]),c(t,[{key:"note",value:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:0,a=arguments.length>3&&void 0!==arguments[3]?arguments[3]:1,o=new s.a(t,e,r,a);return n.i(i.a)(this.notes,o),this}},{key:"noteOn",value:function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:1,a=new s.a(t,e,0,r);return n.i(i.a)(this.notes,a),this}},{key:"noteOff",value:function(t,e){for(var n=0;n<this.notes.length;n++){var r=this.notes[n];if(r.match(t)&&0===r.duration){r.noteOff=e;break}}return this}},{key:"cc",value:function(t,e,r){this.controlChanges.hasOwnProperty(t)||(this.controlChanges[t]=[]);var o=new a.a(t,e,r);return n.i(i.a)(this.controlChanges[t],o),this}},{key:"patch",value:function(t){return this.instrumentNumber=t,this}},{key:"channel",value:function(t){return this.channelNumber=t,this}},{key:"scale",value:function(t){return this.notes.forEach(function(e){e.time*=t,e.duration*=t}),this}},{key:"slice",value:function(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:0,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:this.duration,r=Math.max(this.notes.findIndex(function(t){return t.time>=e}),0),i=this.notes.findIndex(function(t){return t.noteOff>=n})+1,a=new t(this.name);return a.notes=this.notes.slice(r,i),a.notes.forEach(function(t){return t.time=t.time-e}),a}},{key:"encode",value:function(t,e){function r(t){var e=Math.floor(i*t),n=Math.max(e-a,0);return a=e,n}var i=e.PPQ/(60/e.bpm),a=0,s=Math.max(0,this.channelNumber);-1!==this.instrumentNumber&&t.instrument(s,this.instrumentNumber),n.i(o.a)(this.noteOns.sort(function(t,e){return t.time-e.time}),function(e){t.addNoteOn(s,e.name,r(e.time),Math.floor(127*e.velocity))},this.noteOffs.sort(function(t,e){return t.time-e.time}),function(e){t.addNoteOff(s,e.name,r(e.time))})}},{key:"toJSON",value:function(){var t={startTime:this.startTime,duration:this.duration,length:this.length,notes:[],controlChanges:{}};return void 0!==this.id&&(t.id=this.id),t.name=this.name,-1!==this.instrumentNumber&&(t.instrumentNumber=this.instrumentNumber,t.instrument=this.instrument,t.instrumentFamily=this.instrumentFamily),-1!==this.channelNumber&&(t.channelNumber=this.channelNumber,t.isPercussion=this.isPercussion),this.notes.length&&(t.notes=this.notes.map(function(t){return t.toJSON()})),Object.keys(this.controlChanges).length&&(t.controlChanges=this.controlChanges),t}},{key:"noteOns",get:function(){var t=[];return this.notes.forEach(function(e){t.push({time:e.noteOn,midi:e.midi,name:e.name,velocity:e.velocity})}),t}},{key:"noteOffs",get:function(){var t=[];return this.notes.forEach(function(e){t.push({time:e.noteOff,midi:e.midi,name:e.name})}),t}},{key:"length",get:function(){return this.notes.length}},{key:"startTime",get:function(){if(this.notes.length){return this.notes[0].noteOn}return 0}},{key:"duration",get:function(){if(this.notes.length){return this.notes[this.notes.length-1].noteOff}return 0}},{key:"instrument",get:function(){return this.isPercussion?u.c[this.instrumentNumber]:u.a[this.instrumentNumber]},set:function(t){var e=u.a.indexOf(t);-1!==e&&(this.instrumentNumber=e)}},{key:"isPercussion",get:function(){return[9,10].includes(this.channelNumber)}},{key:"instrumentFamily",get:function(){return this.isPercussion?"drums":u.b[Math.floor(this.instrumentNumber/8)]}}]),t}()},function(t,e,n){(function(t){var n={};!function(t){var e=t.DEFAULT_VOLUME=90,n=(t.DEFAULT_DURATION=128,t.DEFAULT_CHANNEL=0,{midi_letter_pitches:{a:21,b:23,c:12,d:14,e:16,f:17,g:19},midiPitchFromNote:function(t){var e=/([a-g])(#+|b+)?([0-9]+)$/i.exec(t),r=e[1].toLowerCase(),i=e[2]||"";return 12*parseInt(e[3],10)+n.midi_letter_pitches[r]+("#"==i.substr(0,1)?1:-1)*i.length},ensureMidiPitch:function(t){return"number"!=typeof t&&/[^0-9]/.test(t)?n.midiPitchFromNote(t):parseInt(t,10)},midi_pitches_letter:{12:"c",13:"c#",14:"d",15:"d#",16:"e",17:"f",18:"f#",19:"g",20:"g#",21:"a",22:"a#",23:"b"},midi_flattened_notes:{"a#":"bb","c#":"db","d#":"eb","f#":"gb","g#":"ab"},noteFromMidiPitch:function(t,e){var r,i=0,a=t,e=e||!1;return t>23&&(i=Math.floor(t/12)-1,a=t-12*i),r=n.midi_pitches_letter[a],e&&r.indexOf("#")>0&&(r=n.midi_flattened_notes[r]),r+i},mpqnFromBpm:function(t){var e=Math.floor(6e7/t),n=[];do{n.unshift(255&e),e>>=8}while(e);for(;n.length<3;)n.push(0);return n},bpmFromMpqn:function(t){var e=t;if(void 0!==t[0]){e=0;for(var n=0,r=t.length-1;r>=0;++n,--r)e|=t[n]<<r}return Math.floor(6e7/t)},codes2Str:function(t){return String.fromCharCode.apply(null,t)},str2Bytes:function(t,e){if(e)for(;t.length/2<e;)t="0"+t;for(var n=[],r=t.length-1;r>=0;r-=2){var i=0===r?t[r]:t[r-1]+t[r];n.unshift(parseInt(i,16))}return n},translateTickTime:function(t){for(var e=127&t;t>>=7;)e<<=8,e|=127&t|128;for(var n=[];;){if(n.push(255&e),!(128&e))break;e>>=8}return n}}),r=function(t){if(!this)return new r(t);!t||null===t.type&&void 0===t.type||null===t.channel&&void 0===t.channel||null===t.param1&&void 0===t.param1||(this.setTime(t.time),this.setType(t.type),this.setChannel(t.channel),this.setParam1(t.param1),this.setParam2(t.param2))};r.NOTE_OFF=128,r.NOTE_ON=144,r.AFTER_TOUCH=160,r.CONTROLLER=176,r.PROGRAM_CHANGE=192,r.CHANNEL_AFTERTOUCH=208,r.PITCH_BEND=224,r.prototype.setTime=function(t){this.time=n.translateTickTime(t||0)},r.prototype.setType=function(t){if(t<r.NOTE_OFF||t>r.PITCH_BEND)throw new Error("Trying to set an unknown event: "+t);this.type=t},r.prototype.setChannel=function(t){if(t<0||t>15)throw new Error("Channel is out of bounds.");this.channel=t},r.prototype.setParam1=function(t){this.param1=t},r.prototype.setParam2=function(t){this.param2=t},r.prototype.toBytes=function(){var t=[],e=this.type|15&this.channel;return t.push.apply(t,this.time),t.push(e),t.push(this.param1),void 0!==this.param2&&null!==this.param2&&t.push(this.param2),t};var i=function(t){if(!this)return new i(t);this.setTime(t.time),this.setType(t.type),this.setData(t.data)};i.SEQUENCE=0,i.TEXT=1,i.COPYRIGHT=2,i.TRACK_NAME=3,i.INSTRUMENT=4,i.LYRIC=5,i.MARKER=6,i.CUE_POINT=7,i.CHANNEL_PREFIX=32,i.END_OF_TRACK=47,i.TEMPO=81,i.SMPTE=84,i.TIME_SIG=88,i.KEY_SIG=89,i.SEQ_EVENT=127,i.prototype.setTime=function(t){this.time=n.translateTickTime(t||0)},i.prototype.setType=function(t){this.type=t},i.prototype.setData=function(t){this.data=t},i.prototype.toBytes=function(){if(!this.type)throw new Error("Type for meta-event not specified.");var t=[];if(t.push.apply(t,this.time),t.push(255,this.type),Array.isArray(this.data))t.push(this.data.length),t.push.apply(t,this.data);else if("number"==typeof this.data)t.push(1,this.data);else if(null!==this.data&&void 0!==this.data){t.push(this.data.length);var e=this.data.split("").map(function(t){return t.charCodeAt(0)});t.push.apply(t,e)}else t.push(0);return t};var a=function(t){if(!this)return new a(t);var e=t||{};this.events=e.events||[]};a.START_BYTES=[77,84,114,107],a.END_BYTES=[0,255,47,0],a.prototype.addEvent=function(t){return this.events.push(t),this},a.prototype.addNoteOn=a.prototype.noteOn=function(t,i,a,o){return this.events.push(new r({type:r.NOTE_ON,channel:t,param1:n.ensureMidiPitch(i),param2:o||e,time:a||0})),this},a.prototype.addNoteOff=a.prototype.noteOff=function(t,i,a,o){return this.events.push(new r({type:r.NOTE_OFF,channel:t,param1:n.ensureMidiPitch(i),param2:o||e,time:a||0})),this},a.prototype.addNote=a.prototype.note=function(t,e,n,r,i){return this.noteOn(t,e,r,i),n&&this.noteOff(t,e,n,i),this},a.prototype.addChord=a.prototype.chord=function(t,e,n,r){if(!Array.isArray(e)&&!e.length)throw new Error("Chord must be an array of pitches");return e.forEach(function(e){this.noteOn(t,e,0,r)},this),e.forEach(function(e,r){0===r?this.noteOff(t,e,n):this.noteOff(t,e)},this),this},a.prototype.setInstrument=a.prototype.instrument=function(t,e,n){return this.events.push(new r({type:r.PROGRAM_CHANGE,channel:t,param1:e,time:n||0})),this},a.prototype.setTempo=a.prototype.tempo=function(t,e){return this.events.push(new i({type:i.TEMPO,data:n.mpqnFromBpm(t),time:e||0})),this},a.prototype.toBytes=function(){var t=0,e=[],r=a.START_BYTES,i=a.END_BYTES,o=function(n){var r=n.toBytes();t+=r.length,e.push.apply(e,r)};this.events.forEach(o),t+=i.length;var s=n.str2Bytes(t.toString(16),4);return r.concat(s,e,i)};var o=function(t){if(!this)return new o(t);var e=t||{};if(e.ticks){if("number"!=typeof e.ticks)throw new Error("Ticks per beat must be a number!");if(e.ticks<=0||e.ticks>=32768||e.ticks%1!=0)throw new Error("Ticks per beat must be an integer between 1 and 32767!")}this.ticks=e.ticks||128,this.tracks=e.tracks||[]};o.HDR_CHUNKID="MThd",o.HDR_CHUNK_SIZE="\0\0\0",o.HDR_TYPE0="\0\0",o.HDR_TYPE1="\0",o.prototype.addTrack=function(t){return t?(this.tracks.push(t),this):(t=new a,this.tracks.push(t),t)},o.prototype.toBytes=function(){var t=this.tracks.length.toString(16),e=o.HDR_CHUNKID+o.HDR_CHUNK_SIZE;return parseInt(t,16)>1?e+=o.HDR_TYPE1:e+=o.HDR_TYPE0,e+=n.codes2Str(n.str2Bytes(t,2)),e+=String.fromCharCode(this.ticks/256,this.ticks%256),this.tracks.forEach(function(t){e+=n.codes2Str(t.toBytes())}),e},t.Util=n,t.File=o,t.Track=a,t.Event=r,t.MetaEvent=i}(n),void 0!==t&&null!==t?t.exports=n:void 0!==e&&null!==e?e=n:this.Midi=n}).call(e,n(12)(t))},function(t,e){function n(t){function e(t){var e=t.read(4),n=t.readInt32();return{id:e,length:n,data:t.read(n)}}var n;stream=r(t);var i=e(stream);if("MThd"!=i.id||6!=i.length)throw"Bad .mid file - header not found";var a=r(i.data),o=a.readInt16(),s=a.readInt16(),u=a.readInt16();if(32768&u)throw"Expressing time division in SMTPE frames is not supported yet";ticksPerBeat=u;for(var c={formatType:o,trackCount:s,ticksPerBeat:ticksPerBeat},h=[],f=0;f<c.trackCount;f++){h[f]=[];var d=e(stream);if("MTrk"!=d.id)throw"Unexpected chunk - expected MTrk, got "+d.id;for(var l=r(d.data);!l.eof();){var p=function(t){var e={};e.deltaTime=t.readVarInt();var r=t.readInt8();if(240==(240&r)){if(255==r){e.type="meta";var i=t.readInt8(),a=t.readVarInt();switch(i){case 0:if(e.subtype="sequenceNumber",2!=a)throw"Expected length for sequenceNumber event is 2, got "+a;return e.number=t.readInt16(),e;case 1:return e.subtype="text",e.text=t.read(a),e;case 2:return e.subtype="copyrightNotice",e.text=t.read(a),e;case 3:return e.subtype="trackName",e.text=t.read(a),e;case 4:return e.subtype="instrumentName",e.text=t.read(a),e;case 5:return e.subtype="lyrics",e.text=t.read(a),e;case 6:return e.subtype="marker",e.text=t.read(a),e;case 7:return e.subtype="cuePoint",e.text=t.read(a),e;case 32:if(e.subtype="midiChannelPrefix",1!=a)throw"Expected length for midiChannelPrefix event is 1, got "+a;return e.channel=t.readInt8(),e;case 47:if(e.subtype="endOfTrack",0!=a)throw"Expected length for endOfTrack event is 0, got "+a;return e;case 81:if(e.subtype="setTempo",3!=a)throw"Expected length for setTempo event is 3, got "+a;return e.microsecondsPerBeat=(t.readInt8()<<16)+(t.readInt8()<<8)+t.readInt8(),e;case 84:if(e.subtype="smpteOffset",5!=a)throw"Expected length for smpteOffset event is 5, got "+a;var o=t.readInt8();return e.frameRate={0:24,32:25,64:29,96:30}[96&o],e.hour=31&o,e.min=t.readInt8(),e.sec=t.readInt8(),e.frame=t.readInt8(),e.subframe=t.readInt8(),e;case 88:if(e.subtype="timeSignature",4!=a)throw"Expected length for timeSignature event is 4, got "+a;return e.numerator=t.readInt8(),e.denominator=Math.pow(2,t.readInt8()),e.metronome=t.readInt8(),e.thirtyseconds=t.readInt8(),e;case 89:if(e.subtype="keySignature",2!=a)throw"Expected length for keySignature event is 2, got "+a;return e.key=t.readInt8(!0),e.scale=t.readInt8(),e;case 127:return e.subtype="sequencerSpecific",e.data=t.read(a),e;default:return e.subtype="unknown",e.data=t.read(a),e}return e.data=t.read(a),e}if(240==r){e.type="sysEx";var a=t.readVarInt();return e.data=t.read(a),e}if(247==r){e.type="dividedSysEx";var a=t.readVarInt();return e.data=t.read(a),e}throw"Unrecognised MIDI event type byte: "+r}var s;0==(128&r)?(s=r,r=n):(s=t.readInt8(),n=r);var u=r>>4;switch(e.channel=15&r,e.type="channel",u){case 8:return e.subtype="noteOff",e.noteNumber=s,e.velocity=t.readInt8(),e;case 9:return e.noteNumber=s,e.velocity=t.readInt8(),0==e.velocity?e.subtype="noteOff":e.subtype="noteOn",e;case 10:return e.subtype="noteAftertouch",e.noteNumber=s,e.amount=t.readInt8(),e;case 11:return e.subtype="controller",e.controllerType=s,e.value=t.readInt8(),e;case 12:return e.subtype="programChange",e.programNumber=s,e;case 13:return e.subtype="channelAftertouch",e.amount=s,e;case 14:return e.subtype="pitchBend",e.value=s+(t.readInt8()<<7),e;default:throw"Unrecognised MIDI event type: "+u}}(l);h[f].push(p)}}return{header:c,tracks:h}}function r(t){function e(e){var n=t.substr(s,e);return s+=e,n}function n(){var e=(t.charCodeAt(s)<<24)+(t.charCodeAt(s+1)<<16)+(t.charCodeAt(s+2)<<8)+t.charCodeAt(s+3);return s+=4,e}function r(){var e=(t.charCodeAt(s)<<8)+t.charCodeAt(s+1);return s+=2,e}function i(e){var n=t.charCodeAt(s);return e&&n>127&&(n-=256),s+=1,n}function a(){return s>=t.length}function o(){for(var t=0;;){var e=i();if(!(128&e))return t+e;t+=127&e,t<<=7}}var s=0;return{eof:a,read:e,readInt32:n,readInt16:r,readInt8:i,readVarInt:o}}t.exports=function(t){return n(t)}},function(t,e){t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children||(t.children=[]),Object.defineProperty(t,"loaded",{enumerable:!0,get:function(){return t.l}}),Object.defineProperty(t,"id",{enumerable:!0,get:function(){return t.i}}),t.webpackPolyfill=1),t}}])});
	//# sourceMappingURL=MidiConvert.js.map

/***/ })
]);