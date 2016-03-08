'use strict';

/**
 * Module dependencies.
 */
var fs = require('fs'),
	http = require('http'),
	https = require('https'),
	express = require('express'),
	morgan = require('morgan'),
	logger = require('./logger'),
	bodyParser = require('body-parser'),
	session = require('express-session'),
	compression = require('compression'),
	methodOverride = require('method-override'),
	cookieParser = require('cookie-parser'),
	helmet = require('helmet'),
	passport = require('passport'),
	mongoStore = require('connect-mongo')({
		session: session
	}),
	flash = require('connect-flash'),
	config = require('./config'),
	path = require('path');

module.exports = function (db) {
	// Initialize express app
	var app = express();
	//define global __base
	global.__base = path.resolve('./public/media');
	global.__tmp_upload_dir = path.resolve('./public/media/tmp_upload');
	//define media end point according to environment
	global.__media_end_point = config.media_end_point;

	// Globbing model files
	config.getGlobbedFiles('./app/models/**/*.js').forEach(function (modelPath) {
		require(path.resolve(modelPath));
	});

	// Setting application local variables
	app.locals.title = config.app.title;
	app.locals.description = config.app.description;
	app.locals.keywords = config.app.keywords;
	app.locals.jsFiles = config.getJavaScriptAssets();
	app.locals.cssFiles = config.getCSSAssets();
	app.locals.introJSFiles = config.getIntroWebSiteJSPaths();
	app.locals.introCSSFiles = config.getIntroWebSiteCSSPaths();


	// Passing the request url to environment locals
	app.use(function (req, res, next) {
		res.locals.url = req.protocol + '://' + req.headers.host + req.url;
		next();
	});

	// Should be placed before express.static
	app.use(compression({
		// only compress files for the following content types
		filter: function (req, res) {
			return (/json|text|javascript|css/).test(res.getHeader('Content-Type'));
		},
		// zlib option for compression level
		level: 3
	}));

	// Showing stack errors
	app.set('showStackError', true);

	// Set views path and view engine
	app.set('view engine', 'jade');
	app.set('views', './app/views');

	// Enable logger (morgan)
	app.use(morgan(logger.getLogFormat(), logger.getLogOptions()));

	// Environment dependent middleware
	if (process.env.NODE_ENV === 'development') {
		// Disable views cache
		app.set('view cache', false);
	} else if (process.env.NODE_ENV === 'production') {
		app.locals.cache = 'memory';
	}

	// Request body parsing middleware should be above methodOverride
	app.use(bodyParser.urlencoded({
		extended: true
	}));
	app.use(bodyParser.json());
	app.use(methodOverride());

	// Use helmet to secure Express headers
	app.use(helmet.xframe());
	app.use(helmet.xssFilter());
	app.use(helmet.nosniff());
	app.use(helmet.ienoopen());
	app.disable('x-powered-by');

	// Setting the app router and static folder
	app.use(express.static(path.resolve('./public')));

	// CookieParser should be above session
	app.use(cookieParser());

	// Express MongoDB session storage
	app.use(session({
		saveUninitialized: false,
		resave: false,
		secret: config.sessionSecret,
		store: new mongoStore({
			db: db.connection.db,
			collection: config.sessionCollection
		}),
		cookie: config.sessionCookie,
		name: config.sessionName
	}));

	// use passport session
	app.use(passport.initialize());
	app.use(passport.session());

	// connect flash for flash messages
	app.use(flash());

	// Globbing routing files
	config.getGlobbedFiles('./app/routes/**/*.js').forEach(function (routePath) {
		require(path.resolve(routePath))(app);
	});

	// Assume 'not found' in the error msgs is a 404. this is somewhat silly, but valid, you can do whatever you like, set properties, use instanceof etc.
	app.use(function (err, req, res, next) {
		// If the error object doesn't exists
		if (!err) return next();

		// Log it
		console.error(err.stack);

		//Error page
		res.status(500).render('error', {
			error: err.stack
		});
	});

	// Assume 404 since no middleware responded
	app.use(function (req, res) {
		res.status(404).render('not_found', {
			url: req.originalUrl,
			error: 'Not Found'
		});
	});

	// Return Express server instance
	return app;
};
