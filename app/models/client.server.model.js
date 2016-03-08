'use strict';

/**
 * Module dependencies.
 */
var mongoose=require('mongoose'),
	Schema=mongoose.Schema,
	crypto = require('crypto');

/**
 * Client Schema , the app_id is _id that mongoDB generate automatically
 * the settings for client config like GCM,APNS,MPNS settings have name & value
 */
var ClientSchema=new Schema({
	app_key:{
		type:String,
		unique:true
	},
	title:{
		type:String,
		trim:true,
		required:true
	},
	short_name:{
		type:String,
		trim:true,
		unique:true
	},
	trusted_app:{
		type:Boolean,
		default:false
	},
	_user:{
		type:Schema.ObjectId,
		ref:'User'
	},
	active_status:{
		type:Boolean,
		default:false
	},
	web_address_url:{
		type:String,
		trim:true,
		required:true
	},
	call_back_url:{
		type:String,
		trim:true
	},
	description:{
		type:String,
		trim:true,
		required:true
	},
	app_logo_file_name:{
		type:String
	},
	platform:{
		type:String,
		enum: ['android', 'ios','web','windows_desktop'],
		required:true
	},
	settings:[{
		_id:false,
		name:String,
		value:String
	}],
	created_at: {
		type: Date,
		default: Date.now
	},
	updated_at:{
		type:Date
	}
});

/**
 * Hook a pre save method to generate app_key
 */
ClientSchema.pre('save', function(next) {
	this.app_key=crypto.randomBytes(20).toString('hex');
	next();
});

/**
 * Get hashed App_key for application using
 */
ClientSchema.methods.getAppKey=function(){
	return crypto.createHash('md5').update(this.app_key).digest('hex');
};

/**
 * Check app_key hash and client status
 * @param app_key input
 * @returns {boolean} is valid return true
 */
ClientSchema.methods.isValidAppKey=function(app_key){
	return this.active_status && crypto.createHash('md5').update(this.app_key).digest('hex')===app_key;
};

mongoose.model('Client', ClientSchema);
