'use strict';

/**
 * Module dependencies.
 */
var _ = require('lodash'),
	errorHandler = require('../errors.server.controller'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User'),
	config = require('../../../config/config'),
	async = require('async'),
	crypto = require('crypto');


/**
 * Forgot for reset password (forgot POST)
 */
exports.forgot = function (req, res, next) {
	async.waterfall([
		// Generate random token
		function (done) {
			crypto.randomBytes(20, function (err, buffer) {
				var token = buffer.toString('hex');
				done(err, token);
			});
		},
		// Lookup user by username
		function (token, done) {
			if (req.body.username) {
				User.findOne({
					username: req.body.username
				}, '-salt -password', function (err, user) {
					if (!user) {
						return res.status(400).send({
							type: 'NO_ACCOUNT_FOUND_WITH_THIS_USERNAME',
							description: 'No account with that username has been found'
						});

					} else if (user.provider !== 'local') {

						return res.status(400).send({
							type: 'SINGED_WITH_THIRD_PARTY_PROVIDER',
							description: 'It seems like you signed up using your ' + user.provider + ' account'
						});

					} else {
						user.reset_password_token = token;
						user.reset_password_expires = Date.now() + 3600000; // 1 hour

						user.save(function (err) {
							done(err, token, user);
						});
					}
				});
			} else {

				return res.status(400).send({
					type: 'USERNAME_FIELD_IS_BLANK',
					description: 'username field must not be blank'
				});

			}
		},
		function (token, user, done) {
			res.render('templates/reset-password-email', {
				name: user.displayName,
				appName: config.app.title,
				url: 'http://' + req.headers.host + '/auth/reset/' + token
			}, function (err, emailHTML) {
				done(err, emailHTML, user);
			});
		},
		// If valid email, send reset email using service
		function (emailHTML, user, done) {
			var mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Password Reset',
				html: emailHTML
			};
		}
	], function (err) {
		if (err) return next(err);
	});
};

/**
 * Reset password GET from email token
 */
exports.validateResetToken = function (req, res) {
	User.findOne({
		reset_password_token: req.params.token,
		reset_password_expires: {
			$gt: Date.now()
		}
	}, function (err, user) {
		if (!user) {
			return res.redirect('/i/password/reset/invalid');
		}

		res.redirect('/i/password/reset/' + req.params.token);
	});
};

/**
 * Reset password POST from email token
 */
exports.reset = function (req, res, next) {
	// Init Variables
	var passwordDetails = req.body;

	async.waterfall([

		function (done) {
			User.findOne({
				reset_password_token: req.params.token,
				reset_password_expires: {
					$gt: Date.now()
				}
			}, function (err, user) {
				if (!err && user) {
					if (passwordDetails.new_password === passwordDetails.verify_password) {
						user.password = passwordDetails.new_password;
						user.reset_password_token = undefined;
						user.reset_password_expires = undefined;

						user.save(function (err) {
							if (err) {

								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: errorHandler.getErrorMessage(err)
								});

							} else {
								req.login(user, function (err) {
									if (err) {
										res.status(500).send({
											type: 'INTERNAL_SERVER_ERROR',
											description: errorHandler.getErrorMessage(err)
										});
									} else {
										// Return authenticated user
										res.json(user);

										done(err, user);
									}
								});
							}
						});
					} else {
						res.status(400).send({type: 'PASSWORDS_DO_NOT_MATCH', description: 'passwords do not match'});

					}
				} else {

					res.status(400).send({
						type: 'PASSWORD_RESET_TOKEN_IS_INVALID_OR_EXPIRED',
						description: 'password reset token is invalid or has expired.'
					});

				}
			});
		},
		function (user, done) {
			res.render('templates/reset-password-confirm-email', {
				name: user.displayName,
				appName: config.app.title
			}, function (err, emailHTML) {
				done(err, emailHTML, user);
			});
		},
		// If valid email, send reset email using service
		function (emailHTML, user, done) {
			var mailOptions = {
				to: user.email,
				from: config.mailer.from,
				subject: 'Your password has been changed',
				html: emailHTML
			};
		}
	], function (err) {
		if (err) return next(err);
	});
};

/**
 * Change Password
 */
exports.changePassword = function (req, res) {
	// Init Variables
	var passwordDetails = req.body;

	if (req.user) {
		if (passwordDetails.new_password) {
			User.findById(req.user.id, function (err, user) {
				if (!err && user) {
					if (user.authenticate(passwordDetails.current_password)) {
						if (passwordDetails.new_password === passwordDetails.verify_password) {
							user.password = passwordDetails.new_password;

							user.save(function (err) {
								if (err) {
									res.status(500).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: errorHandler.getErrorMessage(err)
									});

								} else {
									req.login(user, function (err) {
										if (err) {
											res.status(500).send({
												type: 'INTERNAL_SERVER_ERROR',
												description: errorHandler.getErrorMessage(err)
											});
										} else {
											res.send({
												type: 'PASSWORD_CHANGED',
												description: 'Password changed successfully'
											});

										}
									});
								}
							});
						} else {
							res.status(400).send({
								type: 'PASSWORDS_DO_NOT_MATCH',
								description: 'passwords do not match'
							});
						}
					} else {
						res.status(400).send({
							type: 'CURRENT_PASSWORD_IS_INCORRECT',
							description: 'current password is incorrect'
						});

					}
				} else {
					res.status(400).send({type: 'USER_IS_NOT_FOUND', description: 'user is not found'});
				}
			});
		} else {
			res.status(400).send({type: 'PROVIDER_NEW_PASSWORD', description: 'please provide a new password.'});
		}
	} else {
		return res.status(401).send({type: 'USER_IS_NOT_LOGGED_IN', description: 'User is not logged in'});
	}
};
