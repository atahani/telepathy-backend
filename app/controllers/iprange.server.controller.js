'use strict';

/**
 * Module dependencies.
 * controller for ip range controller
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	IPRange = mongoose.model('iprange');


var _getCountryInformationByIP = function (ip_address, Callback) {
	//first should convert ip address to decimal number
	var ip_split = ip_address.split('.');
	var ip_in_decimal = 0;
	for (var i = 0; i < ip_split.length; i++) {
		var power = 3 - i;
		var ip = parseInt(ip_split[i]);
		ip_in_decimal += ip * Math.pow(256, power);
	}
	IPRange.findOne({
		ip_start: {$lte: ip_in_decimal},
		ip_end: {$gte: ip_in_decimal}
	}, function (err, ip_range) {
		if (ip_range) {
			new Callback(ip_range.country_code, ip_range.country_name);
		}
		else {
			new Callback('US', 'United States');
		}
	});
};

/**
 * detect is IP from iran or not
 * @param ip_address ip_address in string format
 * @returns {string} true or false
 */
exports.isIPFromIran = function (ip_address, Callback) {
	_getCountryInformationByIP(ip_address, function (country_code) {
		new Callback(country_code === 'IR');
	});
};

