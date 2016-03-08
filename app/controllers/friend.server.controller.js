'use strict';

/**
 * Module dependencies.
 * controller for user friend to add friend and manage it
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Friend = mongoose.model('Friend'),
	path = require('path'),
	PNSHelper = require('../../config/pns_helper.js');

var _getFriendInfo = function (friend) {
	return {
		user_id: friend.friend_user._id,
		username: friend.friend_user.username,
		display_name: friend.friend_user.display_name,
		image_url: global.__media_end_point + friend.friend_user.image_profile.route + '/200/h/' + friend.friend_user.image_profile.file_name + '.jpeg',
		theme: friend.friend_user.theme
	};
};

/**
 * create new friend for user
 * @param req request
 * @param res response
 * param >>
 * user_id >> the user id of that should be friend
 */
exports.create = function (req, res) {
	var user = req.user;
	//create new friend for authenticate user
	var friend_user_id = req.params.user_id;
	if (friend_user_id && friend_user_id !== user._id) {
		//check is have any user with this id
		User.findById(friend_user_id, function (err, friend_user) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (friend_user) {
				//now create new friend object to register this user as friend
				var friend = new Friend({
					_user: user._id,
					friend_user: friend_user._id
				});
				friend.save(function (err) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else {
						//response this friend
						Friend.populate(friend, {
							path: 'friend_user',
							select: 'username display_name image_profile theme'
						}, function (err, friend) {
							if (err) {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
							else if (friend) {
								//send PN to inform that user this user added you as friend
								PNSHelper.informThisUserAddYouAsFriend(friend.friend_user._id,
									req.user._id,
									req.user.username,
									req.user.display_name,
									global.__media_end_point + req.user.image_profile.route + '/200/h/' + req.user.image_profile.file_name + '.jpeg',
									req.user.theme,
									friend.created_at);
								//send PN to all other apps that this user added as friend sync the other apps
								PNSHelper.sendToAllAppsThisUserAddAsFriend(user._id,
									user.trusted_apps,
									req.app_id,
									friend.friend_user._id,
									friend.friend_user.username,
									friend.friend_user.display_name,
									global.__media_end_point + friend.friend_user.image_profile.route + '/200/h/' + friend.friend_user.image_profile.file_name + '.jpeg',
									friend.friend_user.theme
								);
								res.json(_getFriendInfo(friend));
							}
							else {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
						});
					}
				});
			}
			else {
				res.status(400).send({type: 'USER_ID_IS_NOT_VALID', description: 'Friend user id is not valid'});
			}
		});
	}
	else {
		res.status(400).send({type: 'USER_ID_PARAM_IS_EMPTY', description: 'User id of friend field is empty'});
	}
};

/**
 * read one friend by user_id
 * @param req request
 * @param res response
 * param >>
 * user_id >> the user id of friend that want to get information
 */
exports.read = function (req, res) {
	var user = req.user;
	var friend_user_id = req.params.user_id;
	if (friend_user_id) {
		Friend.findOne({_user: user._id, friend_user: friend_user_id}).populate({
			path: 'friend_user',
			select: 'username display_name image_profile theme'
		}).exec(function (err, friend) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (friend) {
				res.json(_getFriendInfo(friend));
			}
			else {
				res.status(404).send({type: 'USER_NOT_FOUND', description: 'Not found any user with this id'});
			}
		});
	}
	else {
		res.status(400).send({type: 'USER_ID_PARAM_IS_EMPTY', description: 'User id of friend field is empty'});
	}
};

/**
 * remove friend from friends
 * @param req request
 * @param res response
 * param >>
 * user_id >> the user id of friend that should be remove
 */
exports.remove = function (req, res) {
	var user = req.user;
	var friend_user_id = req.params.user_id;
	if (friend_user_id && friend_user_id !== '') {
		//check is there any friend with these info
		Friend.findOneAndRemove({_user: user._id, friend_user: friend_user_id}, function (err) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				//send to all other apps this user removed as friend
				PNSHelper.sendToAllAppsThisUserRemoveAsFriend(user._id, user.trusted_apps, req.app_id, friend_user_id);
				res.send({
					type: 'REMOVED_SUCCESSFULLY', description: 'Removed successfully'
				});
			}
		});
	}
	else {
		res.status(400).send({type: 'USER_ID_PARAM_IS_EMPTY', description: 'User id of friend field is empty'});
	}
};

/**
 * get all of the friend list or search by search_query by display_name fields
 * @param req request
 * @param res response
 * query string >>
 * q >> part of display_name
 */
exports.find = function (req, res) {
	var user = req.user;
	var search_query = req.query.q;
	var db_query = Friend.find({_user: user._id});
	if (search_query) {
		db_query.populate({
			path: 'friend_user',
			select: 'username display_name image_profile theme',
			options: {sort: {display_name: -1}}
		});
	}
	else {
		db_query.populate({
			path: 'friend_user',
			select: 'username display_name image_profile theme',
			match: {display_name: {$regex: '.*' + search_query + '.*'}},
			options: {sort: {display_name: -1}}
		});
	}
	db_query.exec(function (err, friends) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			var result = [];
			friends.forEach(function (friend) {
				result.push(_getFriendInfo(friend));
			});
			res.json(result);
		}
	});
};

/**
 * get List of User PNS Information that have this user as friend
 * used in sendFriendUpdateProfilePN after user updated his/her profile
 * @param friend_user_id user_id from who update profile
 * @param Callback callback function when got result with this args (err,pns_token_list,list_of_app_Info);
 */
exports.getListUserPNSInformationThatHaveThisUserAsFriend = function (friend_user_id, Callback) {
	var pns_token_list = [];
	var list_of_app_Info = [];
	Friend.find({friend_user: friend_user_id}).populate({
		path: '_user',
		select: 'trusted_apps.message_token_type trusted_apps.message_token'
	}).exec(function (err, friends) {
		if (err) {
			new Callback(err);
		}
		else {
			friends.forEach(function (friend) {
				friend._user.trusted_apps.forEach(function (trusted_app) {
					pns_token_list.push(trusted_app.message_token);
				});
				list_of_app_Info.push(friend._user.trusted_apps);
			});
			new Callback(null,
				pns_token_list,
				list_of_app_Info);
		}
	});
};

/**
 * remove all of the friends by userId
 * @param userId
 * @param Callback
 */
exports.deleteAllFriendsWhenUserDeleted = function (userId, Callback) {
	Friend.remove({_user: userId}, function (err) {
		new Callback(err);
	});
};

/**
 * delete all friend relation when user deleted
 * @param deleted_user_id
 * @param Callback
 */
exports.removeAllFriendRelationWhenUserDeleted = function (deleted_user_id, Callback) {
	Friend.remove({friend_user: deleted_user_id}, function (err) {
		new Callback(err);
	});
};
