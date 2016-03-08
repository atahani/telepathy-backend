'use strict';

module.exports = function(app) {

	//introduction website
	var core = require('../../app/controllers/core.server.controller');
	app.route('/').get(core.intro_website);
};
