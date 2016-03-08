'use strict';

/**
 * This is the V1 API version for clients
 * the API endpoint is http://telepathy.mobi/api/v1
 **/

var User = require('../../app/controllers/users/users.app.server.controller'),
	Client = require('../../app/controllers/client.server.controller'),
	Friend = require('../../app/controllers/friend.server.controller'),
	Telepathy = require('../../app/controllers/telepathy.server.controller'),
	Message = require('../../app/controllers/message.server.controller');

module.exports = function (app) {

	//Authenticate and register device
	app.route('/api/v1/signin').post(Client.hasAuthorizationToAPI, User.signInOrSignUp);
	app.route('/api/v1/oauth/refreshtoken').post(Client.hasAuthorizationToAPI, User.refreshToken);
	app.route('/api/v1/register/device').post(User.apiReqAuthorization, User.registerDevice);

	//user information and profile settings
	app.route('/api/v1/user/username/check').post(User.apiReqAuthorization, User.checkUsernameAvailability);
	app.route('/api/v1/user/profile').get(User.apiReqAuthorization, User.getUserProfile);
	app.route('/api/v1/user/profile').post(User.apiReqAuthorization, User.updateProfile);
	app.route('/api/v1/user/account').delete(User.apiReqAuthorization, User.deleteUserAccount);
	app.route('/api/v1/user/profile/image').post(User.apiReqAuthorization, User.updateImageProfile);
	app.route('/api/v1/user/profile/image').delete(User.apiReqAuthorization, User.deleteImageProfile);
	app.route('/api/v1/user/app/:app_id').delete(User.apiReqAuthorization, User.terminateAppById);
	app.route('/api/v1/user/search').get(User.apiReqAuthorization, User.searchUsers);
	app.route('/api/v1/user/:userid').get(User.apiReqAuthorization, User.findUser);


	//Friends API routes
	app.route('/api/v1/friends/:user_id').get(User.apiReqAuthorization, Friend.read);
	app.route('/api/v1/friends/:user_id').post(User.apiReqAuthorization, Friend.create);
	app.route('/api/v1/friends/:user_id').delete(User.apiReqAuthorization, Friend.remove);
	app.route('/api/v1/friends').get(User.apiReqAuthorization, Friend.find);

	//Telepathy API routes
	app.route('/api/v1/telepathy').post(User.apiReqAuthorization, Telepathy.publish);
	app.route('/api/v1/telepathy').get(User.apiReqAuthorization, Telepathy.getTelepathies);
	app.route('/api/v1/telepathy/:telepathy_id').get(User.apiReqAuthorization, Telepathy.getTelepathyById);
	app.route('/api/v1/telepathy/:telepathy_id').delete(User.apiReqAuthorization, Telepathy.disappear);

	// Message API routes
	app.route('/api/v1/message/classify').get(User.apiReqAuthorization, Message.getClassifyMessages);
	app.route('/api/v1/message').get(User.apiReqAuthorization, Message.getMessages);
	app.route('/api/v1/message').delete(User.apiReqAuthorization, Message.deleteMessagesByUserId);
	app.route('/api/v1/message/read').patch(User.apiReqAuthorization, Message.patchMessageAsRead);
	app.route('/api/v1/message/receive').patch(User.apiReqAuthorization, Message.patchMessageAsReceive);
	app.route('/api/v1/message/:message_id').get(User.apiReqAuthorization, Message.getSingleMessageById);
	app.route('/api/v1/message/:message_id').delete(User.apiReqAuthorization, Message.deleteMessageById);

};
