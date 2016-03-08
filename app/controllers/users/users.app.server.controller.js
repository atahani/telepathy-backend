'use strict';

/**
 * Module dependencies.
 * controller for user that connect with application
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	passport = require('passport'),
	User = mongoose.model('User'),
	AccessToken = mongoose.model('AccessToken'),
	crypto = require('crypto'),
	imageTools = require('../../../config/media_tools'),
	path = require('path'),
	flakeId = require('flake-idgen'),
	intformat = require('biguint-format'),
	formidable = require('formidable'),
	request = require('request'),
	fs_extra = require('fs-extra'),
	FriendHelper = require('../friend.server.controller.js'),
	MessageHelper = require('../message.server.controller.js'),
	TelepathyHelper = require('../telepathy.server.controller.js'),
	PNSHelper = require('../../../config/pns_helper.js'),
	WebHooksHelper = require('../../../config/web_hooks_helper.js');

var default_image_profile = {
	file_name: 'default_image_profile',
	width: 800,
	height: 800,
	route: 'profile'
};

var not_valid_username_list = ['media', 'api', 'help', 'telepathy', 'about', 'fa'];

/**
 * get random expire date time
 * random expire time between 120min - 300min
 * @returns {{expire_at: Date, expire_in_sec: number}}
 * @private
 */
var _getRandomExpireDateTime = function () {
	var expire_at = new Date();
	var expire_in_minute = Math.floor(Math.random() * (2880 - 20 + 1)) + 1;
	expire_at.setMinutes(expire_at.getMinutes() + expire_in_minute);
	return {expire_at: expire_at, expire_in_sec: expire_in_minute * 60};
};

/**
 * get user profile data like mobile_number, image_profile
 * @param user user object model
 * @private
 */
var _getUserProfileData = function (user) {
	return {
		email: user.email,
		display_name: user.display_name ? user.display_name : '',
		image_profile_url: global.__media_end_point + user.image_profile.route + '/200/h/' + user.image_profile.file_name + '.jpeg',
		username: user.username,
		locale: user.locale,
		theme: user.theme
	};
};


/**
 * get user data
 * @param user user object
 * @private
 */
var _getUserData = function (user) {
	if (user) {
		return {
			user_id: user._id,
			username: user.username,
			display_name: user.display_name,
			image_url: global.__media_end_point + user.image_profile.route + '/200/h/' + user.image_profile.file_name + '.jpeg',
			theme: user.theme
		};
	}
	else {
		return null;
	}
};

/**
 * get information for PNS of user
 * @param trusted_apps
 * @param current_app_id
 * @returns {Array}
 */

var _getInformationForPNSOfUserTrustedApps = function (trusted_apps, current_app_id) {
	var pns_token_list = [];
	trusted_apps.forEach(function (trusted_app) {
		if (trusted_app._id.toString() !== current_app_id.toString()) {
			pns_token_list.push(trusted_app.message_token);
		}
	});
	return pns_token_list;
};


/**
 * get information for PNS of user
 * @param trusted_apps
 * @param current_app_id
 * @returns {Array}
 */
exports.getInformationForPNSOfUserTrustedApps = _getInformationForPNSOfUserTrustedApps;

exports.getUserData = _getUserData;

/**
 * pre checking for api requests
 * @param req request
 * @param res response
 * @param next next action
 */
exports.apiReqAuthorization = function (req, res, next) {
	passport.authenticate('bearer', {session: false}, function (err, user, info) {
		if (err) {
			//get error type and send with different status code
			if (err.type === 'INTERNAL_SERVER_ERROR') {
				//500 server internal error
				res.status(500).send(err);
			}
			else if (err.type === 'USER_LOCKED') {
				//423 that mean resource is locked
				res.status(423).send(err);
			}
			else if (err.type === 'CLIENT_IS_DISABLE') {
				res.status(403).send(err);
			}
			else {
				//access token is not valid
				//{type: 'ACCESS_TOKEN_IS_NOT_VALID', description: 'Access token is not valid'}
				res.status(401).send(err);
			}
		}
		else if (user) {
			req.user = user;
			req.app_id = info.app_info.id;
			req.app_pns_type = info.app_info.message_token_type;
			req.app_pns_token = info.app_info.message_token;
			next();
		}
		else {
			//un authorized request
			res.status(401).send({type: 'ACCESS_TOKEN_IS_NOT_VALID', description: 'Access token is not valid'});
		}
	})(req, res, next);
};

/**
 * check is this username unique
 * @param username String username
 * @param Callback Callback function when done (err,isUnique)
 */
var isUsernameUnique = function (username, Callback) {
	User.count({username: username}, function (err, count) {
		if (err) {
			new Callback(err, false);
		}
		else if (count === 0) {
			new Callback(null, true);
		}
		else {
			new Callback(null, false);
		}
	});
};

/**
 * save image profile from URL
 * @param image_profile_url
 * @param Callback when image saved or occur error
 */
var checkImageThenSaveImageProfileFromURL = function (image_profile_url, Callback) {
	//check image_profile_url if undefined means have default image profile
	if (image_profile_url) {
		image_profile_url = image_profile_url.replace('/s96-c/', '/');
		//first save in tmp_upload then save image via media_tools
		var flake_id_gen = new flakeId();
		var file_name = intformat(flake_id_gen.next(), 'dec');
		var file_path = path.resolve(global.__tmp_upload_dir, file_name);
		var ws = fs_extra.createWriteStream(file_path);
		ws.on('error', function () {
			//on error return default image profile
			new Callback(default_image_profile);
		});
		request(image_profile_url)
			.on('error', function () {
				//on error return default image profile
				new Callback(default_image_profile);
			})
			.pipe(ws).on('close', function () {
				//now save the image file
				imageTools.saveImageMedia('profile', file_path, file_name, function (err, info, route_name) {
					if (err) {
						new Callback(default_image_profile);
					}
					else {
						new Callback({
							file_name: file_name,
							width: info.width,
							height: info.height,
							route: route_name
						});
					}
				});
			}).on('error', function () {
				//on error return default image profile
				new Callback(default_image_profile);
			});
	}
	else {
		new Callback(default_image_profile);
	}
};

/**
 * assign token and user info and send to user , when sign in and sign up successfully
 * @param res response
 * @param user user object new user or existing user
 * @param client_id client_id of the client application
 * @param device_model the device model
 */
var assignTokenAndUserInfo = function (res, user, client_id, device_model) {
	var app_id = null;
	//generate auth token and then save this clientId to user
	var access_token_app = crypto.randomBytes(25).toString('hex');
	var refresh_token_app = crypto.randomBytes(20).toString('hex');
	var randomExpireDT = _getRandomExpireDateTime();
	//first check is user have trusted apps with this device_model
	//if yes update this trusted apps if not create new trusted apps
	user.trusted_apps.forEach(function (trusted_app) {
		if (trusted_app.device_model === device_model) {
			trusted_app.refresh_token = refresh_token_app;
			app_id = trusted_app._id;
		}
	});
	//check is not have trusted apps with this device_model
	if (!app_id) {
		var trusted_app = {
			_client: client_id,
			refresh_token: refresh_token_app,
			device_model: device_model
		};
		user.trusted_apps.push(trusted_app);
		//get last app_id of trusted app the we add it
		app_id = user.trusted_apps[user.trusted_apps.length - 1]._id;
	}
	user.save(function (err) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			//now save new access token to db
			var new_access_token = new AccessToken({
				_client: client_id,
				_user: user._id,
				_trusted_app: app_id,
				token: access_token_app,
				expire_at: randomExpireDT.expire_at
			});
			new_access_token.save(function (err) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					//return user info
					var responseBody = {
						token: {
							access_token: access_token_app,
							expire_in: randomExpireDT.expire_in_sec,
							refresh_token: refresh_token_app,
							user_id: user._id,
							app_id: app_id
						},
						user_profile: _getUserProfileData(user),
						is_in_sign_up_mode: user.is_in_sign_up_mode
					};
					res.json(responseBody);
				}
			});
		}
	});
};

/**
 * when accessToken validate with verified email_address
 * should assign Telepathy accessToken >> sign in OR sign up user
 * @param res response
 * @param client_id telepathy client_id application
 * @param provider valid provider
 * @param provider_id provider_id the user id from third_party application
 * @param email_address verified email address
 * @param display_name display_name
 * @param image_profile_url
 * @param locale
 * @param device_model
 */
var signUpOrSignInWhenValidate = function (res, client_id, provider, provider_id, email_address, display_name, image_profile_url, locale, device_model) {
	//check is there any user with this provider_id
	User.findOne({'third_parties.provider_id': provider_id, 'third_parties.provider': provider}, function (err, user) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else if (user) {
			/**
			 * sign in mode
			 * mean assign accessToken to user
			 */
			//check is user locked or not
			if (user.lock_status) {
				//423 that mean resource is locked
				res.status(423).send({type: 'USER_LOCKED', description: 'User locked'});
			}
			else {
				assignTokenAndUserInfo(res, user, client_id, device_model);
			}
		}
		else {
			//check is this email already in system
			User.findOne({email: email_address}, function (err, user_with_email) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else if (user_with_email) {
					//sign in as this user since the email address match and
					//this email is verified so it's point to one person
					user_with_email.third_parties.push({
						provider_id: provider_id,
						provider: provider
					});
					assignTokenAndUserInfo(res, user_with_email, client_id, device_model);
				}
				else {
					//if not sign up this new user
					checkImageThenSaveImageProfileFromURL(image_profile_url, function (image_profile_object) {
						var username = email_address.substring(0, email_address.indexOf('@')).replace('.', '_');
						//check username availability
						isUsernameUnique(username, function (err, isUnique) {
							if (err) {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
							else {
								var new_user_username;
								if (not_valid_username_list.indexOf(username) === -1) {
									new_user_username = isUnique ? username : undefined;
								}
								else {
									new_user_username = undefined;
								}
								var newUser = new User({
									username: new_user_username,
									display_name: display_name,
									email: email_address,
									image_profile: image_profile_object,
									locale: locale,
									provider: 'app'
								});
								newUser.third_parties.push({
									provider_id: provider_id,
									provider: provider
								});
								assignTokenAndUserInfo(res, newUser, client_id, device_model);
								WebHooksHelper.sendWebHookWhenNewUserJoinTelepathy(display_name, email_address);
							}
						});
					});
				}
			});
		}
	});
};

var googleAccessTokenValidation = function (access_token, Callback) {
	request.get('https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=' + access_token, function (err, res, body) {
		if (!err && res.statusCode === 200) {
			var data = JSON.parse(body);
			if (data.email_verified) {
				//return google user id
				new Callback(null, data.sub, data.email, data.name, data.picture);
			}
			else {
				new Callback({type: 'EMAIL_ADDRESS_IS_NOT_VERIFIED', description: 'Email address is not verified'});
			}
		}
		else {
			new Callback({type: 'INVALID_ACCESS_TOKEN', description: 'Access Token is invalid'});
		}
	});
};

/**
 * sign up user with third parties or sign in with third parties
 * the email address is unique
 * the email in third party application is valid and verified
 * so it's the key in sign up or sign in
 * NOTE: before assign Token check client Authorization
 * @param req request request
 * @param res response response
 */
exports.signInOrSignUp = function (req, res) {
	//first check information like email address and accessToken
	var client_id = req.body.app_id;
	//var trusted_app_id = req.body.trusted_app_id;
	var device_model = req.body.device_model;
	var provider = req.body.provider;
	var access_token = req.body.access_token;
	var locale = req.body.locale ? req.body.locale : 'en';
	if (provider === 'google') {
		//now check access token
		if (access_token) {
			googleAccessTokenValidation(access_token, function (errResponse, user_id, email_address, display_name, image_profile_url) {
				if (errResponse) {
					res.status(400).send(errResponse);
				}
				else {
					signUpOrSignInWhenValidate(res, client_id, provider, user_id, email_address, display_name, image_profile_url, locale, device_model);
				}
			});
		}
		else {
			res.status(400).send({type: 'ACCESS_TOKEN_FIELD_IS_EMPTY', description: 'Access Token is empty'});
		}
	}
	else {
		res.status(400).send({type: 'INVALID_PROVIDER', description: 'Provider is invalid'});
	}

};

/**
 * refresh access token with refresh_token
 * @param req request
 * @param res response
 */
exports.refreshToken = function (req, res) {
	var refresh_token = req.body.refresh_token;
	var client_id = req.body.app_id;
	//find user by these info then refresh token
	User.findOne({
		'trusted_apps._client': client_id,
		'trusted_apps.refresh_token': refresh_token
	}, function (err, user) {
		if (err) {
			//error happened
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else if (user) {
			//refresh token
			var randomExpireDT = _getRandomExpireDateTime();
			var new_access_token = crypto.randomBytes(25).toString('hex');
			var new_refresh_token = crypto.randomBytes(20).toString('hex');
			user.trusted_apps.forEach(function (trusted_app) {
				if (trusted_app.refresh_token === refresh_token) {
					//first create new access token then save new refresh token in user model
					trusted_app.refresh_token = new_refresh_token;
					var access_token = new AccessToken({
						_client: client_id,
						_user: user._id,
						_trusted_app: trusted_app._id,
						token: new_access_token,
						expire_at: randomExpireDT.expire_at
					});
					access_token.save(function (err) {
						if (err) {
							res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
						}
						else {
							//now save user object
							//save user info then send token
							user.save(function (err) {
								if (err) {
									res.status(500).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: 'Internal server error'
									});
								}
								else {
									//return user info
									var responseBody = {
										access_token: new_access_token,
										expire_in: randomExpireDT.expire_in_sec,
										refresh_token: new_refresh_token,
										user_id: user._id,
										app_id: trusted_app._id
									};
									res.json(responseBody);
								}
							});
						}
					});
				}
			});
		}
		else {
			res.status(403).send({type: 'INVALID_REFRESH_TOKEN', description: 'Invalid refresh token'});
		}
	});
};

/**
 * check username availability before sign in
 * POST request to check username is available
 * @param req request
 * @param res response
 */
exports.checkUsernameAvailability = function (req, res) {
	var user = req.user;
	var username = req.body.username;
	if (username && username !== '') {
		if (username !== user.username) {
			if (username.match('^[a-zA-Z0-9_]{4,20}$') && not_valid_username_list.indexOf(username) === -1) {
				//mean this is new username should check it
				isUsernameUnique(username, function (err, isUnique) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else {
						res.send({
							is_valid: isUnique,
							is_unique: isUnique,
							username: username
						});
					}
				});
			}
			else {
				res.send({
					is_valid: false,
					is_unique: null,
					username: username
				});
			}

		}
		else {
			res.send({
				is_valid: true,
				is_unique: true,
				username: username
			});
		}
	}
	else {
		res.status(400).send({type: 'USERNAME_FIELD_IS_EMPTY', description: 'username field is empty'});
	}
};

/**
 * get user profile information
 * @param req request
 * @param res response
 */
exports.getUserProfile = function (req, res) {
	res.json(_getUserProfileData(req.user));
};

/**
 * update profile
 * display name
 * locale
 * theme
 * @param req request
 * @param res response
 */
exports.updateProfile = function (req, res) {
	var display_name = req.body.display_name;
	var locale = req.body.locale;
	var username = req.body.username;
	var theme = req.body.theme;
	var user = req.user;
	if (theme) {
		if (display_name) {
			if (locale) {
				if (username && username !== user.username) {
					//first check pattern
					if (username.match('^[a-zA-Z0-9_]{4,20}$') && not_valid_username_list.indexOf(username) === -1) {
						//mean this is new username should check it
						User.count({username: username}, function (err, count) {
							if (err) {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
							else if (count === 0) {
								//update username and display_name
								user.username = username;
								user.display_name = display_name;
								user.locale = locale;
								user.theme = theme;
								user.is_in_sign_up_mode = false;
								user.updated_at = Date.now();
								user.save(function (err, update_user) {
									if (err) {
										res.status(500).send({
											type: 'INTERNAL_SERVER_ERROR',
											description: 'Internal server error'
										});
									}
									else {
										//notify friend that this user profile change it
										PNSHelper.sendFriendUpdateProfilePN(update_user._id, update_user.display_name, update_user.image_profile, update_user.username, update_user.theme);
										//notify all of the other apps that profile updated
										PNSHelper.sendToAllAppsUserProfileUpdated(update_user, req.app_id);
										req.user = update_user;
										//send user profile
										res.json(_getUserProfileData(update_user));
									}
								});
							}
							else {
								res.status(400).send({
									type: 'USERNAME_ALREADY_REGISTERED',
									description: 'username already registered.'
								});
							}
						});
					}
					else {
						res.status(400).send({type: 'INVALID_USERNAME', description: 'INVALID_USERNAME'});
					}
				}
				else {
					//do nothing with user name, but update other fields
					user.display_name = display_name;
					user.locale = locale;
					user.theme = theme;
					user.is_in_sign_up_mode = false;
					user.updated_at = Date.now();
					user.save(function (err, update_user) {
						if (err) {
							res.status(500).send({
								type: 'INTERNAL_SERVER_ERROR',
								description: 'Internal server error'
							});
						}
						else {
							//notify friend that this user profile change it
							PNSHelper.sendFriendUpdateProfilePN(update_user._id, update_user.display_name, update_user.image_profile, update_user.username, update_user.theme);
							//notify all of the other apps that profile updated
							PNSHelper.sendToAllAppsUserProfileUpdated(update_user, req.app_id);
							req.user = update_user;
							//send user profile
							res.json(_getUserProfileData(update_user));
						}
					});
				}
			}
			else {
				res.status(400).send({type: 'LOCALE_FIELD_IS_EMPTY', description: 'locale field is empty'});
			}

		}
		else {
			res.status(400).send({type: 'DISPLAY_NAME_FIELD_IS_EMPTY', description: 'display name field is empty'});
		}
	}
	else {
		res.status(400).send({type: 'THEME_FIELD_IS_EMPTY', description: 'Theme field is empty'});
	}
};

/**
 * get uploaded image profile
 * @param req request
 * @param res response
 */
exports.updateImageProfile = function (req, res) {
	var user = req.user;
	var flake_id_gen = new flakeId();
	var file_name = intformat(flake_id_gen.next(), 'dec');
	var form = new formidable.IncomingForm();
	form.maxFilesSize = 4 * 1024 * 1024;
	form.uploadDir = global.__tmp_upload_dir;
	form.type = true;
	form.parse(req);
	form.on('error', function () {
		res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
	});
	form.on('end', function (fields, files) {
		//temporary location of our uploaded file
		var tmp_uploaded_file = this.openedFiles[0].path;
		imageTools.saveImageMedia('profile', tmp_uploaded_file, file_name, function (err, info, route_name) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				//remove previous image if is not default one
				if (user.image_profile.file_name !== default_image_profile.file_name) {
					//remove it
					imageTools.removeImageMediaWithOutCallback(user.image_profile.route, user.image_profile.file_name, '.jpeg');
				}
				var new_image_profile = {
					file_name: file_name,
					width: info.width,
					height: info.height,
					route: route_name
				};
				user.image_profile = new_image_profile;
				user.updated_at = Date.now();
				user.save(function (err, update_user) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else {
						//notify friend that this user profile change it
						PNSHelper.sendFriendUpdateProfilePN(update_user._id, update_user.display_name, update_user.image_profile, update_user.username, update_user.theme);
						//notify all of the other apps that profile updated
						PNSHelper.sendToAllAppsUserProfileUpdated(update_user, req.app_id);
						req.user = update_user;
						//send user profile JSON data
						res.json(_getUserProfileData(update_user));
					}
				});
			}
		});
	});
};

/**
 * delete current image profile and set to default one
 * @param req request
 * @param res response
 */
exports.deleteImageProfile = function (req, res) {
	var user = req.user;
	//set default image profile
	if (user.image_profile.file_name !== default_image_profile.file_name) {
		//remove the image profile file
		imageTools.removeImageMedia(user.image_profile.route, user.image_profile.file_name, '.jpeg', function (err) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				user.image_profile = default_image_profile;
				user.updated_at = Date.now();
				user.save(function (err, update_user) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else {
						//notify friend that this user profile change it
						PNSHelper.sendFriendUpdateProfilePN(update_user._id, update_user.display_name, update_user.image_profile, update_user.username, update_user.theme);
						//notify all of the other apps that profile updated
						PNSHelper.sendToAllAppsUserProfileUpdated(update_user, req.app_id);
						req.user = update_user;
						//send user profile json data
						res.json(_getUserProfileData(update_user));
					}
				});
			}
		});
	}
	else {
		res.json(_getUserProfileData(user));
	}
};

/**
 * terminate trusted app by app_id
 * @param req request
 * @param res response
 * URL param is >>
 * app_id >> the trusted_app id
 */
exports.terminateAppById = function (req, res) {
	var trusted_app_id = req.params.app_id;
	User.update({_id: req.user._id}, {$pull: {'trusted_apps': {_id: trusted_app_id}}}, function (err) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			//remove access token with this trusted_app_id and user_id
			AccessToken.remove({_user: req.user._id, _trusted_app: trusted_app_id}, function (err) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					res.send({
						type: 'TERMINATED_SUCCESSFULLY', description: 'Terminated successfully'
					});
				}
			});
		}
	});
};

/**
 * delete user account from telepathy
 * @param req request
 * @param res response
 */
exports.deleteUserAccount = function (req, res) {
	var userId = req.user._id;
	var imageProfile = req.user.image_profile;
	//get all device pns information to send pn that should terminate this application
	var pns_token_of_other_apps = _getInformationForPNSOfUserTrustedApps(req.user.trusted_apps, req.app_id);
	//first delete all friend with this
	FriendHelper.deleteAllFriendsWhenUserDeleted(userId, function (err) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			//remove all telepathies
			TelepathyHelper.deleteAllTelepathiesWhenUserDeleted(userId, function (err) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					//remove all messages
					MessageHelper.deleteAllOfTheUserMessageWhenUserDeleted(userId, function (err) {
						if (err) {
							res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
						}
						else {
							//finally delete this user
							User.findOneAndRemove({_id: userId}, function (err) {
								if (err) {
									res.status(500).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: 'Internal server error'
									});
								}
								else {
									//inform with web hooks that this user delete account
									WebHooksHelper.sendWebHookWhenUserDeleteUserAccount(req.user.username, req.user.email, req.user.display_name);
									//get all pns information of users that have this user as friend
									FriendHelper.getListUserPNSInformationThatHaveThisUserAsFriend(userId, function (err, pns_token_list, pnsResultInfo) {
										if (!err) {
											FriendHelper.removeAllFriendRelationWhenUserDeleted(userId, function (err) {
												if (!err) {
													if (pns_token_list.length > 0) {
														//send PN to all user that should remove this user as friend
														PNSHelper.sendToAllFriendsAndInformThisUserAccountDeleted(userId, pns_token_list);
													}
												}
											});
										}
									});
									//remove the image profile file if not default one
									if (imageProfile.file_name !== default_image_profile.file_name) {
										imageTools.removeImageMedia(imageProfile.route, imageProfile.file_name, '.jpeg', function (err) {
										});
									}
									//remove all of the access tokens
									AccessToken.remove({_user: userId}, function (err) {
									});
									//send terminate pn to all other trusted apps
									if (pns_token_of_other_apps.length > 0) {
										PNSHelper.sendToAllAppsToTerminateApplication(pns_token_of_other_apps);
									}
									req.user = null;
									res.send({
										type: 'ACCOUNT_DELETE_SUCCESSFULLY',
										description: 'Account delete successfully'
									});
								}
							});
						}
					});
				}
			});
		}
	});
};

/**
 * register device when authorized user
 * @param req request
 * @param res response
 */
exports.registerDevice = function (req, res) {
	var user = req.user;
	var app_id = req.app_id;
	var token_type = req.body.token_type;
	var token = req.body.token;
	var device_model = req.body.device_model;
	var os_version = req.body.os_version;
	var app_version = req.body.app_version;
	if (token_type) {
		if (token_type === 'GCM_ANDROID' || token_type === 'GCM_IOS') {
			if (token) {
				if (device_model && os_version && app_version && app_id) {
					//pull any trusted application with this message_token
					//update information in trusted app
					User.update({'trusted_apps._id': app_id, _id: user._id}, {
						$set: {
							'trusted_apps.$.device_model': device_model,
							'trusted_apps.$.os_version': os_version,
							'trusted_apps.$.app_version': app_version,
							'trusted_apps.$.message_token_type': token_type,
							'trusted_apps.$.message_token': token
						}
					}, function (err) {
						if (err) {
							res.status(500).send({
								type: 'INTERNAL_SERVER_ERROR',
								description: 'Internal server error'
							});
						}
						else {
							res.send({
								type: 'REGISTER_SUCCESSFULLY', description: 'Device register successfully'
							});
						}
					});
				}
				else {
					res.status(400).send({
						type: 'DEVICE_INFORMATION_IS_EMPTY',
						description: 'Device information like device_model, os_version, app_version is empty'
					});
				}
			}
			else {
				res.status(400).send({type: 'TOKEN_FIELD_IS_EMPTY', description: 'Token field is empty'});
			}
		}
		else {
			res.status(400).send({type: 'TOKEN_TYPE_IS_NOT_VALID', description: 'Token type is not valid'});
		}
	}
	else {
		res.status(400).send({type: 'TOKEN_TYPE_FIELD_IS_EMPTY', description: 'Token type field is empty'});
	}
};

/**
 * search in users by display name
 * @param req request
 * @param res response
 * queries >
 * q
 */
exports.searchUsers = function (req, res) {
	var query = req.query.q;
	var user = req.user;
	var result = [];
	if (query) {
		query = query.replace('@', '');
		User.find({
				$or: [{
					$text: {$search: query},
					roles: ['user']
				}, {username: {$regex: '.*' + query + '.*'}}]
			}
		)
			.select({score: {$meta: 'textScore'}})
			.select('username display_name image_profile theme')
			.sort({score: {$meta: 'textScore'}})
			.exec(function (err, users) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					users.forEach(function (user) {
						result.push(_getUserData(user));
					});
					res.send(result);
				}
			});
	}
	else {
		res.send(result);
	}
};

/**
 * find user with the username
 * @param req request
 * @param res response
 *
 * the URL params
 * username >> the unique username of user
 */
exports.findUser = function (req, res) {
	var userid = req.params.userid;
	if (userid) {
		//find user with this username
		User.findOne({_id: userid}, function (err, user) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (user) {
				res.send(_getUserData(user));
			}
			else {
				res.status(404).send({type: 'USER_NOT_FOUND', description: 'Not found any user with this user id'});
			}
		});
	}
	else {
		res.status(400).send({type: 'USER_ID_PARAM_IS_EMPTY', description: 'User id params is empty'});
	}
};


/**
 * get list of Trusted Application PNS information
 * such as app_pns_type nad app_pns_token for sending push notification
 * @param userId userId
 * @param Callback callback function when got result with this args (err,pns_token_list,list_of_app_Info);
 */
exports.getInformationForPNSByUserId = function (userId, Callback) {
	var pns_token_list = [];
	User.findOne({_id: userId}, 'trusted_apps.message_token_type trusted_apps.message_token', function (err, user) {
		if (err) {
			new Callback(err);
		}
		else if (user) {
			user.trusted_apps.forEach(function (trusted_app) {
				pns_token_list.push(trusted_app.message_token);
			});
			new Callback(null,
				pns_token_list,
				user.trusted_apps);
		}
		else {
			new Callback('not found any user with this id');
		}
	});
};

/**
 * terminate trusted app that get NotRegistered error in sending PNS
 * so should remove it from trusted_apps
 * @param pns_token_message
 */
exports.removeTrustedAppByPNSToken = function (user_id, pns_token_message) {
	User.update({_id: user_id}, {$pull: {'trusted_apps': {message_token: pns_token_message}}}, function (err) {
	});
};
