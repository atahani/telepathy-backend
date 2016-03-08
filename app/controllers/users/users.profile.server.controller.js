'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller.js'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User');

/**
 * Update user details
 */
exports.update = function(req, res) {
	// Init Variables
	var user = req.user;
	var message = null;

	// For security measurement we remove the roles from the req.body object
	delete req.body.roles;

	// Merge existing user
	user = _.extend(user, req.body);
	user.updated_at = Date.now();

	user.save(function(err) {
		if (err) {
			return res.status(400).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
		} else {
			req.login(user, function(err) {
				if (err) {
					res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
				} else {
					res.json(user);
				}
			});
		}
	});
};

/**
 * Send User
 */
exports.me = function(req, res) {
	res.json(req.user || null);
};
