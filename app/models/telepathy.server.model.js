'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Telepathy Schema
 * NOTE: these telepathy object expire in expire date that introduce in model
 * if two telepathy reach, move to message collection and remove it
 */
var TelepathySchema = new Schema({
	from_user: {
		type: Schema.ObjectId,
		ref: 'User',
		required: true
	},
	to_user: {
		type: Schema.ObjectId,
		ref: 'User',
		required: true
	},
	body: {
		type: String,
		trim: true,
		required: true
	},
	created_at: {
		type: Date,
		default: Date.now
	},
	expire_at: {
		type: Date,
		expires: '0s'
	}
});

TelepathySchema.index({body:'text'});

mongoose.model('Telepathy', TelepathySchema);
