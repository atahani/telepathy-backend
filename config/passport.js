'use strict';

/**
 * module dependencies
 */
var passport = require('passport'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	AccessToken = mongoose.model('AccessToken'),
	bearerStrategy = require('passport-http-bearer');

module.exports = function () {

	// serialize sessions
	passport.serializeUser(function (user, done) {
		done(null, user.id);
	});

	// deserialize sessions
	passport.deserializeUser(function (id, done) {
		User.findOne({
			_id: id
		}, function (err, user) {
			done(err, user);
		});
	});

	//passport strategy for bearer token
	passport.use(new bearerStrategy(function (token, done) {
		AccessToken.findOne({token: token})
			.populate('_client', 'active_status')
			.exec(function (err, access_token) {
				if (err) {
					return done({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else if (access_token) {
					if (access_token._client && access_token._client.active_status) {
						//get user from userId
						User.findById(access_token._user, function (err, user) {
							if (err) {
								return done({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
							}
							else if (user) {
								//check lock_status
								if (user.lock_status) {
									return done({type: 'USER_LOCKED', description: 'User locked'});
								}
								else {
									var message_token_type, message_token;
									user.trusted_apps.forEach(function (trusted_app) {
										if (trusted_app._id.toString() === access_token._trusted_app.toString()) {
											message_token_type = trusted_app.message_token_type;
											message_token = trusted_app.message_token;
										}
									});
									//this access token authorize and pass user object
									return done(null, user, {
										scope: 'all', app_info: {
											id: access_token._trusted_app,
											message_token_type: message_token_type,
											message_token: message_token
										}
									});
								}
							}
							else {
								//maybe some error happened
								return done({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
							}
						});
					}
					else {
						return done({type: 'CLIENT_IS_DISABLE', description: 'Client is disable'});
					}
				}
				else {
					return done({type: 'ACCESS_TOKEN_IS_NOT_VALID', description: 'Access token is not valid'});
				}
			});
	}));

};
