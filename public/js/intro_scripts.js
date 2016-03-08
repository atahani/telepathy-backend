'use strict';

$(document).ready(function () {
	$('#telepathy_app').fullpage({
		//Navigation
		menu: false,
		lockAnchors: true,
		anchors: [],
		navigation: true,
		navigationPosition: 'right',
		navigationTooltips: ['Get it', 'How it works ?'],
		showActiveTooltip: true,
		slidesNavigation: false,
		slidesNavPosition: 'bottom',

		//Scrolling
		css3: true,
		scrollingSpeed: 700,
		autoScrolling: true,
		fitToSection: true,
		fitToSectionDelay: 1000,
		scrollBar: false,
		easing: 'easeInOutCubic',
		easingcss3: 'ease',
		loopBottom: false,
		loopTop: false,
		loopHorizontal: true,
		continuousVertical: false,
		normalScrollElements: '#element1, .element2',
		scrollOverflow: false,
		touchSensitivity: 15,
		normalScrollElementTouchThreshold: 5,

		//Accessibility
		keyboardScrolling: true,
		animateAnchor: true,
		recordHistory: true,

		//Design
		controlArrows: true,
		verticalCentered: true,
		resize: false,
		sectionsColor: ['#8BC34A', '#7E8A8A', '#E6FBFF'],
		paddingTop: '3em',
		paddingBottom: '10px',
		responsiveHeight: 790,

		//events
		onLeave: function (index, nextIndex, direction) {
			if (nextIndex === 3) {
				$('#fp-nav ul li a span, .fp-slidesNav ul li a span').css({'background-color': '#7F4D46'});
				$('#fp-nav ul li .fp-tooltip').css({'color': '#7F4D46'});
			}
			else {
				$('#fp-nav ul li a span, .fp-slidesNav ul li a span').css({'background': 'white'});
				$('#fp-nav ul li .fp-tooltip').css({'color': 'white'});
			}
		}
	});

	var hash = window.location.hash;
	if (hash === '#privacy_policy') {
		// move to section 3 and open privacy dialog
		$.fn.fullpage.moveTo(3);
		$('.p_p_modal').colorbox({inline: true, width: '50%', open: true});
	}

	$('.navigate_down a').click(function () {
		$.fn.fullpage.moveSectionDown();
	});
});
