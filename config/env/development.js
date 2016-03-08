'use strict';

module.exports = {
	db: {
		uri: 'mongodb://localhost/telepathy-dev', //connection of mongodb database, the db name is >> telepathy_dev
		options: {
			user: '',
			pass: ''
		}
	},
	media_end_point:'http://192.168.0.50:5000/media/i/', // the endpoint of media used in JSON
	//TODO: GCM information in development mode
	gcm_api_key: '', // the GCM API key that got you from google
	sender_id: '', // the sender id in GCM information
	android_app_package_name: '',//android package name like com.atahani.telepathy.debug
	log: {
		// Can specify one of 'combined', 'common', 'dev', 'short', 'tiny'
		format: 'dev',
		// Stream defaults to process.stdout
		// Uncomment to enable logging to a log on the file system
		options: {
			//stream: 'access.log'
		}
	},
	app: {
		title: 'Telepathy Application'
	}
};
