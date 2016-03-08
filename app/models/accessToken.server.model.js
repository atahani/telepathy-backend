'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
/**
 * Access Token schema used for save authorize token by API
 * NOTE: these token expire in expire date that specified in model
 */
var AccessTokenSchema = new Schema({
	_client: {
		type: Schema.ObjectId,
		ref: 'Client'
	},
	_user: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	_trusted_app: {
		type: Schema.ObjectId
	},
	token: {
		type: String,
		require: true
	},
	expire_at: {
		type: Date,
		require: true,
		expires: '1s'
	}
});

mongoose.model('AccessToken', AccessTokenSchema);
