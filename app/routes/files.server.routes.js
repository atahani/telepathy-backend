'use strict';

/**
 * module dependencies
 */
var files = require('../../app/controllers/files.server.controller.js');

module.exports = function(app) {

	app.route('/media/i/:route_name/:width/:height/:quality?/:file_name').get(files.getResizedImages);
};
