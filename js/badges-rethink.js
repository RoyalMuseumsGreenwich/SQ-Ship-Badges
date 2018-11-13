$(function() {

	//	DOM variables
	var $stillThereScreen = $('#stillThereScreen'),
			$attractScreen = $('#attractScreen'),
			$contentScreen = $('#contentScreen'),
			$menuBadges = $('#menuBadges');

	//	XML
	var xmlPath_Content = "xml/content.xml";
	var $xmlDoc_Content;
	var xmlPath_Attractor = "xml/attractor.xml";
	var $xmlDoc_Attractor;
	var badgeArray = [];
	var selectedBadge;
	var folderColour, folderJson, folderOutlines;

	//	Timers & handlers
	var stillThereTimeMax, stillThereTime, inactivityTimerMax;
	var stillThereHandler, inactivityHandler;

	//	Menu badge animation looping
	var menuBadgeAnimHandler;
	var menuBadgeAnimTimeMultiplier = 5000;
	// var menuBadgeAnimTimeMultiplier = 0;
	var menuBadgeAnimTimeMin = 3000;
	// var menuBadgeAnimTimeMin = 1000;
	var animatingMenuBadges = false;
	var badgePlaying = undefined;
	var lastPlayedBadge = undefined;

	var lockedControls = false;

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

		folderOutlines = $xml.find('folderOutlines').text();
		folderColour = $xml.find('folderColour').text();
		folderJson = $xml.find('folderJson').text();
		folderSvg = $xml.find('folderSvg').text();

		//	Load XML slide data to slidesArray
		$xml.find('badge').each(function(){
			//	Build up slide variable
			var $thisBadge = $(this);
			var thisBadgeObject = {
				ref: $thisBadge.attr('ref'),
				name: $thisBadge.find('name').html(),
				objectID: $thisBadge.find('objectID').html(),
				description: $thisBadge.find('description').html(),
				type: $thisBadge.find('type').html().charAt(0).toUpperCase() + $thisBadge.find('type').html().substr(1),
				career: $thisBadge.find('career').html(),
				shape: $thisBadge.find('shape').text(),
				filename: $thisBadge.find('json').text(),
				fileref: $thisBadge.find('png ref').text()
			}
			if(thisBadgeObject.type.toLowerCase() !== 'shore station') {
				thisBadgeObject.launched = $thisBadge.find('launched').html();
				thisBadgeObject.builder = $thisBadge.find('builder').html();
				thisBadgeObject.length = $thisBadge.find('length').html();
				thisBadgeObject.speed = $thisBadge.find('speed').html();
				thisBadgeObject.crew = $thisBadge.find('crew').html();
			}
			badgeArray.push(thisBadgeObject);
		});
		badgeArray.sort(compare);
		console.log(badgeArray);
		addBadges();
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
			//	Add badge container to correct row in div per first character of badge ref
			let row = "row" + badge.ref.substr(0,1);
			$('#' + row).append('<div data-ref="' + badge.ref + '" class="badge">');
			addBadgeImgs(badge, false, $('[data-ref="' + badge.ref + '"]'));
		});
		$('.badge').on('touchend', function() {
			if(!lockedControls && !selectedBadge) {
				lockAllControls();
				selectBadge(getBadge($(this).attr('data-ref')), $(this).find('.svgHolder'));
			}
		});
	}

	function addBadgeImgs(badge, popup, $container) {
		$container.empty();
		$container.removeClass('circleBig circleMedium shieldMedium diamondMedium shieldSmall diamondSmall pentagonSmall');
		$container.addClass(badge.shape);
		//	Add 'outline' div to badge container
		let outlineImg = '<div class="outlineImg"></div>';
		let outlineImgPath = 'url("' + folderSvg + '/' + badge.filename + '.svg")'
		// let outlineImgPath = 'url("' + folderOutlines + '/' + badge.filename + '.png")'
		$container.append(outlineImg);
		$container.find('.outlineImg').css({"background-image": outlineImgPath});
		//	Add 'outline' div to badge container
		let colourImg = '<div class="colourImg"></div>';
		let colourImgPath = 'url("' + folderColour + '/' + badge.fileref.toUpperCase() + '.png")';
		$container.append(colourImg);
		$container.find('.colourImg').css({"background-image": colourImgPath});
		//	Add 'svgHolder' div to badge container
		let svgHolder = popup ? '<div class="svgHolder hidden popup"></div>' : '<div class="svgHolder"></div>';
		$container.append(svgHolder);
	}

	function selectBadge(badge, $container) {
		selectedBadge = badge;
		rethink.submit('ContentItemSelectInformed', getRethinkBadgeString(badge));
		stopMenuBadgeAnimations();
		if(badgePlaying) {
			console.log(badgePlaying.ref);
		}
		if(badgePlaying === badge) {
			//	...else if badge selected is already animating, pop it up on animation complete...
			console.log("Animating badge clicked!");
			$('[data-ref="' + badge.ref + '"]').addClass('highlight');
			badge.anim.removeEventListener('complete');
			badge.anim.addEventListener('complete', function() {
				console.log("Animation complete");
				badge.anim.removeEventListener('complete');
				$container.children('svg').remove();
				popupBadge(badge);
			});
		} else {
			//	If no menu animation is playing, select & pop up badge normally...
			loadAnim(badge, $container, () => {
				$('[data-ref="' + badge.ref + '"]').addClass('highlight onTop zoomed');
				playAnim(badge, $('[data-ref="' + badge.ref + '"] .svgHolder'), false, () => {
					$('[data-ref="' + badge.ref + '"] .svgHolder').empty();
					popupBadge(badge);
				});
			});
		}
	}


	//	Load bodymovin animation into container
	function loadAnim(badge, $container, callback) {
		badge.anim = bodymovin.loadAnimation({
			container: $container.get(0),
			renderer: 'svg',
			loop: false,
			autoplay: false,
			path: folderJson + '/' + badge.fileref + '.json'
		});
		badge.anim.addEventListener('DOMLoaded', () => {
			badge.anim.removeEventListener('DOMLoaded');
			callback();
		});
	}


	function playAnim(badge, $container, popupAnim, callback) {
		//	Add animation to .svgHolder within $container
		console.log("Adding animation...");
		if(popupAnim) {
			$('.colourImg').addClass('hidden');
			$container.removeClass('hidden');
			$container.one('transitionend', () => {
				badge.anim.play();
			});
		} else {
			badge.anim.play();
		}
		//	Remove animation when complete and execute callback
		badge.anim.addEventListener('complete', function() {
			console.log("Animation complete");
			badge.anim.removeEventListener('complete');
			if(popupAnim) {
				$container.addClass('hidden');
				$('.colourImg').removeClass('hidden');
				$container.one('transitionend', () => {
					$container.children('svg').remove();
					if(callback) {
						callback();
					}
				});
			} else {
				$container.children('svg').remove();
				if(callback) {
					callback();
				}
			}
		});
	}


	function popupBadge(badge) {
		console.log("Popping up badge...");
		populatePopupText(badge, $('#popupDiv'));
		setAnimLabel($('#popupDiv'), badge);
		let $origBadge = $('[data-ref="' + badge.ref + '"]');
		$origBadge.clone().addClass('zoomedBadge').appendTo('#popupImg');
		$('.zoomedBadge').removeAttr('data-ref');
		$('.zoomedBadge').offset($origBadge.offset());
		$('.zoomedBadge .svgHolder').addClass('hidden');
		$('.zoomedBadge').removeClass('highlight onTop zoomed');
		$('.zoomedBadge').addClass('focused');
		$('.zoomedBadge').detach().appendTo('#popupDiv');
		$('.zoomedBadge .svgHolder, .zoomedBadge .colourImg').addClass('popup');
		flushCss($('.zoomedBadge').get(0));
		// hideAnim(badge);
		hideMenuScreen();
		$('#popupDiv').addClass('displayed');
		$('#popupDiv').one('transitionend', () => {
			$origBadge.removeClass('highlight onTop zoomed');
			addPopupAnimListener(badge);
			addBackToMenuBtnListener();
			unlockAllControls();
		});
	}

	function addPopupAnimListener(badge) {
		$('.zoomedBadge, .animLabel').off('touchend');
		$('.zoomedBadge, .animLabel').on('touchend', () => {
			console.log("Label click!");
			if(!lockedControls) {
				lockAllControls();
				rethink.submit('ContentAnimationStartUser', getRethinkBadgeString(badge));
				$container = $('.zoomedBadge .svgHolder');
				loadAnim(badge, $container, () => {
					playAnim(badge, $container, true, () => {
						unlockAllControls();
					});
				});
			}
		});
	}

	function backToMenu() {
		lockAllControls();
		$('.zoomedBadge, .animLabel').off('touchend');
		// $('#sidebarContent').fadeIn('slow');
		$('#sidebar').removeClass('hidden');
		$('#focusSidebar').removeClass('shown');
		$('#menuBadges').fadeIn('slow');
		$('#infoPane').fadeIn('slow');
		$('.arrowBtn').addClass('hidden');
		$('.arrowBtn').one('transitionend', function() {
			$('.arrowBtn').removeClass('shown');
		});
		$('#popupDiv').removeClass('displayed');
		$('#popupDiv').one('transitionend', function() {
			console.log("Deleting cloned badge");
			$('.zoomedBadge').remove();
			selectedBadge = undefined;
			unlockAllControls();
		})
	}

	function changeSelectedBadge(direction) {
		lockAllControls();
		var newBadgeRef;
		if(direction === 'left') {
			newBadgeRef = badgeArray.indexOf(selectedBadge) - 1;
		} else if(direction === 'right') {
			newBadgeRef = badgeArray.indexOf(selectedBadge) + 1;
		}
		if(newBadgeRef < 0) {
			newBadgeRef = badgeArray.length - 1;
		} else if(newBadgeRef >= badgeArray.length) {
			newBadgeRef = 0;
		}
		selectedBadge = badgeArray[newBadgeRef];
		rethink.submit('ContentItemSelectUninformed', getRethinkBadgeString(selectedBadge));
		let cloneSide = direction === 'left' ? 'right' : 'left';
		$('#popupDiv').addClass('fastTransition');
		$('#popupDiv').clone().attr('id', 'clonedPopupDiv').addClass(direction).appendTo('#contentScreen');
		addBadgeImgs(selectedBadge, true, $('#clonedPopupDiv .zoomedBadge'));
		populatePopupText(selectedBadge, $('#clonedPopupDiv'));
		setAnimLabel($('#clonedPopupDiv'), selectedBadge);
		$('#popupDiv').addClass(cloneSide);
		$('#clonedPopupDiv').removeClass('left right');
		$('#popupDiv').one('transitionend', (e) => {
			$('#popupDiv').remove();
			$('#clonedPopupDiv').attr('id', 'popupDiv');
			$('.zoomedBadge .colourImg').addClass('popup');
			addBackToMenuBtnListener();
			addPopupAnimListener(selectedBadge);
			unlockAllControls();
		});
	}

	function setAnimLabel($container, badge) {
		$container.find('.animLabel').removeClass('circleBig circleMedium shieldMedium diamondMedium shieldSmall diamondSmall pentagonSmall bowater');
		$container.find('.animLabel').addClass(badge.shape)
	}

	$('#leftArrowBtn').on('touchend', function() {
		if(!lockedControls) {
			lockAllControls();
			changeSelectedBadge('left');
		}
	});
	$('#rightArrowBtn').on('touchend', function() {
		if(!lockedControls) {
			lockAllControls();
			changeSelectedBadge('right');
		}
	});

	function hideMenuScreen() {
		// $('#sidebarContent').fadeOut('slow');
		$('#sidebar').addClass('hidden');
		$('#focusSidebar').addClass('shown');
		$('#menuBadges').fadeOut('slow');
		$('#infoPane').fadeOut('slow');
		$('.arrowBtn').addClass('shown');
		$('.arrowBtn').removeClass('hidden');
		$('.arrowBtn').one('transitionend', function() {
			$('.arrowBtn').removeClass('shown');
		});
	}

	function populatePopupText(badge, $container) {
		console.log("Populating text...");
		$container.find('.textName').html(badge.name);
		$container.find('.textDescription').html(badge.description);
		$container.find('.textCareer').html(badge.career);
		if(badge.type.toLowerCase() !== 'shore station') {
			$container.find('.shipOrShoreStation').text('The Ship');
			$container.find('.topTrumpTable').show();
			$container.find('.careerLabel').show();
			$container.find('.textType').html(badge.type);
			$container.find('.textLength').html(badge.length);
			$container.find('.textBuilder').html(badge.builder);
			$container.find('.textLaunched').html(badge.launched);
			$container.find('.textSpeed').html(badge.speed);
			$container.find('.textCrew').html(badge.crew);
		} else {
			$container.find('.shipOrShoreStation').text('The Shore Station');
			$container.find('.topTrumpTable').show();
			$container.find('.careerLabel').show();
			$container.find('.topTrumpTable').hide();
			$container.find('.careerLabel').hide();
		}
		//	Default layout
		$container.find('.textSpeed').parent().parent().show();
		$container.find('.textCrew').parent().find('h5').text('Crew');
		$container.find('.textCrew').parent().show();
		$container.find('.textType').parent().attr('colspan', '1');
		$container.find('.textType').removeClass('span');
		if(badge.ref === 'C05' || badge.ref === 'B03') {					//	Hack for HMS Sandhurst / HMS Moorhen
			$container.find('.textCrew').parent().hide();
			$container.find('.textType').parent().attr('colspan', '100%');
			$container.find('.textType').addClass('span');
		} else if(badge.ref === 'Z01') {													//	Hack for Nicolas Bowater
			$container.find('.textCrew').parent().find('h5').text('Length');
			$container.find('.textCrew').html(badge.length);
			$container.find('.textSpeed').parent().parent().hide();
		}
	}

	function lockAllControls() {
		console.log("Locking controls");
		$('.btn').addClass('locked');
		lockedControls = true;
	}

	function unlockAllControls() {
		console.log("Unlocking controls");
		$('.btn').removeClass('locked');
		lockedControls = false;
	}

	function playMenuBadgeAnimation() {
		//	Choose a random badge from the array that is *not* the same as the last one played
		let badge = badgeArray[Math.floor(badgeArray.length * Math.random())];
		while(lastPlayedBadge !== undefined && badge.ref === lastPlayedBadge.ref) {
			console.log("Regenerating!");
			badge = badgeArray[Math.floor(badgeArray.length * Math.random())];
		}
		badgePlaying = badge;
		let $container = $('[data-ref="' + badge.ref + '"] .svgHolder');
		loadAnim(badge, $container, () => {
			$('[data-ref="' + badge.ref + '"]').addClass('onTop zoomed');
			console.log("Animating " + badge.name);
			rethink.submit('ContentAnimationStartAuto', getRethinkBadgeString(badge));
			playAnim(badge, $container, false, () => {
				$('[data-ref="' + badge.ref + '"]').removeClass('zoomed');
				$('[data-ref="' + badge.ref + '"]').one('transitionend', () => {
					$('[data-ref="' + badge.ref + '"]').removeClass('onTop');
					$('[data-ref="' + badge.ref + '"] .svgHolder').empty();
					lastPlayedBadge = badge;
					badgePlaying = undefined;
					if(animatingMenuBadges) {
						queueMenuBadgeAnimation();
					}
				});
			});
		});
	}

	function queueMenuBadgeAnimation() {
		if(animatingMenuBadges) {
			let timeToNextAnim = menuBadgeAnimTimeMin + Math.random() * menuBadgeAnimTimeMultiplier;
			console.log("Next anim in " + Math.floor(timeToNextAnim) + "ms.");
			clearTimeout(menuBadgeAnimHandler);
			menuBadgeAnimHandler = setTimeout(() => {
				playMenuBadgeAnimation();
			}, timeToNextAnim);
		}
	}

	function stopMenuBadgeAnimations() {
		animatingMenuBadges = false;
		clearTimeout(menuBadgeAnimHandler);
	}

	function startMenuBadgeAnimations() {
		animatingMenuBadges = true;
		queueMenuBadgeAnimation();
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
		// console.log("Restarting Inactivity timer...");
		// console.log(restartInactivityTimer.caller);
		clearInactivityTimer();
		startInactivityTimer();
	}


	//	Still There timer
	function startStillThereTimer() {
		rethink.submit('SessionTimeoutStart');
		stillThereHandler = setInterval(function() {
			stillThereTime--;
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
		rethink.submit('SessionTimeoutComplete');
		showAttractScreen(hideStillThereScreen);
	}

	function showAttractScreen(callback) {
		stopMenuBadgeAnimations();
		console.log("Showing Attract screen");
		clearInactivityTimer();
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

	function getRethinkBadgeString(badge) {
		badgeString = badge.ref + ', ' + rethink.stripHtmlTags(badge.name);
		return badgeString;
	}

	//	Utility functions
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

	function flushCss(element) {
		element.offsetWidth;
	}


	//	Event handlers
	$attractScreen.on('touchend', function() {
		rethink.submit('SessionStart');
		$attractScreen.fadeOut('slow', function() {
			startMenuBadgeAnimations();
			restartInactivityTimer();
		});
	});

	// $stillThereScreen.click(function() {
	// 	hideStillThereScreen();
	// 	clearStillThereTimer();
	// 	restartInactivityTimer();
	// });
	$stillThereScreen.on('touchend', function() {
		rethink.submit('SessionTimeoutCancel');
		hideStillThereScreen();
		clearStillThereTimer();
		restartInactivityTimer();
	});

	// $contentScreen.click(function() {
	// 	restartInactivityTimer();
	// });
	$contentScreen.on('touchend', function() {
		restartInactivityTimer();
	});

	$('#container').swipeleft((e) => {
		if(!lockedControls && selectedBadge !== undefined) {
			restartInactivityTimer();
			lockAllControls();
			changeSelectedBadge('right');
		}
	});
	$('#container').swiperight((e) => {
		if(!lockedControls && selectedBadge !== undefined) {
			restartInactivityTimer();
			lockAllControls();
			changeSelectedBadge('left');
		}
	});

	function addBackToMenuBtnListener() {
		$('.backToMenuBtn').on('touchend', function() {
			if(!lockedControls) {
				startMenuBadgeAnimations();
				console.log("Back to menu button clicked");
				rethink.submit('ContentItemExit', getRethinkBadgeString(selectedBadge));
				backToMenu();
			}
		});
	}

	firstLoad();

});