$(function() {

	//	DOM variables
	var $stillThereScreen = $('#stillThereScreen'),
			$attractScreen = $('#attractScreen'),
			$contentScreen = $('#contentScreen'),
			$menuBadges = $('#menuBadges');
			// $menuCanvas = $('#menuCanvas'),
			// menuCanvasCtx = $menuCanvas.get(0).getContext('2d');

	//	XML
	var xmlPath_Content = "xml/content.xml";
	var $xmlDoc_Content;
	var xmlPath_Attractor = "xml/attractor.xml";
	var $xmlDoc_Attractor;
	var badgeArray = [];
	var displayedBadge;
	var folderPng, folderJson;

	//	Timers & handlers
	var stillThereTimeMax, stillThereTime, inactivityTimerMax;
	var stillThereHandler, inactivityHandler;
	var focusedBadge;
	var canvasColors = [];

	//	Menu badge animation looping
	var menuBadgeAnimHandler;
	var menuBadgeAnimTimeMultiplier = 5000;
	var menuBadgeAnimTimeMin = 1000;

	//	Called on first load
	function firstLoad() {
		console.log("Loading", "The application is loading...");
		loadXml(xmlPath_Content, $xmlDoc_Content);
		loadXml(xmlPath_Attractor, $xmlDoc_Attractor);
	}


	//	XML & content loading
	//	Read xml file
	function loadXml(xmlPath, xmlDoc){
		// Load the xml file using ajax
		$.ajax({
			type: "GET",
			url: xmlPath,
			dataType: "xml",
			success: function(xml){
				console.log("XML data loaded from \"" + xmlPath + "\"");
				$xml = $(xml);
				switch($xml.find('xmlType').text()) {
					case 'Attractor': {
						processAttractorXml($xml);
						break;
					}
					case 'Content': {
						processContentXml($xml);
						break;
					}
					default: {
						break;
					}
				}
			},
			error: function(jqXHR, textStatus, errorThrown) {
				console.log(textStatus, errorThrown);
			}
		});
	}

	function processAttractorXml($xml){
		console.log("Processing Attractor screen XML...");
		$('.attractorHeadline').text($xml.find('attractorHeadline').text());
		$('.attractorBodyText').text($xml.find('attractorBodyText').text());
		$('.attractorVid source').attr('src', $xml.find('attractorVidPath').text());
		$('.attractorVid').each(function(index, attractorVid) {
			attractorVid.load();
			attractorVid.play();
		});
	}

	function processContentXml($xml){
		console.log("Processing Content XML...");

		inactivityTimerMax = parseInt($xml.find('inactivityTimerMax').text()) * 1000;
		stillThereTimeMax = parseInt($xml.find('stillThereTimeMax').text());

		folderPng = $xml.find('folderPng').text();
		folderJson = $xml.find('folderJson').text();

		//	Load XML slide data to slidesArray
		$xml.find('badge').each(function(){
			//	Build up slide variable
			var $thisBadge = $(this);
			var thisBadgeObject = {
				ref: $thisBadge.find('ref').html(),
				name: $thisBadge.find('name').html(),
				objectID: $thisBadge.find('objectID').html(),
				date: $thisBadge.find('date').html(),
				type: $thisBadge.find('type').html(),
				materials: $thisBadge.find('materials').html(),
				measurements: $thisBadge.find('measurements').text(),
				description: {
					paragraph1: $thisBadge.find('description paragraph1').html() === undefined ? undefined : $thisBadge.find('description paragraph1').html(),
					paragraph2: $thisBadge.find('description paragraph2').html() === undefined ? undefined : $thisBadge.find('description paragraph2').html(),
					paragraph3: $thisBadge.find('description paragraph3').html() === undefined ? undefined : $thisBadge.find('description paragraph3').html(),
					paragraph4: $thisBadge.find('description paragraph4').html() === undefined ? undefined : $thisBadge.find('description paragraph4').html(),
					paragraph5: $thisBadge.find('description paragraph5').html() === undefined ? undefined : $thisBadge.find('description paragraph5').html(),
				},
				json: {
					file: $thisBadge.find('json file').text(),
					type: $thisBadge.find('json type').text()
				},
				png: {
					file: $thisBadge.find('png file').text(),
				}
			}
			badgeArray.push(thisBadgeObject);
			// focusedFigurehead++;
		});
		badgeArray.sort(compare);
		console.log(badgeArray);
		addBadges();
		cycleMenuBadgeAnimations();
	}

	function compare(a, b) {
		const refA = a.ref;
		const refB = b.ref;
		let comparison = 0;
		if(refA > refB) {
			comparison = 1;
		} else if(refA < refB) {
			comparison = -1;
		}
		return comparison;
	}

	function addBadges() {
		//	Add menu SVG images
		for(var i = 0; i < badgeArray.length; i++) {
			var row = "row" + badgeArray[i].ref.substr(0,1);
			$('#' + row).append('<div data-ref="' + badgeArray[i].ref + '" class="badge ' + badgeArray[i].json.type + '">');
			badgeArray[i].anim = bodymovin.loadAnimation({
				container: document.querySelectorAll('[data-ref="' + badgeArray[i].ref + '"]')[0],
				renderer: 'svg',
				loop: false,
				autoplay: false,
				path: folderJson + '/' + badgeArray[i].json.file
			});
			$('*[data-ref="' + badgeArray[i].ref + '"]').click(function() {
				var badge = getBadge($(this).attr('data-ref'));
				console.log(badge.name);
			});
		}
	}

	function cycleMenuBadgeAnimations() {
		var time = Math.floor(Math.random() * menuBadgeAnimTimeMultiplier + menuBadgeAnimTimeMin);
		var nextBadge = badgeArray[Math.floor(Math.random() * badgeArray.length)];
		menuBadgeAnimHandler = setTimeout(function() {
			nextBadge.anim.play();
			$('*[data-ref="' + nextBadge.ref + '"]').addClass('highlight');
			nextBadge.anim.addEventListener('complete', function() {
				nextBadge.anim.stop();
				$('*[data-ref="' + nextBadge.ref + '"]').removeClass('highlight');
			});
			cycleMenuBadgeAnimations();
		}, time);
	}
	
	function stopMenuBadgeAnimations() {
		clearTimeout(menuBadgeAnimHandler);
	}

	//	Timers
	//	Inactivity timer
	function startInactivityTimer() {
		inactivityHandler = setTimeout(function() {
			showStillThereScreen();
		}, inactivityTimerMax);
	}

	function clearInactivityTimer() {
		clearTimeout(inactivityHandler);
		inactivityHandler = 0;
	}

	function restartInactivityTimer() {
		console.log("Restarting Inactivity timer...");
		// console.log(restartInactivityTimer.caller);
		clearInactivityTimer();
		startInactivityTimer();
	}


	//	Still There timer
	function startStillThereTimer() {
		stillThereHandler = setInterval(function() {
			stillThereTime--;
			console.log(stillThereTime);
			$('#stillThereSpan').text(stillThereTime);
			$('#stillThereSpanS').text('s');
			if(stillThereTime <= 0) {
				stillThereTimeout();
			} else if(stillThereTime === 1) {
				$('#stillThereSpanS').text('');
			}
		}, 1000);
	}

	function clearStillThereTimer() {
		clearInterval(stillThereHandler);
		stillThereHandler = 0;
	}

	function stillThereTimeout() {
		clearStillThereTimer();
		showAttractScreen(hideStillThereScreen);
	}

	function showAttractScreen(callback) {
		console.log("Showing Attract screen");
		clearInactivityTimer();
		$attractScreen.fadeIn('slow', function() {
			showMenuScreen();
			if(callback && typeof(callback) === 'function') {
				callback();
			}
		});
	}

	function showStillThereScreen() {
		console.log("Showing Still There screen");
		stillThereTime = stillThereTimeMax;
		$('#stillThereSpan').text(stillThereTime);
		$stillThereScreen.fadeIn('fast', function() {
			startStillThereTimer();
		});
	}

	function hideStillThereScreen() {
		$stillThereScreen.fadeOut('fast');
	}




	//	Focus content
	function getBadge(ref) {
		var badge;
		for(var i = 0; i < badgeArray.length; i++) {
			if(badgeArray[i].ref === ref) {
				badge = badgeArray[i];
				break;
			}
		}
		return badge;
	}

	function showMenuScreen() {

	}

	function zoomBadge(ref) {

	}


	function flushCss(element) {
		element.offsetWidth;
	}




	//	Event handlers
	$attractScreen.click(function() {
		$attractScreen.fadeOut('slow', function() {
			restartInactivityTimer();
		});
	});

	$stillThereScreen.click(function() {
		hideStillThereScreen();
		clearStillThereTimer();
		restartInactivityTimer();
	});
	$stillThereScreen.on('touchstart', function() {
		console.log("touch!");
		hideStillThereScreen();
		clearStillThereTimer();
		restartInactivityTimer();
	});

	$contentScreen.click(function() {
		restartInactivityTimer();
	});
	$contentScreen.on('touchstart', function() {
		console.log("touch!");
		restartInactivityTimer();
	});

	$('.backToMenuBtn').click(function() {
		showMenuScreen();
	});



	firstLoad();

});