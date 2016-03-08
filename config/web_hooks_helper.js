'use strict';

var request = require('request'),
	config = require('./config');


/**
 * inform when new user join telepathy
 * @param user_name
 * @param user_email_address
 */
exports.sendWebHookWhenNewUserJoinTelepathy = function (user_name, user_email_address) {
	request({
		url: config.webHookEndPoint,
		method: 'POST',
		json: {
			text: 'New user >> ' + user_name + ' << join telepathy with this email address >> ' + user_email_address + ' <<',
			icon_emoji: ':grin:'
		}
	}, function (err, response) {
		if (err) {
			console.log(err);
		}
	});
};

/**
 * inform when user delete account
 * @param username
 * @param user_email_address
 * @param user_display_name
 */
exports.sendWebHookWhenUserDeleteUserAccount = function (username, user_email_address, user_display_name) {
	request({
		url: config.webHookEndPoint,
		method: 'POST',
		json: {
			text: '@' + username + ' ' + user_display_name + ' with this email address ' + user_email_address + ' delete user account',
			icon_emoji: ':angry:'
		}
	}, function (err, response) {
		if (err) {
			console.log(err);
		}
	});
};

/**
 * inform when something wrong
 * @param err
 */
exports.sendWhenSomethingWrong = function (err) {
	request({
		url: config.webHookEndPoint,
		method: 'POST',
		json: {
			text: 'something wrong with telepathy application ' + err,
			icon_emoji: ':ghost:'
		}
	}, function (err, response) {
		if (err) {
			console.log(err);
		}
	});
};
