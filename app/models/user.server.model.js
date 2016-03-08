'use strict';

/**
 * Module dependencies.
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema,
	crypto = require('crypto');

/**
 * A Validation function for local strategy properties
 */
var validateLocalStrategyProperty = function (property) {
	return ((this.provider !== 'local' && !this.updated) || property.length);
};

/**
 * A Validation function for local strategy password
 */
var validateLocalStrategyPassword = function (password) {
	return (this.provider !== 'local' || (password && password.length > 6));
};

/**
 * User Schema
 */
var UserSchema = new Schema({
	username: {
		type: String,
		unique: 'Username already exists',
		trim: true
	},
	display_name: {
		type: String,
		trim: true,
		default: '',
		validate: [validateLocalStrategyProperty, 'Please fill in your name']
	},
	email: {
		type: String,
		trim: true,
		default: '',
		validate: [validateLocalStrategyProperty, 'Please fill in your email'],
		match: [/.+\@.+\..+/, 'Please fill a valid email address']
	},
	password: {
		type: String,
		default: '',
		validate: [validateLocalStrategyPassword, 'Password should be longer']
	},
	salt: {
		type: String
	},
	image_profile: {
		type: {
			file_name: String,
			width: Number,
			height: Number,
			route: String
		}
	},
	provider: {
		type: String,
		required: 'Provider is required'
	},
	provider_data: {},
	additional_providers_data: {},
	roles: {
		type: [{
			type: String,
			enum: ['user', 'admin']
		}],
		default: ['user']
	},
	locale: {
		type: String,
		enum: ['en', 'fa'],
		default: 'en'
	},
	theme: {
		type: String,
		enum: ['purple_theme', 'red_theme', 'green_theme', 'blue_theme', 'indigo_theme', 'grey_theme', 'brown_theme'],
		default: 'indigo_theme'
	},
	third_parties: [{
		provider_id: {
			type: String,
			required: true
		},
		provider: {
			type: String,
			enum: ['google'],
			required: true
		},
		granted_at: {
			type: Date,
			default: Date.now
		}
	}],
	trusted_apps: [{
		_client: {
			type: Schema.ObjectId,
			ref: 'Client',
			required: true
		},
		refresh_token: {
			type: String,
			required: true
		},
		device_model: String,
		os_version: String,
		app_version: String,
		message_token_type: {
			type: String,
			enum: ['GCM_ANDROID', 'GCM_IOS']
		},
		message_token: String,
		granted_at: {
			type: Date,
			default: Date.now
		}
	}],
	is_in_sign_up_mode: {
		type: Boolean,
		default: true
	},
	lock_status: {
		type: Boolean,
		default: false
	},
	locked_at: {
		type: Date
	},
	updated_at: {
		type: Date
	},
	created_at: {
		type: Date,
		default: Date.now
	},
	/* For reset password if register via email */
	reset_password_token: {
		type: String
	},
	reset_password_expires: {
		type: Date
	}
});

/**
 * Hook a pre save method to hash the password
 */
UserSchema.pre('save', function (next) {
	if (this.password && this.password.length > 6) {
		this.salt = crypto.randomBytes(16).toString('base64');
		this.password = this.hashPassword(this.password);
	}
	next();
});

/**
 * Create instance method for hashing a password
 */
UserSchema.methods.hashPassword = function (password) {
	if (this.salt && password) {
		return crypto.pbkdf2Sync(password, new Buffer(this.salt, 'base64'), 10000, 64).toString('base64');
	} else {
		return password;
	}
};

/**
 * Create instance method for authenticating user
 */
UserSchema.methods.authenticate = function (password) {
	return this.password === this.hashPassword(password);
};

/**
 * Find possible not used username
 */
UserSchema.statics.findUniqueUsername = function (username, suffix, callback) {
	var _this = this;
	var possibleUsername = username + (suffix || '');

	_this.findOne({
		username: possibleUsername
	}, function (err, user) {
		if (!err) {
			if (!user) {
				callback(possibleUsername);
			} else {
				return _this.findUniqueUsername(username, (suffix || 0) + 1, callback);
			}
		} else {
			callback(null);
		}
	});
};


UserSchema.index({display_name: 'text'});

mongoose.model('User', UserSchema);
