'use strict';

module.exports = {
	port: 8443,
	db: {
		uri: 'mongodb://telepathy_db/telepathy',
		options: {
			user: '',
			pass: ''
		}
	},
	log: {
		// Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
		format: 'combined',
		// Stream defaults to process.stdout
		// Uncomment to enable logging to a log on the file system
		options: {
			stream: 'access.log'
		}
	},
	assets: {
		lib: {
			css: [],
			js: []
		},
		css: 'public/dist/application.min.css',
		js: 'public/dist/application.min.js'
	}
};
