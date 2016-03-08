'use strict';

var ipRangeController = require('../controllers/iprange.server.controller.js');
var requestIp = require('request-ip');

/**
 * Module dependencies.
 */
exports.intro_website = function (req, res) {
	var clientIP = requestIp.getClientIp(req);
	ipRangeController.isIPFromIran(clientIP, function (isFrom) {
		res.render('intro_website/index', {
			hostname: req.hostname,
			isFromIran: isFrom
		});
	});
};
