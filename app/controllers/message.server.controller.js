'use strict';

/**
 * Module dependencies.
 * controller for user friend to add friend and manage it
 */
var _ = require('lodash'),
	mongoose = require('mongoose'),
	User = mongoose.model('User'),
	Message = mongoose.model('Message'),
	PNSHelper = require('../../config/pns_helper.js');

/**
 * used for build single message in JSON format to send user
 * @param message_id
 * @param to_user
 * @param body_send
 * @param body_receive
 * @param you_are_first
 * @param matched_with_telepathy_id
 * @param matched_at
 * @param matched_in_sec
 * @param is_receive
 * @param is_read
 * @param is_send_read_signal
 * @param updated_at
 */
var _buildMessage = function (message_id, to_user_id, body_send, body_receive, you_are_first, matched_with_telepathy_id, matched_at, matched_in_sec, is_receive, is_read, is_send_read_signal, updated_at) {
	return {
		id: message_id,
		with_user_id: to_user_id,
		body_send: body_send,
		body_receive: body_receive,
		you_are_first: you_are_first,
		matched_with_telepathy_id: matched_with_telepathy_id,
		matched_at: matched_at,
		matched_in_sec: matched_in_sec,
		is_receive: is_receive,
		is_read: is_read,
		is_send_read_signal: is_send_read_signal,
		updated_at: updated_at
	};
};


/**
 * used for build classify message in JSON format
 * the last message of user with message count from this user
 * @param last_message last message
 * @param to_user to_user object
 * @param message_count number of message with this user
 * @returns {{last_message: *, with_user: (*|{user_id, username, display_name, image_url, theme}), message_count: *}}
 * @private
 */
var _buildClassifyMessage = function (last_message, with_user_id, to_user_object, message_count) {
		return {
			last_message: {
				id: last_message._id,
				with_user_id: with_user_id,
				body_send: last_message.body_send,
				body_receive: last_message.body_receive,
				you_are_first: last_message.is_first,
				matched_with_telepathy_id: last_message.matched_with_telepathy_id,
				matched_at: last_message.matched_at,
				matched_in_sec: last_message.matched_in_sec,
				is_receive: last_message.is_receive,
				is_read: last_message.is_read,
				is_send_read_signal: last_message.is_send_read_signal,
				updated_at: last_message.updated_at
			},
			with_user: to_user_object ? {
				user_id: to_user_object._id,
				username: to_user_object.username,
				display_name: to_user_object.display_name,
				image_url: global.__media_end_point + to_user_object.image_profile.route + '/200/h/' + to_user_object.image_profile.file_name + '.jpeg',
				theme: to_user_object.theme
			} : null,
			message_count: message_count
		};
	}
	;
/**
 * used in telepathy controller
 * return JSON object
 */
exports.buildMessage = _buildMessage;


/**
 * NOTE : used as HELPER in telepathy controller
 * create message with these information
 * @param user_id user id
 * @param is_first is user first send telepathy
 * @param to_user the receiver user id
 * @param body_send String body send
 * @param body_receive  String body receive
 * @param matched_with_telepathy_id the telepathy id that matched with it
 * @param matched_in_sec matched duration in sec
 * @param Callback when create done
 */
exports.createMessage = function (user_id, is_first, to_user_id, body_send, body_receive, matched_with_telepathy_id, matched_in_sec, Callback) {
	var NewMessage = new Message({
		_user: user_id,
		is_first: is_first,
		to_user: to_user_id,
		body_send: body_send,
		body_receive: body_receive,
		matched_with_telepathy_id: matched_with_telepathy_id,
		matched_in_sec: matched_in_sec
	});
	NewMessage.save(function (err, message) {
		new Callback(err, message);
	});
};

/**
 * set is_receive and receive_at and updated_at in from_user message and send PN to from_user
 * @param req request
 * @param res response
 * query strings >>
 * from_user_id >> the message is from user_id
 * matched_with_telepathy_id >> the matched_with_telepathy_id to find message
 */
exports.patchMessageAsReceive = function (req, res) {
	var matched_with_telepathy_id = req.query.matched_with_telepathy_id;
	var from_user_id = req.query.from_user_id;
	if (matched_with_telepathy_id && from_user_id) {
		//find and update the is_receive and receive_at attr
		Message.findOneAndUpdate({
			_user: from_user_id,
			matched_with_telepathy_id: matched_with_telepathy_id
		}, {
			$set: {
				is_receive: true,
				updated_at: new Date()
			}
		}, function (err, message) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (message) {
				//since the message update_at is not update at this time , set updated_at as > new Date() <
				PNSHelper.sendMessageUpdateStatusPN(message._user, message._id, true, false, new Date());
				res.send({
					type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
				});
			}
			else {
				res.send({
					type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
				});
			}
		});
	}
	else {
		res.status(400).send({type: 'REQUEST_QUERIES_ARE_INVALID', description: 'Request queries are invalid'});
	}
};

/**
 * set is_read and read_at in from_user message and send PN to from_user
 * @param req request
 * @param res response
 * query strings >>
 * from_user_id >> the message is from user_id
 * matched_with_telepathy_id >> the matched_with_telepathy_id to message
 */
exports.patchMessageAsRead = function (req, res) {
	var user = req.user;
	var matched_with_telepathy_id = req.query.matched_with_telepathy_id;
	var from_user_id = req.query.from_user_id;
	if (from_user_id) {
		//check is should update one record or not
		if (matched_with_telepathy_id) {
			//find and update the is_read and read_at attr
			Message.findOneAndUpdate({
				_user: from_user_id,
				matched_with_telepathy_id: matched_with_telepathy_id,
				to_user: user._id
			}, {
				$set: {
					is_read: true,
					is_receive: true,
					updated_at: new Date()
				}
			}, function (err, message) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else if (message) {
					//update the other message as is send read signal
					Message.findOneAndUpdate({
						to_user: from_user_id,
						matched_with_telepathy_id: matched_with_telepathy_id,
						_user: user._id
					}, {
						$set: {
							is_send_read_signal: true
						}
					}, function (err) {
						if (err) {
							res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
						}
						else if (message) {
							PNSHelper.sendMessageUpdateStatusPN(message._user, message._id, false, true, new Date());
							res.send({
								type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
							});
						}
						else {
							res.send({
								type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
							});
						}
					});
				}
				else {
					res.send({
						type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
					});
				}
			});
		}
		else {
			//find all of the message with this user as set is_read and read_at attr
			Message.update({
				_user: from_user_id,
				to_user: user._id,
				is_first: false,
				is_read: null
			}, {
				$set: {
					is_read: true,
					is_receive: true,
					updated_at: new Date()
				}
			}, {multi: true}, function (err, result) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else if (result) {
					//update the other message as is send read signal
					Message.update({
						to_user: from_user_id,
						_user: user._id,
						is_first: true,
						is_send_read_signal: null
					}, {
						$set: {
							is_send_read_signal: true
						}
					}, {multi: true}, function (err) {
						if (err) {
							res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
						}
						else {
							//get the last item that updated_at in message
							Message.findOne({
								_user: from_user_id,
								to_user: user._id
							}).sort({updated_at: -1}).exec(function (err) {
								if (err) {
									res.status(500).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: 'Internal server error'
									});
								}
								else {
									//send to all of other apps that all message from this user read it so clear unread indicator
									PNSHelper.sendToAllAppsUserMessageReadByUser(user._id, user.trusted_apps, req.app_id, from_user_id);
									//send read PN
									PNSHelper.sendMessagesReadStatusPN(from_user_id, user._id, new Date());
									res.send({
										type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
									});
								}
							});
						}
					});
				}
				else {
					res.send({
						type: 'UPDATED_SUCCESSFULLY', description: 'Update successfully'
					});
				}
			});
		}
	}
	else {
		res.status(400).send({type: 'REQUEST_QUERIES_ARE_INVALID', description: 'Request queries are invalid'});
	}
};


/**
 * get single message by messageId
 * used when user receive push notification and should get one message and update local DB
 * @param req request
 * @param res response
 * Request Param >>
 * message_id >> String message_id
 */
exports.getSingleMessageById = function (req, res) {
	var user = req.user;
	var message_id = req.params.message_id;
	//get message with populate
	Message.findOne({_user: user._id, _id: message_id})
		.exec(function (err, message_p) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (message_p) {
				//send message to user
				res.send(_buildMessage(
					message_p._id,
					message_p.to_user,
					message_p.body_send,
					message_p.body_receive,
					message_p.is_first,
					message_p.matched_with_telepathy_id,
					message_p.matched_at,
					message_p.matched_in_sec,
					message_p.is_receive,
					message_p.is_read,
					message_p.is_send_read_signal,
					message_p.updated_at
				));
			}
			else {
				res.status(404).send({type: 'MESSAGE_NOT_FOUND', description: 'Not found any message with this id'});
			}
		});
};

/**
 * delete own message by message id
 * params >>
 * message_id >> String of message_id that should be delete it
 * @param req request
 * @param res response
 */
exports.deleteMessageById = function (req, res) {
	var user = req.user;
	var message_id = req.params.message_id;
	if (message_id) {
		//find and remove message
		Message.findOneAndRemove({_user: user._id, _id: message_id}, function (err) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				//send to all of other apps that this message has been delete
				PNSHelper.sendToAllAppsOneMessageDeleteIt(user._id, user.trusted_apps, req.app_id, message_id);
				res.send({
					type: 'REMOVED_SUCCESSFULLY', description: 'Removed successfully'
				});
			}
		});
	}
	else {
		res.status(400).send({type: 'MESSAGE_ID_PARAM_IS_EMPTY', description: 'Message id param is empty'});
	}
};

/**
 * delete all of the messages by user id
 * @param req request
 * @param res response
 * query strings are >>>>>
 *
 * with_user_id >> the messages of with_user_id
 */
exports.deleteMessagesByUserId = function (req, res) {
	var user = req.user;
	if (req.query.with_user_id) {
		Message.remove({_user: user._id, to_user: req.query.with_user_id}, function (err) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else {
				//send PN to all of the trusted apps that all of the message from this user delete it
				PNSHelper.sendToAllAppsUserMessageDelete(user._id, user.trusted_apps, req.app_id, req.query.with_user_id);
				res.send({
					type: 'ALL_OF_THEM_REMOVE_SUCCESSFULLY', description: 'All of them remove successfully'
				});
			}
		});
	}
	else {
		res.status(400).send({type: 'WITH_USER_ID_PARAM_IS_EMPTY', description: 'With user id param is empty'});
	}
};


/**
 * get messages base on query strings
 * query strings are >>>>>
 *
 * page >> the page number the default is 1
 * per_page >> the item for each page to limit result the default is 15
 * with_user_id >> filter by user id
 *
 * @param req request
 * @param res response
 */
exports.getMessages = function (req, res) {
	var user = req.user;
	var result = [];
	var query = Message.find({_user: user._id});
	var query_without_limit = Message.find({_user: user._id});
	var per_page = 15;
	var page = 1;
	if (req.query.per_page && !isNaN(req.query.per_page)) {
		per_page = Number(req.query.per_page);
	}
	if (req.query.page && !isNaN(req.query.page)) {
		page = Number(req.query.page);
	}
	if (req.query.with_user_id) {
		query.where({'to_user': req.query.with_user_id});
		query_without_limit.where({'to_user': req.query.with_user_id});
	}
	query.limit(per_page).skip(per_page * (page - 1));
	query.sort({matched_at: 1});
	query.exec(function (err, message_list) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			query_without_limit.count(function (err, total) {
				if (err) {
					res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
				}
				else {
					message_list.forEach(function (message_p) {
						result.push(_buildMessage(
							message_p._id,
							message_p.to_user,
							message_p.body_send,
							message_p.body_receive,
							message_p.is_first,
							message_p.matched_with_telepathy_id,
							message_p.matched_at,
							message_p.matched_in_sec,
							message_p.is_receive,
							message_p.is_read,
							message_p.is_send_read_signal,
							message_p.updated_at
						));
					});
					res.send({
						'data': result,
						'page': page,
						'total': total
					});
				}
			});
		}
	});
};

/**
 * get classify messages
 * last message of distinct group by to_user
 * @param req request
 * @param res response
 *
 * query strings are >>>>
 * message_last_updated_at >> long of last updated attr from client
 */
exports.getClassifyMessages = function (req, res) {
	var user = req.user;
	var message_last_updated_at = req.query.message_last_updated_at;
	var result = [];
	var query = [];
	if (message_last_updated_at) {
		message_last_updated_at = new Date(message_last_updated_at);
		message_last_updated_at.setSeconds(message_last_updated_at.getSeconds() + 1);
		query.push({'$match': {_user: user._id, matched_at: {'$gte': message_last_updated_at}}});
	}
	else {
		query.push({'$match': {_user: user._id}});
	}
	query.push({'$sort': {'matched_at': -1}});
	query.push({
		'$group': {
			_id: '$to_user',
			messageId: {'$first': '$_id'},
			numberOfMessages: {'$sum': 1}
		}
	});
	Message.aggregate(query, function (err, aggregateResult) {
		if (err) {
			res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
		}
		else {
			var lastMessages = aggregateResult.map(function (doc) {
				return String(doc.messageId);
			});
			var numberOfMessagesForEachUser = aggregateResult.map(function (doc) {
				return doc.numberOfMessages;
			});
			Message.find({_id: {$in: lastMessages}})
				.populate({
					path: 'to_user',
					select: 'username display_name image_profile theme'
				})
				.exec(function (err, message_list) {
					if (err) {
						res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
					}
					else {
						for (var i = 0; i < message_list.length; i++) {
							result.push(_buildClassifyMessage(
								message_list[i],
								message_list[i].populated('to_user'),
								message_list[i].to_user,
								numberOfMessagesForEachUser[i]
							));
						}
						res.send(result);
					}
				});
		}
	});
};

/**
 * delete all of the messages when user deleted account
 * @param userId
 * @param Callback
 */
exports.deleteAllOfTheUserMessageWhenUserDeleted = function (userId, Callback) {
	Message.remove({_user: userId}, function (err) {
		new Callback(err);
	});
};
