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
	var selectedBadge;
	var folderPng, folderJson;

	//	Timers & handlers
	var stillThereTimeMax, stillThereTime, inactivityTimerMax;
	var stillThereHandler, inactivityHandler;
	var selectedBadge;
	var canvasColors = [];

	//	Menu badge animation looping
	var menuBadgeAnimHandler;
	var menuBadgeAnimTimeMultiplier = 5000;
	var menuBadgeAnimTimeMin = 3000;
	var badgeAnimating;

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
		folderOutlines = $xml.find('folderOutlines').text();

		//	Load XML slide data to slidesArray
		$xml.find('badge').each(function(){
			//	Build up slide variable
			var $thisBadge = $(this);
			console.log($thisBadge.attr('ref'));
			var thisBadgeObject = {
				ref: $thisBadge.attr('ref'),
				name: $thisBadge.find('name').html(),
				objectID: $thisBadge.find('objectID').html(),
				description: $thisBadge.find('description').html(),
				type: $thisBadge.find('type').html(),
				launched: $thisBadge.find('launched').html(),
				builder: $thisBadge.find('builder').html(),
				length: $thisBadge.find('length').html(),
				speed: $thisBadge.find('speed').html(),
				crew: $thisBadge.find('crew').html(),
				career: $thisBadge.find('career').html(),
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
		// cycleMenuBadgeAnimations();
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
		badgeArray.forEach(function(badge) {
			//	Add badge to correct row in div per first character of badge ref
			var row = "row" + badge.ref.substr(0,1);
			$('#' + row).append('<div data-ref="' + badge.ref + '" class="badge ' + badge.json.type + '">');
			badge.anim = bodymovin.loadAnimation({
				container: document.querySelectorAll('[data-ref="' + badge.ref + '"]')[0],
				renderer: 'svg',
				loop: true,
				autoplay: false,
				path: folderJson + '/' + badge.json.file
			});
		});
		$('.badge').click(function() {
			console.log("Selecting badge");
			console.log(selectedBadge);
			selectBadge(getBadge($(this).attr('data-ref')));
		});
	}

	function selectBadge(badge) {
		selectedBadge = badge;
		populatePopupText(badge);
		startAnim(badge, function() {
			focusBadge(badge);
		});
	}

	function startAnim(badge, callback) {
		badgeAnimating = true;
		$badge = $('*[data-ref="' + badge.ref + '"]');
		$badge.addClass('highlight zoomed onTop');
		$badge.one('transitionend', function() {
			badge.anim.play();
			console.log("Animating " + badge.name);
			badge.anim.addEventListener('loopComplete', function() {
				badge.anim.removeEventListener('loopComplete');
				badge.anim.stop();
				console.log("Animation complete");
				if(callback) {
					callback();
				}
			});
		});
	}

	function focusBadge(badge) {
		//	Append the colour and outline png representation of the selected badge to the overlay container and position
		createZoomImgs(badge);
		revertJson(false, badge, function() {
			$('.pngImg').addClass('focused');
			var styles = {
				'left': '150px',
				'top': '180px',
				'width': '720px',
				'height': '720px'
			}
			$('.pngImg').css(styles);
			$('#colorImg').one('transitionend', function() {
				$('#colorImg').detach().appendTo('#popupDiv');
				$('#outlineImg').remove();
			});
			$('#popupDiv').addClass('displayed');
			hideMenuScreen();
		});
	}

	function revertJson(instant, badge, callback) {
		$badge = $('*[data-ref="' + badge.ref + '"]');
		if(instant) {
			$badge.addClass('noTransition');
			$badge.removeClass('highlight zoomed onTop');
			flushCss($badge.get(0));
			$badge.removeClass('noTransition');
		} else {
			$badge.removeClass('highlight zoomed onTop');
		}
		$badge.one('transitionend', function() {
			if(callback) {
				callback();
			}
		});
	}

	function createZoomImgs(badge) {
		var $originalJsonImg = $('*[data-ref="' + badge.ref + '"]');
		var marginLeft = parseInt($originalJsonImg.css('marginLeft'));
		var marginTop = parseInt($originalJsonImg.css('marginTop'));
		var styles = {
			'left': $originalJsonImg.position().left + marginLeft, 
			'top': $originalJsonImg.position().top + marginTop,
			'height': $originalJsonImg.height(),
			'width': $originalJsonImg.width()
		}
		var colorImg = '<div id="colorImg" class="pngImg zoomed onTop" style="background-image: url(' + "'" + folderPng + '/' + badge.png.file + "'" + '"></img>'
		var outlineImg = '<div id="outlineImg" class="pngImg zoomed onTop" style="background-image: url(' + "'" + folderOutlines + '/' + badge.png.file + "'" + '"></img>'
		// $('#popupImageDiv').append(colorImg);
		$('#popupImageDiv').append(outlineImg);
		$('#popupImageDiv').append(colorImg);
		$('.pngImg').css(styles);
		if($originalJsonImg.hasClass('circleBig')) {
			$('.pngImg').addClass('big');
		} else if($originalJsonImg.hasClass('circleMedium') || $originalJsonImg.hasClass('diamondMedium') || $originalJsonImg.hasClass('shieldMedium')) {
			$('.pngImg').addClass('medium');
		} else {
			$('.pngImg').addClass('small');
		}
		// flushCss($('.pngImg').get(0));
	}

	function hideFocusBtns() {
	}

	function hideMenuScreen() {
		$('#sidebarContent').fadeOut('slow');
		$('#menuBadges').fadeOut('slow');
		$('#infoPane').fadeOut('slow');
		$('.arrowBtn').addClass('shown');
		$('.arrowBtn').removeClass('hidden');
		$('.arrowBtn').one('transitionend', function() {
			$('.arrowBtn').removeClass('shown');
		});
	}

	function backToMenu() {
		selectedBadge = undefined;
		$('#sidebarContent').fadeIn('slow');
		$('#menuBadges').fadeIn('slow');
		$('#infoPane').fadeIn('slow');
		$('.arrowBtn').addClass('hidden');
		$('.arrowBtn').one('transitionend', function() {
			$('.arrowBtn').removeClass('shown');
		});
		$('#popupDiv').removeClass('displayed');
		$('#popupDiv').one('transitionend', function() {
			console.log("Removing PNG images");
			$('.pngImg').remove();
		})
	}

	function populatePopupText(badge) {
		console.log("Populating text...");
		$('#textName').html(badge.name);
		$('#textDescription').html(badge.description);
		if(badge.type === 'shore station') {
			//	Handle shore stations
		} else {
			$('#textType').html(badge.type);
			$('#textLength').html(badge.length);
			$('#textBuilder').html(badge.builder);
			$('#textLaunched').html(badge.launched);
			$('#textSpeed').html(badge.speed);
			$('#textCrew').html(badge.crew);
			$('#textCareer').html(badge.career);
		}
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
		stopMenuBadgeAnimations();
		$attractScreen.fadeIn('slow', function() {
			backToMenu();
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



	function zoomBadge(ref) {

	}


	function flushCss(element) {
		element.offsetWidth;
	}




	//	Event handlers
	$attractScreen.click(function() {
		$attractScreen.fadeOut('slow', function() {
			// cycleMenuBadgeAnimations();
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
		backToMenu();
	});


	// function cycleMenuBadgeAnimations() {
	// 	var time = Math.floor(Math.random() * menuBadgeAnimTimeMultiplier + menuBadgeAnimTimeMin);
	// 	var badge = badgeArray[Math.floor(Math.random() * badgeArray.length)];
	// 	menuBadgeAnimHandler = setTimeout(function() {
	// 		if(!badgeAnimating) {
	// 			startAnim(badge);
	// 		}
	// 		cycleMenuBadgeAnimations();
	// 	}, time);
	// }

	firstLoad();

});