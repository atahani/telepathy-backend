'use strict';

module.exports = {
	db: {
		uri: 'mongodb://telepathy_db/telepathy',//connection of mongodb database, use telepathy_db since we deploy with docker !
		options: {
			user: '',
			pass: ''
		}
	},
	media_end_point: 'https://domain.com/media/i/',// the endpoint of media used in JSON
	//TODO: GCM information in production mode
	gcm_api_key: '', // the GCM API key that got you from google
	sender_id: '', // the sender id in GCM information
	android_app_package_name: '',//android package name like com.atahani.telepathy
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
		css: [],
		js: []
	},
	intro_website: {
		css: [
			'public/dist/intro_styles.min.css'
		],
		js: [
			'public/lib/retina.js/dist/retina.min.js',
			'public/lib/jquery/dist/jquery.min.js',
			'public/lib/fullpage.js/fullPage.js-2.7.4/jquery.fullPage.min.js',
			'public/dist/intro_scripts.min.js'
		]
	}
};
