'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Message Schema
 * after two telepathy reach, telepathy content move to messages
 */
var MessageSchema = new Schema({
	_user: {
		type: Schema.ObjectId,
		ref: 'User',
		required: true
	},
	is_first: {
		type: Boolean,
		default: false
	},
	to_user: {
		type: Schema.ObjectId,
		ref: 'User',
		required: true
	},
	body_send: {
		type: String,
		trim: true,
		required: true
	},
	body_receive: {
		type: String,
		trim: true,
		required: true
	},
	matched_with_telepathy_id: {
		type: String,
		required: true
	},
	matched_in_sec: {
		type: Number,
		required: true
	},
	matched_at: {
		type: Date,
		default: Date.now
	},
	is_receive: {
		type: Boolean
	},
	is_read: {
		type: Boolean
	},
	is_send_read_signal: {
		type: Boolean
	},
	updated_at: {
		type: Date,
		default: Date.now
	}
});

MessageSchema.index({body_send: 'text', body_receive: 'text'});

mongoose.model('Message', MessageSchema);
