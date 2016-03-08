'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * Friend Schema
 */
var FriendSchema = new Schema({
	_user:{
		type:Schema.ObjectId,
		ref:'User',
		required : true
	},
	friend_user:{
		type:Schema.ObjectId,
		ref:'User',
		required : true
	},
	created_at: {
		type: Date,
		default: Date.now
	}
});

//ensure index of schema
FriendSchema.index({_user:1,friend_user:1},{unique:true});

mongoose.model('Friend',FriendSchema);
