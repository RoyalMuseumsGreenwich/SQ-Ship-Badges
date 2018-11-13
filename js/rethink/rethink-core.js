var rethink = {

	sessionID: undefined,											//	Set by calling rethink.setNewSessionID();

	//	Send event to re:think server
	submit(eventClass, message) {
		if(this.ENABLED) {
			let request = this.createRequest(eventClass, message);
			this.sendToServer(request, (response) => {
				// Callback if required
			});
		}
	},

	createRequest(eventClass, message) {
		var event = {};
		event.class = eventClass;
		event.message = message;
		message = this.validateEvent(event);
		let request = {
			'dry': this.DRY,													//	Indicates 'dry run' test submission
			'exhibit': this.SITECODE + '-' + this.GALLERYCODE + '-' + this.EXHIBITNAME,
			'uuid': uuidv1({'node': this.MACADDRESS}),
			'session': this.sessionID,
			'class': event.class,
			'message': event.message,
			'timestamp': new Date().toISOString()
		}
		console.log(request);
		request = this.jwtEncode(request, this.ENCODING);
		return request;
	},

	validateEvent(event) {
		if(this.events.hasOwnProperty(event.class)) {
			if(event.class === 'SessionStart') {
				this.startNewSession();
			}
			if(Array.isArray(this.events[event.class])) {
				this.events[event.class].forEach((required_property) => {
					if(!event.message.hasOwnProperty(required_property)) {
						console.log("Event message lacks required property: " + required_property);
					} else {
						console.log("Event message includes required property: " + required_property);
					}
				});
			} else {
				if(this.events[event.class] === 'sessionID') {
					event.message = this.sessionID;
				} else if(typeof event.message !== this.events[event.class]) {
					console.log("Invalid message type!");
				} else {
					console.log(`Valid message type: ${this.events[event.class]}`);
				}
			}
		} else {
			console.log("Invalid event class!");
		}
		return event;
	},

	sendToServer(data, callback) {
		console.log(data);
		$.ajax({
			data: data,
			url: this.ENDPOINT,
			type: 'POST',
			contentType: 'application/json; charset=UTF-8',
			success: function(res) {
				console.log(res);
				if(res.note.message) {
					//	Fix any Ruby JSON syntax
					res.note.message = res.note.message.split('=>').join(':');
					//	If message can be parsed as JSON without errors, parse it
					try {
						res.note.message = JSON.parse(res.note.message);
					} catch(e) {
						//	If parse errors occur, simply leave message as original string
					}
				} else if(res.note.processed_events && Array.isArray(res.note.processed_events)) {
					res.note.processed_events.forEach(processed_event => {
						console.log(processed_event);
					});
				}
				if(callback && typeof callback === 'function') callback(res);
			},
			error: function(err) {
				console.log("Error!");
				console.log(err);
				if(callback && typeof callback === 'function') callback(err);
			}
		});
	},

	jwtEncode(data, encoding) {
		if(encoding === 'JSON') {
			return JSON.stringify({'events': [data]});
		} else if(encoding === 'HS256') {
			let header = {alg: 'HS256', typ: 'JWT'};
			let payload = {};
			payload.jti = data.uuid;
			payload.iss = data.exhibit;
			payload.event = data;
			let sJWT = KJUR.jws.JWS.sign("HS256", header, payload, this.HS256SECRET);
			console.log(sJWT);
			console.log(typeof sJWT);
			return JSON.stringify({'events': [sJWT]});
		} else if(encoding === 'RS256') {
			//	Handle RS256 encoding here...
			// var sJWT = KJUR.jws.JWS.sign("HS256", sHeader, sPayload, this.sharedKey);
		} else {
			throw "Error - request encoding must be specified as 'JSON', 'HS256' or 'RS256'";
		}
	},

	//	Generate a new Session ID (to be called when attract screen is touched to start new session)
	startNewSession() {
		this.sessionID = this.SITECODE + '-' + this.GALLERYCODE + '-' + this.EXHIBITNAME + '-' + this.getDate() + this.getTime();
		// console.log(this.sessionID);
	},

	//	Utility functions
	getISO8601Date() {
		let today = new Date();
	  let year = today.getFullYear();
	  let month = ("0" + (today.getMonth()+1)).slice(-2);
	  let day = ("0" + today.getDate()).slice(-2);
	  let hours = ("0" + today.getHours()).slice(-2);
	  let mins = ("0" + today.getMinutes()).slice(-2);
	  let secs = ("0" + today.getSeconds()).slice(-2);
	  let date = year + '-' + month + '-' + day + ' ' + hours + ':' + mins + ':' + secs;
	  return date;
	},
	getDate() {
	  let today = new Date();
	  let year = today.getFullYear();
	  let month = ("0" + (today.getMonth()+1)).slice(-2);
	  let day = ("0" + today.getDate()).slice(-2);
	  let date = year + month + day;
	  return date;
	},
	getTime() {
	  let today = new Date();
	  let hours = ("0" + today.getHours()).slice(-2);
	  let mins = ("0" + today.getMinutes()).slice(-2);
	  let secs = ("0" + today.getSeconds()).slice(-2);
	  let time = hours + mins + secs;
	  return time;
	},
	stripHtmlTags(string) {
		let div = document.createElement('div');
		div.innerHTML = string;
		return div.textContent || div.innerText || "";
	}
}
