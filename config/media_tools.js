'use strict';

/**
 * Module dependencies.
 */

var fs = require('fs-extra'),
	jsonQuery = require('json-query'),
	jf = require('jsonfile'),
	glob = require('glob'),
	path = require('path'),
	sharp = require('sharp');

var config_path = path.resolve('./config/media_route_config.json');


/**
 * internal function for get file path for icon
 * @param file_name the file name
 * @param file_type the type like .svg or .png
 * @returns full_path of icon file
 */
var _getIconFilePath = function (file_name, file_type) {
	var des_dir;
	if (file_type === '.png') {
		des_dir = path.resolve(global.__base, 'images/img');
	}
	else {
		des_dir = path.resolve(global.__base, 'images/svg');
	}
	return path.resolve(des_dir, file_name + file_type);
};

/**
 * internal function for get full path of image
 * @param route_name route rule , route name
 * @param file_name the file name
 * @param file_type the type like .svg or .png
 * @returns full_path of image file
 */
var _getImageFullPath = function (route_name, file_name, file_type) {
	var configs = jf.readFileSync(config_path, false);
	var route = jsonQuery('routes[route=' + route_name + ']', {data: configs}).value;
	return path.resolve(path.resolve(global.__base, route.dir), file_name + file_type);
};

/**
 * clear cache directory from resize image files
 * @param route_name route rule , route name
 * @param file_name the file name
 * @param Callback Callback when delete operation complete
 */
var _clearCacheDirFromImage = function (route_name, file_name, Callback) {
	var configs = jf.readFileSync(config_path, false);
	var route = jsonQuery('routes[route=' + route_name + ']', {data: configs}).value;
	var cache_dir = path.resolve(global.__base, route.cache_dir);
	var part_of_files = path.resolve(cache_dir, file_name);

	glob(part_of_files + '_*.*', function (err, files) {
		var i = files.length;
		if (i !== 0) {
			files.forEach(function (path) {
				fs.unlink(path, function (err) {
					i--;
					if (err) {
						if (Callback) {
							new Callback(err);
						}
					}
					if (i <= 0) {
						if (Callback) {
							new Callback(null);
						}
					}
				});
			});
		}
		else {
			if (Callback) {
				new Callback(null);
			}

		}
	});
};

/**
 * this is for save media file (.jpeg) into default route
 * @param tmp_location tmp_location that image save on folder when upload it
 * @param file_name the file name
 * @param Callback Callback when save progress complete
 */
exports.saveImageMedia = function (route_name, tmp_location, file_name, Callback) {
	var configs = jf.readFileSync(config_path, false);
	var file_path;
	if (route_name) {
		file_path = _getImageFullPath(route_name, file_name, '.jpeg');
	}
	else {
		var defaultRouteRule = jsonQuery(['routes[default=?]', true], {data: configs}).value;
		if (defaultRouteRule) {
			file_path = path.resolve(path.resolve(global.__base, defaultRouteRule.dir), file_name + '.jpeg');
			route_name = defaultRouteRule.route;
		}
		else {
			new Callback('default route rule not found');
		}
	}
	sharp(tmp_location).rotate().jpeg().toFile(file_path, function (err, info) {
		if (err) {
			new Callback(err);
		}
		else {
			fs.unlink(tmp_location, function () {
			});
			new Callback(err, info, route_name);
		}
	});
};

/**
 * remove original media file and other cache files
 * @param route_name route_name of route rule
 * @param file_name file_name
 * @param file_type the type of file like .jpeg
 * @param Callback Callback when removed all of the files
 */
exports.removeImageMedia = function (route_name, file_name, file_type, Callback) {
	var file_path = _getImageFullPath(route_name, file_name, file_type);
	fs.unlink(file_path, function (err) {
		if (err) {
			new Callback(err);
		}
		else {
			_clearCacheDirFromImage(route_name, file_name, Callback);
		}
	});
};

exports.removeImageMediaWithOutCallback = function (route_name, file_name, file_type) {
	var file_path = _getImageFullPath(route_name, file_name, file_type);
	fs.unlink(file_path, function (err) {
		if (!err) {
			_clearCacheDirFromImage(route_name, file_name, null);
		}
	});
};


/**
 * save Icon like .png or .svg file
 * @param tmp_location tmp_location that image save on folder when upload it
 * @param file_name the file name
 * @param file_type the type like .svg or .png
 * @param Callback Callback when save progress complete
 */
exports.saveIcon = function (tmp_location, file_name, file_type, Callback) {
	var file_path;
	if (file_type === '.png' || file_type === '.svg') {
		file_path = _getIconFilePath(file_name, file_type);
		fs.move(tmp_location, file_path, function (err) {
			if (err) {
				new Callback(err);
			}
			else {
				new Callback(null, file_name);
			}
		});
	}
	else {
		new Callback('can not save file with this file_type');
	}
};

/**
 * delete icon file async
 * @param file_name the file name
 * @param file_type the type like .svg or .png
 * @param Callback Callback when delete progress complete
 */
exports.deleteIcon = function (file_name, file_type, Callback) {
	var file_path;
	if (file_type === '.png' || file_type === '.svg') {
		file_path = _getIconFilePath(file_name, file_type);
		fs.unlink(file_path, Callback);
	}
	else {
		new Callback('can not save file with this file_typ');
	}
};

/**
 * delete icon file sync
 * @param file_name the file name
 * @param file_type the type like .svg or .png
 */
exports.deleteIconSync = function (file_name, file_type) {
	var file_path;
	if (file_type === '.png' && file_type === '.svg') {
		file_path = _getIconFilePath(file_name, file_type);
		fs.removeSync(file_path);
	}
};

/**
 * save client icon into /images/client_app
 * @param tmp_location tmp_location that image save on folder when upload it
 * @param file_name the file name
 * @param Callback Callback when save progress complete
 */
exports.saveClientIcon = function (tmp_location, file_name, Callback) {
	var file_path, des_dir;
	des_dir = path.resolve(global.__base, 'images/client_app');
	file_path = path.resolve(des_dir, file_name);
	fs.move(tmp_location, file_path, function (err) {
		if (err) {
			new Callback(err);
		}
		else {
			new Callback(null, file_name);
		}
	});
};

/**
 * delete client icon
 * @param file_name file name with type
 * @param Callback Callback when delete progress complete
 */
exports.deleteClientIcon = function (file_name, Callback) {
	var file_path, des_dir;
	des_dir = path.resolve(global.__base, 'images/client_app');
	file_path = path.resolve(des_dir, file_name);
	fs.unlink(file_path, Callback);
};

/**
 * delete client icon sync
 * @param file_name file name
 */
exports.deleteClientIconSync = function (file_name) {
	var file_path, des_dir;
	des_dir = path.resolve(global.__base, 'images/client_app');
	file_path = path.resolve(des_dir, file_name);
	fs.removeSync(file_path);
};
