'use strict';

/**
 * Module dependencies.
 * ip range model
 */
var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

/**
 * IP range Schema
 */
var IPRangeSchema = new Schema({
	ip_start: Number,
	ip_end: Number,
	country_code: String,
	country_name: String
});

IPRangeSchema.index({ip_start: 1, ip_end: 1});

mongoose.model('iprange', IPRangeSchema);
