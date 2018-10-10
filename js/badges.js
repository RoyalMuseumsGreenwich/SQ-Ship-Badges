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
	var menuBadgeAnimTimeMin = 3000;
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
			console.log($thisBadge.attr('ref'));
			var thisBadgeObject = {
				ref: $thisBadge.attr('ref'),
				name: $thisBadge.find('name').html(),
				objectID: $thisBadge.find('objectID').html(),
				description: $thisBadge.find('description').html(),
				type: $thisBadge.find('type').html(),
				career: $thisBadge.find('career').html(),
				shape: $thisBadge.find('shape').text(),
				filename: $thisBadge.find('json').text(),
				fileref: $thisBadge.find('png ref').text()
			}
			if(thisBadgeObject.type !== 'shore station') {
				thisBadgeObject.launched = $thisBadge.find('launched').html();
				thisBadgeObject.builder = $thisBadge.find('builder').html();
				thisBadgeObject.length = $thisBadge.find('length').html();
				thisBadgeObject.speed = $thisBadge.find('speed').html();
				thisBadgeObject.crew = $thisBadge.find('crew').html();
			}
			console.log(thisBadgeObject);
			badgeArray.push(thisBadgeObject);
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
			//	Add badge container to correct row in div per first character of badge ref
			let row = "row" + badge.ref.substr(0,1);
			$('#' + row).append('<div data-ref="' + badge.ref + '" class="badge">');
			addBadgeImgs(badge, false, $('[data-ref="' + badge.ref + '"]'));
		});
		$('.badge').click(function() {
			if(!lockedControls) {
				lockedControls = true;
				console.log($(this));
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
		console.log(svgHolder);
		$container.append(svgHolder);
	}

	function selectBadge(badge, $container) {
		selectedBadge = badge;
		loadAnim(badge, $container, () => {
			$('[data-ref="' + badge.ref + '"]').addClass('highlight onTop zoomed');
			playAnim(badge, $('[data-ref="' + badge.ref + '"] .svgHolder'), false, true, () => {
				$('[data-ref="' + badge.ref + '"] .svgHolder').empty();
				popupBadge(badge);
			});
		});
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





	function playAnim(badge, $container, popupAnim, lockControls, callback) {
		//	Add animation to .svgHolder within $container
		console.log("Adding animation...");
		if(lockControls) {
			lockedControls = true;
		}
		if(popupAnim) {
			$('.colourImg').addClass('hidden');
			$container.removeClass('hidden');
			$container.one('transitionend', () => {
				badge.anim.play();
			});
		} else {
			console.log("Animation playing");
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
					if(lockControls) {
						lockedControls = false;
					}
				});
			} else {
				$container.children('svg').remove();
				if(callback) {
					callback();
				}
				if(lockControls) {
					lockedControls = false;
				}
			}
		});
	}



	function popupBadge(badge) {
		console.log("Popping up badge...");
		populatePopupText(badge, $('#popupDiv'));
		addBackToMenuBtnListener();
		let $origBadge = $('[data-ref="' + badge.ref + '"]');
		$origBadge.clone().addClass('zoomedBadge').appendTo('#popupImgDiv');
		$origBadge.removeClass('highlight onTop zoomed');
		$('.zoomedBadge').removeAttr('data-ref');
		$('.zoomedBadge').offset($origBadge.offset());
		$('.zoomedBadge .svgHolder').addClass('hidden');
		flushCss($('.zoomedBadge').get(0));
		// hideAnim(badge);
		$('.zoomedBadge').addClass('focused');
		$('.zoomedBadge').removeClass('highlight onTop zoomed');
		$('.zoomedBadge').one('transitionend', () => {
			$('.zoomedBadge').detach().appendTo('#popupDiv');
			$('.zoomedBadge .svgHolder, .zoomedBadge .colourImg').addClass('popup');
			addPopupAnimListener(badge);
			lockedControls = false;
		});
		$('#popupDiv').addClass('displayed');
		hideMenuScreen();
	}

	function addPopupAnimListener(badge) {
		$('.zoomedBadge').click(() => {
			if(!lockedControls) {
				$container = $('.zoomedBadge .svgHolder');
				loadAnim(badge, $container, () => {
					playAnim(badge, $container, true, true, () => {
						console.log("Done!");
					});
				});
			}
		});
	}

	function backToMenu() {
		lockedControls = true;
		selectedBadge = undefined;
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
			lockedControls = false;
		})
	}

	function changeSelectedBadge(direction) {
		lockedControls = true;
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
		let cloneSide = direction === 'left' ? 'right' : 'left';
		$('#popupDiv').addClass('fastTransition');
		$('#popupDiv').clone().attr('id', 'clonedPopupDiv').addClass(direction).appendTo('#contentScreen');
		addBadgeImgs(selectedBadge, true, $('#clonedPopupDiv .zoomedBadge'));
		populatePopupText(selectedBadge, $('#clonedPopupDiv'));
		addBackToMenuBtnListener();
		// flushCss('#clonedPopupDiv');
		// flushCss('#popupDiv');
		$('#popupDiv').addClass(cloneSide);
		console.log($('#popupDiv'));
		$('#clonedPopupDiv').removeClass('left right');
		console.log($('#clonedPopupDiv'));
		$('#popupDiv').one('transitionend', (e) => {
			console.log(e);
			console.log("sdfsdfsdf");
			$('#popupDiv').remove();
			$('#clonedPopupDiv').attr('id', 'popupDiv');
			$('.zoomedBadge .colourImg').addClass('popup');
			addPopupAnimListener(selectedBadge);
			console.log("Unlocking controls...");
			lockedControls = false;
		});
	}

	$('#leftArrowBtn').click(function() {
		if(!lockedControls) {
			changeSelectedBadge('left');
		}
	});
	$('#rightArrowBtn').click(function() {
		if(!lockedControls) {
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
		if(badge.type !== 'shore station') {
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
		if(badge.ref === 'C05' || badge.ref === 'B03') {					//	Hack for HMS Sandhurst / HMS Moorhen
			$container.find('.textCrew').parent().hide();
			$container.find('.textType').parent().attr('colspan', '100%');
			$container.find('.textType').addClass('span');
		} else {
			$container.find('.textCrew').parent().show();
			$container.find('.textType').parent().attr('colspan', '1');
			$container.find('.textType').removeClass('span');
		}
	}


	function stopMenuBadgeAnimations() {

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
		// stopMenuBadgeAnimations();
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

	function addBackToMenuBtnListener() {
		$('.backToMenuBtn').click(function() {
			if(!lockedControls) {
				console.log("Clicked!");
				backToMenu();
			}
		});
	}

	firstLoad();

});