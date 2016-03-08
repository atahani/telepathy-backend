'use strict';

/**
 * Module dependencies
 * push notification system helper
 *
 *
 *
 * TYPE of Notification
 * TELEPATHIES_MATCHED           >> 0
 * MESSAGE_RECEIVE               >> 1
 * MESSAGE_READ                  >> 2
 * ALL_USER_MESSAGE_READ         >> 3
 * FRIEND_UPDATE_PROFILE         >> 4
 * USER_PROFILE_UPDATE           >> 5
 * NEW_TELEPATHY_SEND_IT         >> 6
 * TELEPATHY_DELETED             >> 7
 * MESSAGE_DELETED               >> 8
 * USER_MESSAGE_DELETED          >> 9
 * USER_MESSAGE_ALREADY_READ_BY_USER >> 10
 * USER_ADD_AS_FRIEND           >> 11
 * USER_REMOVE_AS_FRIEND        >> 12
 * USER_DELETE                  >> 13
 * TERMINATE_APP                >> 14
 * GOT_USER_MESSAGE             >> 15
 * ADD_YOU_AS_FRIEND            >> 16
 *
 *
 */

var UserHelper = require('../app/controllers/users/users.app.server.controller'),
	FriendHelper = require('../app/controllers/friend.server.controller'),
	gcm = require('node-gcm'),
	config = require('../config/config');


var timeToLive = 1814400; //21 day

/**
 * send PNS to all user apps one by one to check if device NotRegistered any more
 * @param message
 * @param pns_token_of_other_apps
 */
var sendPNSToAllUserApps = function (user_id, message, pns_token_of_other_apps) {
	var sender = new gcm.Sender(config.gcm_api_key);
	pns_token_of_other_apps.forEach(function (pns_token) {
		sender.send(message, pns_token, function (err, result) {
			if (err) {
				console.log(err);
			}
			else {
				console.log(result);
				if (result.results[0].error === 'NotRegistered') {
					//remove this trusted app from server
					UserHelper.removeTrustedAppByPNSToken(user_id, pns_token);
				}
			}
		});
	});
};

/**
 * send Telepathy PNS with GCM notification system for android and ios device
 * @param to_user_id user_id that should send push notification to it
 * @param from_user_id from user id
 * @param from_user_username user username
 * @param from_user_display_name from user display name
 * @param from_user_image_profile from user image profile object
 * @param from_user_theme from user theme
 * @param matched_with_telepathy_id the common fields between two message in DB
 * @param message_id the String messageId that push notification
 * @param telepathy_body String some of message_body
 * @param matched_at Date time matched at
 * @param matched_in_sec the time in sec
 */
exports.sendTelepathyPN = function (to_user_id, from_user_id, from_user_username, from_user_display_name, from_user_image_profile, from_user_theme, matched_with_telepathy_id, message_id, telepathy_body, matched_at, matched_in_sec) {
	//first get PNS information for user
	UserHelper.getInformationForPNSByUserId(to_user_id, function (err, pns_token_list, pnsResultInfo) {
		if (!err && pns_token_list.length > 0) {
			var sender = new gcm.Sender(config.gcm_api_key);
			//create message and send it
			var message = new gcm.Message({
				priority: 'high',
				contentAvailable: true,
				delayWhileIdle: false,
				timeToLive: timeToLive, //21 day
				restrictedPackageName: config.android_app_package_name
			});
			message.addData('type', 0);
			message.addData('matched_with_telepathy_id', matched_with_telepathy_id);
			message.addData('message_id', message_id);
			message.addData('from_user_id', from_user_id);
			message.addData('from_user_username', from_user_username);
			message.addData('from_user_display_name', from_user_display_name);
			message.addData('from_user_image_url', global.__media_end_point + from_user_image_profile.route + '/200/h/' + from_user_image_profile.file_name + '.jpeg');
			message.addData('from_user_theme', from_user_theme);
			message.addData('telepathy_body', telepathy_body);
			message.addData('matched_at', matched_at.getTime());
			message.addData('matched_in_sec', matched_in_sec);
			sender.send(message, pns_token_list, function (err, result) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(result);
				}
			});
		}
	});
};

/**
 * send push notification to notify user that the message receive by user
 * @param to_user_id user_id who got this notification
 * @param message_id message id that receive by other user
 * @param notify_for_receive boolean true when message receive by user
 * @param notify_for_read boolean true when message read by user
 * @param updated_at the date that update message status
 */
exports.sendMessageUpdateStatusPN = function (to_user_id, message_id, notify_for_receive, notify_for_read, updated_at) {
	//first get PNS information for user
	UserHelper.getInformationForPNSByUserId(to_user_id, function (err, pns_token_list) {
		if (!err && pns_token_list.length > 0) {
			var sender = new gcm.Sender(config.gcm_api_key);
			//create message and send it
			var message = new gcm.Message({
				priority: 'high',
				contentAvailable: true,
				delayWhileIdle: false,
				timeToLive: timeToLive, //21 day
				restrictedPackageName: config.android_app_package_name
			});
			if (notify_for_read) {
				message.addData('type', 2);
				message.addData('updated_at', updated_at.getTime());
			}
			else if (notify_for_receive) {
				message.addData('type', 1);
				message.addData('updated_at', updated_at.getTime());
			}
			message.addData('message_id', message_id);
			sender.send(message, pns_token_list, function (err, result) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(result);
				}
			});
		}
	});
};

/**
 * send push notification to notify user that the all of message with this user set as read
 * @param to_user_id user_id who got this notification
 * @param from_user_id set read for all of the message from_user_id
 */
exports.sendMessagesReadStatusPN = function (to_user_id, from_user_id, updated_at) {
	//first get PNS information for user
	UserHelper.getInformationForPNSByUserId(to_user_id, function (err, pns_token_list) {
		if (!err && pns_token_list.length > 0) {
			var sender = new gcm.Sender(config.gcm_api_key);
			//create message and send it
			var message = new gcm.Message({
				priority: 'high',
				contentAvailable: true,
				delayWhileIdle: false,
				timeToLive: timeToLive, //21 day
				restrictedPackageName: config.android_app_package_name
			});
			message.addData('type', 3);
			message.addData('from_user_id', from_user_id);
			message.addData('updated_at', updated_at.getTime());
			sender.send(message, pns_token_list, function (err, result) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(result);
				}
			});
		}
	});
};

/**
 * send push notification after friend profile update
 * client get it and update friend profile in local DB
 * @param updated_user_id user_id from who update profile
 * @param friend_display_name the updated friend display name
 * @param friend_image_profile the friend image profile that updated
 * @param friend_username the friend username that updated
 * @param friend_theme the friend theme
 */
exports.sendFriendUpdateProfilePN = function (updated_user_id, friend_display_name, friend_image_profile, friend_username, friend_theme) {
	//first get all of the user that have this user as friend
	FriendHelper.getListUserPNSInformationThatHaveThisUserAsFriend(updated_user_id, function (err, pns_token_list, pnsResultInfo) {
		if (!err && pns_token_list.length > 0) {
			var sender = new gcm.Sender(config.gcm_api_key);
			//create message and send it
			var message = new gcm.Message({
				priority: 'high',
				contentAvailable: true,
				delayWhileIdle: false,
				timeToLive: timeToLive, //21 day
				restrictedPackageName: config.android_app_package_name
			});
			message.addData('type', 4);
			message.addData('friend_user_id', updated_user_id);
			message.addData('friend_username', friend_username);
			message.addData('friend_display_name', friend_display_name);
			message.addData('friend_image_profile_url', global.__media_end_point + friend_image_profile.route + '/200/h/' + friend_image_profile.file_name + '.jpeg');
			message.addData('friend_theme', friend_theme);
			sender.send(message, pns_token_list, function (err, result) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(result);
				}
			});
		}
	});
};


/**
 * send PN to all of other trusted apps that user profile updated
 * @param user_object_from_request
 * @param current_app_id
 */
exports.sendToAllAppsUserProfileUpdated = function (user_object_from_request, current_app_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_object_from_request.trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 5);
		message.addData('username', user_object_from_request.username);
		message.addData('display_name', user_object_from_request.display_name);
		message.addData('image_profile_url', global.__media_end_point + user_object_from_request.image_profile.route + '/200/h/' + user_object_from_request.image_profile.file_name + '.jpeg');
		message.addData('locale', user_object_from_request.locale);
		message.addData('theme', user_object_from_request.theme);
		sendPNSToAllUserApps(user_object_from_request._id, message, pns_token_of_other_apps);
	}
};

/**
 * send PN to all of other trusted apps that new telepathy send it
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param new_telepathy_id
 */
exports.sendToAllAppsNewTelepathySendIt = function (user_id, user_trusted_apps, current_app_id, new_telepathy_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 6);
		message.addData('new_telepathy_id', new_telepathy_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};


/**
 * send PN to all of other trusted apps to this telepathy has been delete
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param deleted_telepathy_id
 */
exports.sendToAllAppsTelepathyDeleteIt = function (user_id, user_trusted_apps, current_app_id, deleted_telepathy_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 7);
		message.addData('deleted_telepathy_id', deleted_telepathy_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};

/**
 * send PN to all of other trusted app to this message has been delete
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param deleted_message_id
 */
exports.sendToAllAppsOneMessageDeleteIt = function (user_id, user_trusted_apps, current_app_id, deleted_message_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 8);
		message.addData('deleted_message_id', deleted_message_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};

/**
 * send PN to all of other trusted apps to all message from this user has been delete
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param user_id
 */
exports.sendToAllAppsUserMessageDelete = function (user_id, user_trusted_apps, current_app_id, with_user_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 9);
		message.addData('user_id', with_user_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};

/**
 * send PN to all other trusted apps that all message from this user already read it
 * so should set as read and clear unread indicator
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param from_user_id
 */
exports.sendToAllAppsUserMessageReadByUser = function (user_id, user_trusted_apps, current_app_id, from_user_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 10);
		message.addData('user_id', from_user_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};

/**
 * send PN to all other trusted apps that this user added as friend
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param friend_user_id
 * @param friend_username
 * @param friend_display_name
 * @param friend_image_profile
 * @param friend_theme
 */
exports.sendToAllAppsThisUserAddAsFriend = function (user_id, user_trusted_apps, current_app_id, friend_user_id, friend_username, friend_display_name, friend_image_profile, friend_theme) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 11);
		message.addData('friend_user_id', friend_user_id);
		message.addData('friend_username', friend_username);
		message.addData('friend_display_name', friend_display_name);
		message.addData('friend_image_profile_url', friend_image_profile);
		message.addData('friend_theme', friend_theme);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};


/**
 * send PN to all other trusted apps that this user removed as friend
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param friend_user_id
 */
exports.sendToAllAppsThisUserRemoveAsFriend = function (user_id, user_trusted_apps, current_app_id, friend_user_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 12);
		message.addData('friend_user_id', friend_user_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};


/**
 * send PN to all user that have this friend and inform that this user account deleted
 * @param deleted_user_id
 * @param pns_token_list
 */
exports.sendToAllFriendsAndInformThisUserAccountDeleted = function (deleted_user_id, pns_token_list) {
	var sender = new gcm.Sender(config.gcm_api_key);
	//create message and send it
	var message = new gcm.Message({
		priority: 'high',
		contentAvailable: true,
		delayWhileIdle: false,
		timeToLive: timeToLive, //21 day
		restrictedPackageName: config.android_app_package_name
	});
	message.addData('type', 13);
	message.addData('deleted_user_id', deleted_user_id);
	sender.send(message, pns_token_list, function (err, result) {
		if (err) {
			console.log(err);
		}
		else {
			console.log(result);
		}
	});
};


/**
 * send to all trusted apps to terminate application
 *
 * @param pns_token_of_other_apps
 */
exports.sendToAllAppsToTerminateApplication = function (pns_token_of_other_apps) {
	var sender = new gcm.Sender(config.gcm_api_key);
	//create message and send it
	var message = new gcm.Message({
		priority: 'high',
		contentAvailable: true,
		delayWhileIdle: false,
		timeToLive: timeToLive, //21 day
		restrictedPackageName: config.android_app_package_name
	});
	message.addData('type', 14);
	sender.send(message, pns_token_of_other_apps, function (err, result) {
		if (err) {
			console.log(err);
		}
		else {
			console.log(result);
		}
	});
};


/**
 * send to all apps got new user message
 * @param user_id
 * @param user_trusted_apps
 * @param current_app_id
 * @param new_message_id
 */
exports.sendToAllAppsGotNewUserMessage = function (user_id, user_trusted_apps, current_app_id, new_message_id) {
	var pns_token_of_other_apps = UserHelper.getInformationForPNSOfUserTrustedApps(user_trusted_apps, current_app_id);
	if (pns_token_of_other_apps.length > 0) {
		//create message and send it
		var message = new gcm.Message({
			priority: 'high',
			contentAvailable: true,
			delayWhileIdle: false,
			timeToLive: timeToLive, //21 day
			restrictedPackageName: config.android_app_package_name
		});
		message.addData('type', 15);
		message.addData('new_message_id', new_message_id);
		sendPNSToAllUserApps(user_id, message, pns_token_of_other_apps);
	}
};


/**
 * send to all apps that this user added you as friend
 * this PN send when any user add another user as friend
 * this PN inform that user this user as friend, so that user can also add as friend
 * @param to_user_id
 * @param friend_user_id
 * @param friend_username
 * @param friend_display_name
 * @param friend_image_url
 * @param friend_theme
 * @param add_friend_at
 */
exports.informThisUserAddYouAsFriend = function (to_user_id, friend_user_id, friend_username, friend_display_name, friend_image_url, friend_theme, add_friend_at) {
	//first should get pns_token information
	UserHelper.getInformationForPNSByUserId(to_user_id, function (err, pns_token_list, pnsResultInfo) {
		if (!err && pns_token_list.length > 0) {
			var sender = new gcm.Sender(config.gcm_api_key);
			//create message and send it
			var message = new gcm.Message({
				priority: 'high',
				contentAvailable: true,
				delayWhileIdle: false,
				timeToLive: timeToLive, //21 day
				restrictedPackageName: config.android_app_package_name
			});
			//the message TYPE is >> ADD_YOU_AS_FRIEND 16
			message.addData('type', 16);
			//add other information to this message
			message.addData('friend_user_id', friend_user_id);
			message.addData('friend_username', friend_username);
			message.addData('friend_display_name', friend_display_name);
			message.addData('friend_image_url', friend_image_url);
			message.addData('friend_theme', friend_theme);
			message.addData('add_friend_at', add_friend_at.getTime());
			sender.send(message, pns_token_list, function (err, result) {
				if (err) {
					console.log(err);
				}
				else {
					console.log(result);
				}
			});
		}
	});
};



