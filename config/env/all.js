'use strict';

module.exports = {
	app: {
		title: 'Telepathy'
	},
	//TODO: put your slack web Hook end point
	//used for send message to slack channel, when something wrong or have new register user in system
	//more information : https://api.slack.com/incoming-webhooks
	webHookEndPoint: 'https://hooks.slack.com/services/XXXXXX/XXXXXXXXXXXXX',
	port: process.env.PORT || 5000, //the default port in development and production
	// The secret should be set to a non-guessable string that
	// is used to compute a session hash
	//TODO : verify and change the session secret
	//NOTE: in REST FULL API we don't use from session at all
	sessionSecret: 'ZZZZZZ',
	// The name of the MongoDB collection to store sessions in
	sessionCollection: 'sessions',
	// The session cookie settings
	sessionCookie: {
		path: '/',
		httpOnly: true,
		// If secure is set to true then it will cause the cookie to be set
		// only when SSL-enabled (HTTPS) is used, and otherwise it won't
		// set a cookie. 'true' is recommended yet it requires the above
		// mentioned pre-requisite.
		secure: false,
		// Only set the maxAge to null if the cookie shouldn't be expired
		// at all. The cookie will expunge when the browser is closed.
		maxAge: null
		// To set the cookie in a specific domain uncomment the following
		// setting:
		// domain: 'yourdomain.com'
	},
	// The session cookie name
	sessionName: 'connect.sid',
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
		js: [],
		tests: [
			'public/lib/angular-mocks/angular-mocks.js',
			'public/modules/*/tests/*.js'
		]
	},
	intro_website: {
		css: [
			'public/css/intro_styles.css'
		],
		js: [
			'public/lib/retina.js/dist/retina.js',
			'public/lib/jquery/dist/jquery.js',
			'public/lib/fullpage.js/fullPage.js-2.7.4/jquery.fullPage.js',
			'public/js/intro_scripts.js'
		]
	}
};
