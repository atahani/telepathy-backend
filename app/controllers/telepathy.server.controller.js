'use strict';

/**
 * Module dependencies.
 * controller for user friend to add friend and manage it
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Telepathy = mongoose.model('Telepathy'),
	Message = mongoose.model('Message'),
	MessageHelper = require('../controllers/message.server.controller'),
	UserHelper = require('../controllers/users/users.app.server.controller'),
	PNSHelper = require('../../config/pns_helper.js'),
	moment = require('moment');


/**
 * build Telepathy JSON
 * @param to_user to user information
 * @param body_send body_send
 * @param body_receive body_receive
 * @param created_at created_at
 * @param expire_at expire_at
 * @returns {{to_user: *, body_send: *, body_receive: *, created_at: *, expire_at: *}}
 */
var _buildTelepathy = function (id, to_user, body, created_at, expire_at) {
	return {
		id: id,
		to_user: UserHelper.getUserData(to_user),
		body: body,
		created_at: created_at,
		expire_at: expire_at
	};
};

/**
 * publish telepathy
 * @param req request
 * @param res response
 */
exports.publish = function (req, res) {
	var user = req.user;
	var to_user = req.body.to_user;
	var body = req.body.body;
	var expire_in_min = req.body.expire_in_min;
	//check values
	if (to_user) {
		if (body && body !== '') {
			if (expire_in_min && !isNaN(expire_in_min)) {
				//first is there any telepathy with this receiver
				Telepathy.findOne({
					from_user: to_user,
					to_user: user._id
				}, {}, {sort: {'created_at': 1}}, function (err, telepathy) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else if (telepathy) {
						//so telepathy reach at oldest one
						//save first telepathy as message
						var created_at = moment(telepathy.created_at);
						var matched_at = moment(Date.now());
						var matched_in_sec = matched_at.diff(created_at, 'seconds');
						MessageHelper.createMessage(to_user, true, user._id, telepathy.body, body, telepathy._id, matched_in_sec, function (err, message_first) {
							if (err) {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
							else {
								MessageHelper.createMessage(user._id, false, to_user, body, telepathy.body, telepathy._id, matched_in_sec, function (err, message_second) {
									if (err) {
										res.status(500).send({
											type: 'INTERNAL_SERVER_ERROR',
											description: 'Internal server error'
										});
									}
									else {
										//after all remove matched telepathy
										telepathy.remove();
										//send push notification to first user that send telepathy
										PNSHelper.sendTelepathyPN(to_user, user._id, user.username, user.display_name, user.image_profile, user.theme, message_first.matched_with_telepathy_id, message_first._id, message_first.body_receive, message_first.matched_at, message_first.matched_in_sec);
										//send to all trusted app that have this new message
										PNSHelper.sendToAllAppsGotNewUserMessage(user._id, user.trusted_apps, req.app_id, message_second._id);
										//send result of telepathy that match
										res.json({
											'is_match': true,
											'telepathy': null,
											'message': MessageHelper.buildMessage(
												message_second._id,
												message_second.to_user,
												message_second.body_send,
												message_second.body_receive,
												message_second.is_first,
												message_second.matched_with_telepathy_id,
												message_second.matched_at,
												message_second.matched_in_sec,
												message_second.is_receive,
												message_second.is_read,
												message_second.is_send_read_signal,
												message_second.updated_at)
										});
									}
								});
							}
						});
					}
					else {
						//publish this telepathy with this information
						var now_date_time = new Date();
						var expire_at = new Date(now_date_time.getTime() + expire_in_min * 60000);
						var newTelepathy = new Telepathy({
							from_user: user._id,
							to_user: to_user,
							body: body,
							expire_at: expire_at
						});
						newTelepathy.save(function (err) {
							if (err) {
								res.status(500).send({
									type: 'INTERNAL_SERVER_ERROR',
									description: 'Internal server error'
								});
							}
							else {
								//populate with user to get user_with information such as display_name and username
								Telepathy.populate(newTelepathy, {
									path: 'to_user',
									select: 'username display_name image_profile theme'
								}, function (err, telepathy_p) {
									if (err) {
										res.status(500).send({
											type: 'INTERNAL_SERVER_ERROR',
											description: 'Internal server error'
										});
									}
									else {
										//send PN to all other trusted apps that new telepathy send it
										PNSHelper.sendToAllAppsNewTelepathySendIt(user._id, user.trusted_apps, req.app_id, telepathy_p._id);
										//send result of telepathy that is not match
										res.json({
											'is_match': false,
											'telepathy': _buildTelepathy(
												telepathy_p._id,
												telepathy_p.to_user,
												telepathy_p.body,
												telepathy_p.created_at,
												telepathy_p.expire_at),
											'message': null
										});
									}
								});
							}
						});
					}
				});
			}
			else {
				res.status(400).send({
					type: 'EXPIRE_IN_MIN_IS_NOT_VALID',
					description: 'Expire duration in minute is not valid'
				});
			}
		}
		else {
			res.status(400).send({type: 'BODY_MESSAGE_IS_EMPTY', description: 'Message body is empty'});
		}
	}
	else {
		res.status(400).send({type: 'USER_TO_PARAM_IS_EMPTY', description: 'User to id is empty'});
	}
};

/**
 * Disappear telepathy by user
 * @param req request
 * @param res response
 * param >>
 * telepathy_id >> the telepathy that wants to remove it
 */
exports.disappear = function (req, res) {
	var user = req.user;
	var telepathy_id = req.params.telepathy_id;
	if (telepathy_id) {
		Telepathy.findOneAndRemove({from_user: user._id, _id: telepathy_id}, function (err) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				//send PN to all of other app that this telepathy has been deleted
				PNSHelper.sendToAllAppsTelepathyDeleteIt(user._id, user.trusted_apps, req.app_id, telepathy_id);
				res.send({
					type: 'REMOVED_SUCCESSFULLY', description: 'Removed successfully'
				});
			}
		});
	}
	else {
		res.status(400).send({type: 'TELEPATHY_ID_PARAM_IS_EMPTY', description: 'Telepathy id param is empty'});
	}
};


/**
 * get telepathy by id
 * param >>
 * telepathy_id >> the telepathy that wants to remove it
 * @param req request
 * @param res response
 */
exports.getTelepathyById = function (req, res) {
	var user = req.user;
	var telepathy_id = req.params.telepathy_id;
	if (telepathy_id) {
		Telepathy.findOne({from_user: user._id, _id: telepathy_id}).populate({
			path: 'to_user', select: 'username display_name image_profile theme'
		})
			.exec(function (err, telepathy) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else if (telepathy) {
					res.send(_buildTelepathy(telepathy._id, telepathy.to_user, telepathy.body, telepathy.created_at, telepathy.expire_at));
				}
				else {
					res.status(404).send({
						type: 'TELEPATHY_WITH_THIS_ID_NOT_FOUND',
						description: 'Telepathy with this id not found'
					});
				}
			});
	}
	else {
		res.status(400).send({type: 'TELEPATHY_ID_PARAM_IS_EMPTY', description: 'Telepathy id param is empty'});
	}
};

/**
 * get telepathies base on query strings
 *
 * @param req request
 * @param res response
 * query strings are >>>>>
 *
 * page >> the page number the default is 1
 * per_page >> the item for each page for limit result the default is 15
 * to_user_id >> filter by user id
 * q >> the query text search on body filed
 */
exports.getTelepathies = function (req, res) {
	var telepathiesResult = [];
	var query = Telepathy.find({from_user: req.user._id});
	var query_without_limit = Telepathy.find({from_user: req.user._id});
	var per_page = 15;
	var page = 1;
	if (req.query.per_page && !isNaN(req.query.per_page)) {
		per_page = Number(req.query.per_page);
	}
	if (req.query.page && !isNaN(req.query.page)) {
		page = Number(req.query.page);
	}
	if (req.query.to_user_id) {
		query.where({'to_user': req.query.to_user_id});
		query_without_limit.where({'to_user': req.query.to_user_id});
	}
	if (req.query.q) {
		query.where({$text: {$search: req.query.q}});
		query_without_limit.where({$text: {$search: req.query.q}});
	}
	query.limit(per_page).skip(per_page * (page - 1));
	query.sort({'expire_at': 1});
	query.populate({path: 'to_user', select: 'username display_name image_profile theme'});
	query.exec(function (err, telepathies) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			query_without_limit.count(function (err, total) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					telepathies.forEach(function (telepathy) {
						telepathiesResult.push(_buildTelepathy(telepathy.id, telepathy.to_user, telepathy.body, telepathy.created_at, telepathy.expire_at));
					});
					res.json({
						'data': telepathiesResult,
						'page': page,
						'total': total
					});
				}
			});
		}
	});
};

/**
 * delete all telepathies when user deleted
 * @param userId
 * @param Callback
 */
exports.deleteAllTelepathiesWhenUserDeleted = function (userId, Callback) {
	Telepathy.remove({from_user: userId}, function (err) {
		new Callback(err);
	});
};
