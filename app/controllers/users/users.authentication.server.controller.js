'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User');

/**
 * Signup
 */
exports.signup = function(req, res) {
	// For security measurement we remove the roles from the req.body object
	delete req.body.roles;

	// Init Variables
	var user = new User(req.body);
	var message = null;

	// Add missing user fields
	user.provider = 'local';

	// Then save the user
	user.save(function(err) {
		if (err) {
			res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
		} else {
			// Remove sensitive data before login
			user.password = undefined;
			user.salt = undefined;

			req.login(user, function(err) {
				if (err) {
					res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: 'Internal server error'});
				} else {
					res.json(user);
				}
			});
		}
	});
};

/**
 * Sign in after passport authentication
 */
exports.signin = function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err || !user) {
			res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
		} else {
			// Remove sensitive data before login
			user.password = undefined;
			user.salt = undefined;

			req.login(user, function(err) {
				if (err) {
					res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
				} else {
					res.json(user);
				}
			});
		}
	})(req, res, next);
};

/**
 * Signout
 */
exports.signout = function(req, res) {
	req.logout();
	res.redirect('/');
};

/**
 * OAuth callback
 */
exports.oauthCallback = function(strategy) {
	return function(req, res, next) {
		passport.authenticate(strategy, function(err, user, redirectURL) {
			if (err || !user) {
				return res.redirect('/i/signin');
			}
			req.login(user, function(err) {
				if (err) {
					return res.redirect('/i/signin');
				}

				return res.redirect(redirectURL || '/');
			});
		})(req, res, next);
	};
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {
	if (!req.user) {
		// Define a search query fields
		var searchMainProviderIdentifierField = 'provider_data.' + providerUserProfile.providerIdentifierField;
		var searchAdditionalProviderIdentifierField = 'additional_providers_data.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;

		// Define main provider search query
		var mainProviderSearchQuery = {};
		mainProviderSearchQuery.provider = providerUserProfile.provider;
		mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define additional provider search query
		var additionalProviderSearchQuery = {};
		additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

		// Define a search query to find existing user with current provider profile
		var searchQuery = {
			$or: [mainProviderSearchQuery, additionalProviderSearchQuery]
		};

		User.findOne(searchQuery, function(err, user) {
			if (err) {
				return done(err);
			} else {
				if (!user) {
					var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

					User.findUniqueUsername(possibleUsername, null, function(availableUsername) {
						user = new User({
							username: availableUsername,
							display_name: providerUserProfile.displayName,
							email: providerUserProfile.email,
							provider: providerUserProfile.provider,
							provider_data: providerUserProfile.providerData
						});

						// And save the user
						user.save(function(err) {
							return done(err, user);
						});
					});
				} else {
					return done(err, user);
				}
			}
		});
	} else {
		// User is already logged in, join the provider data to the existing user
		var user = req.user;

		// Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
		if (user.provider !== providerUserProfile.provider && (!user.additional_providers_data || !user.additional_providers_data[providerUserProfile.provider])) {
			// Add the provider data to the additional provider data field
			if (!user.additional_providers_data) user.additional_providers_data = {};
			user.additional_providers_data[providerUserProfile.provider] = providerUserProfile.providerData;

			// Then tell mongoose that we've updated the additional_providers_data field
			user.markModified('additional_providers_data');

			// And save the user
			user.save(function(err) {
				return done(err, user, '/i/settings/accounts');
			});
		} else {
			return done(new Error('User is already connected using this provider'), user);
		}
	}
};

/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function(req, res, next) {
	var user = req.user;
	var provider = req.param('provider');

	if (user && provider) {
		// Delete the additional provider
		if (user.additional_providers_data[provider]) {
			delete user.additional_providers_data[provider];

			// Then tell mongoose that we've updated the additional_providers_data field
			user.markModified('additional_providers_data');
		}

		user.save(function(err) {
			if (err) {
				res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: errorHandler.getErrorMessage(err)});
			} else {
				req.login(user, function(err) {
					if (err) {
						res.status(500).send({type:'INTERNAL_SERVER_ERROR',description: 'Internal Server error'});
					} else {
						res.json(user);
					}
				});
			}
		});
	}
};
