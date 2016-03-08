'use strict';

/**
 * module dependencies
 */
var _ = require('lodash'),
	errorHandler = require('./errors.server.controller'),
	mongoose = require('mongoose'),
	Client = mongoose.model('Client'),
	formidable = require('formidable'),
	path = require('path'),
	imageTools = require('../../config/media_tools'),
	flakeId = require('flake-idgen'),
	intformat = require('biguint-format'),
	User = mongoose.model('User');

var flake_id_gen = new flakeId();
var default_app_logo_file_name = 'default_app_logo.png';
var tmp_upload_dir = path.resolve(global.__base, 'tmp_upload');

/**
 * client authorization middleware
 * @param req request
 * @param res response
 * @param next next action
 */
exports.hasAuthorizationToAPI = function (req, res, next) {
	var clientId = req.body.app_id;
	var app_key = req.body.app_key;
	if (clientId && clientId !== '' && app_key && app_key !== '') {
		Client.findOne({_id: clientId, active_status: true}).exec(function (err, client) {
			if (err) {
				res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
			}
			else if (client && client.isValidAppKey(app_key)) {
				if (client.active_status) {
					next();
				}
				else {
					res.status(403).send({type: 'CLIENT_IS_DISABLE', description: 'Client is disable'});
				}
			}
			else {
				res.status(403).send({
					type: 'CLIENT_INFORMATION_IS_NOT_VALID',
					description: 'Client information is not valid'
				});
			}
		});
	}
	else {
		res.status(403).send({type: 'CLIENT_INFORMATION_IS_NOT_VALID', description: 'Client information is not valid'});
	}

};


/**
 * get posted app logo file for client application by manager employee , also if in editMode change value in document
 * @param req request
 * @param res response
 * ?client_id query string >> if have it , so we are in editMode should replace value of new file into client document
 */
exports.postMediaFileByManager = function (req, res) {
	var file_name = intformat(flake_id_gen.next(), 'dec');
	var form = new formidable.IncomingForm();
	form.maxFieldsSize = 1 * 1024 * 1024;
	form.uploadDir = tmp_upload_dir;
	form.type = true;
	form.parse(req);
	form.on('error', function () {
		return res.status(500).send({type: 'INTERNAL_SERVER_ERROR', description: 'Internal server error'});
	});
	form.on('end', function (fields, files) {
		// temporary location of our uploaded file
		var tmp_location = this.openedFiles[0].path;
		var type = this.openedFiles[0].type.split('/')[1];
		file_name = file_name + '.' + type;
		//first check if in editMode should check client is exist
		if (req.query.client_id) {
			Client.findOne({_id: req.query.client_id}).exec(function (err, client) {
				if (err) {
					return res.status(500).send({
						type: 'INTERNAL_SERVER_ERROR',
						description: errorHandler.getErrorMessage(err)
					});
				}
				else if (client) {
					//first save icon then save document
					imageTools.saveClientIcon(tmp_location, file_name, function (err, file_name) {
						if (err) {
							return res.status(500).send({
								type: 'INTERNAL_SERVER_ERROR',
								description: 'Internal server error'
							});
						}
						else {
							//now save document
							client.app_logo_file_name = file_name;
							client.save(function (err) {
								if (err) {
									return res.status(400).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: errorHandler.getErrorMessage(err)
									});
								}
								else {
									res.send({
										message: 'successfully uploaded',
										file_name: file_name
									});
								}
							});
						}
					});

				}
				else {
					res.status(400).send({
						type: 'CAN_NOT_FOUND_ITEM_WITH_THIS_ID',
						description: 'can not found item with this id'
					});
				}
			});
		}
		else {
			imageTools.saveClientIcon(tmp_location, file_name, function (err, file_name) {
				if (err) {
					return res.status(500).send({
						type: 'INTERNAL_SERVER_ERROR',
						description: 'error was happened double check try again'
					});
				}
				else {
					res.send({
						message: 'successfully uploaded',
						file_name: file_name
					});
				}
			});
		}
	});
};

/**
 * remove media file , also if in editMode set app_logo_file_name to default value
 * @param req request
 * @param res response
 * :file_name param >> file_name of app_logo_file_name that should be delete
 * ?client_id query string >> if have it, so we are in editMode set app_logo_file_name to default value
 */
exports.deleteMediaFileByManager = function (req, res) {
	var file_name;
	if (req.params.file_name) {
		file_name = req.params.file_name;
		if (req.query.client_id) {
			//check client exist with this file_name
			Client.findOne({_id: req.query.client_id, app_logo_file_name: file_name}).exec(function (err, client) {
				if (err) {
					return res.status(400).send({
						type: 'INTERNAL_SERVER_ERROR',
						description: errorHandler.getErrorMessage(err)
					});
				}
				else if (client) {
					//first remove file then update document
					imageTools.deleteClientIcon(file_name, function (err) {
						if (err) {
							return res.status(500).send({
								type: 'INTERNAL_SERVER_ERROR',
								description: 'error was happened double check try again'
							});
						}
						else {
							client.app_logo_file_name = default_app_logo_file_name;
							client.save(function (err) {
								if (err) {
									return res.status(400).send({
										type: 'INTERNAL_SERVER_ERROR',
										description: errorHandler.getErrorMessage(err)
									});
								}
								else {
									res.send({
										type: 'MEDIA_REMOVED_SUCCESSFULLY',
										description: 'media removed successfully'
									});
								}
							});
						}
					});
				}
				else {
					res.status(400).send({
						type: 'CAN_NOT_FOUND_ITEM_WITH_THIS_ID',
						description: 'can not found item with this id'
					});
				}
			});
		}
		else {
			//isn't in editMode, remove it
			imageTools.deleteClientIcon(file_name, function (err) {
				if (err) {
					res.status(500).send({
						type: 'INTERNAL_SERVER_ERROR',
						description: 'error was happened double check try again'
					});
				}
				else {
					res.send({type: 'MEDIA_REMOVED_SUCCESSFULLY', description: 'media removed successfully'});
				}
			});
		}
	}
	else {
		res.status(400).send({type: 'FILE_NAME_IS_EMPTY', description: 'file name is empty'});
	}
};

/**
 * create new client by manager
 * @param req request
 * @param res response
 */
exports.createByManager = function (req, res) {
	var client = new Client(req.body);
	client.updated_at = Date.now();
	client.trusted_app = true;
	client.active_status = true;
	client.save(function (err) {
		if (err) {
			res.status(400).send({type: 'INTERNAL_SERVER_ERROR', description: errorHandler.getErrorMessage(err)});
		}
		else {
			client.app_key = client.getAppKey();
			res.json(client);
		}
	});
};

/**
 * show the one client by app id
 * @param req
 * @param res
 */
exports.readByManager = function (req, res) {
	req.client.app_key = req.client.getAppKey();
	res.json(req.client);
};

/**
 * update client information via manager employee
 * NOTE:the app_key in req.body is hashed so , get it from req.client
 * @param req request
 * @param res response
 */
exports.updateByManager = function (req, res) {
	var client = req.client;
	client = _.extend(client, req.body);
	client.app_key = req.client.app_key;
	client.save(function (err) {
		if (err) {
			res.status(400).send({type: 'INTERNAL_SERVER_ERROR', description: errorHandler.getErrorMessage(err)});
		}
		else {
			client.app_key = client.getAppKey();
			res.json(client);
		}
	});
};

/**
 * delete trusted_app client if this client isn't use by any user via manager employee
 * @param req request
 * @param res response
 */
exports.deleteByManager = function (req, res) {
	var client = req.client;
	if (client.trusted_app) {
		var app_logo_file_name = client.app_logo_file_name;
		//first check is there any user to use from this client
		User.count({'trusted_apps._client': client._id}, function (err, count) {
			if (err) {
				return res.status(400).send({
					type: 'INTERNAL_SERVER_ERROR',
					description: errorHandler.getErrorMessage(err)
				});
			}
			else {
				if (count === 0) {
					//so system can delete this client
					client.remove(function (err) {
						if (err) {
							return res.status(400).send({
								type: 'INTERNAL_SERVER_ERROR',
								description: errorHandler.getErrorMessage(err)
							});
						}
						else {
							if (app_logo_file_name && app_logo_file_name !== default_app_logo_file_name) {
								imageTools.deleteClientIconSync(app_logo_file_name);
							}
							res.send({type: 'REMOVED_SUCCESSFULLY', description: 'client removed successfully'});
						}
					});
				}
				else {
					return res.status(500).send({
						type: 'SYSTEM_CAN_NOT_REMOVE_THIS_CLIENT',
						description: 'system can not remove, there is ' + count + ' user along to this client. '
					});
				}
			}
		});
	}
	else {
		return res.status(500).send({
			type: 'SYSTEM_CAN_NOT_REMOVE_THIS_CLIENT',
			description: 'can not remove, the client is not trusted application.'
		});
	}

};

/***
 * list of clients via manager employee
 * @param req request
 * @param res response
 * the query strings are :
 * per_page >> the number of item for each page
 * page >> the current page number
 * short_name_query >> filter by short_name query
 * title_query >> filter by title query
 * sort_by >> sort by field like 'short_name'
 */
exports.listClientsByManager = function (req, res) {
	var xClients = [];
	var query = Client.find();
	var query_without_limit = Client.find();
	var per_page = 0;
	var page = 1;
	if (req.query.per_page && !isNaN(req.query.per_page)) {
		per_page = Number(req.query.per_page);
	}
	if (req.query.page && !isNaN(req.query.page)) {
		page = Number(req.query.page);
	}
	if (req.query.short_name_query) {
		query.where({short_name: {$regex: '.*' + req.query.short_name_query + '.*'}});
		query_without_limit.where({short_name: {$regex: '.*' + req.query.short_name_query + '.*'}});
	}
	if (req.query.title_query) {
		query.where({title: {$regex: '.*' + req.query.title_query + '.*'}});
		query_without_limit.where({title: {$regex: '.*' + req.query.title_query + '.*'}});
	}
	if (req.query.sort_by) {
		query.sort(req.query.sort_by);
	}
	else {
		query.sort('-updated_at');
	}
	if (per_page !== 0) {
		query.limit(per_page).skip(per_page * (page - 1));
	}
	query.exec(function (err, clients) {
		if (err) {
			res.status(400).send({type: 'INTERNAL_SERVER_ERROR', description: errorHandler.getErrorMessage(err)});
		}
		else {
			query_without_limit.count(function (err, total) {
				if (err) {
					res.status(400).send({
						type: 'INTERNAL_SERVER_ERROR',
						description: errorHandler.getErrorMessage(err)
					});
				}
				else {
					clients.forEach(function (client) {
						client.app_key = client.getAppKey();
						xClients.push(client);
					});
					res.json({
						'data': xClients,
						'page': page,
						'total': total
					});
				}
			});
		}
	});
};


/**
 * find client by id middleware
 * @param req request
 * @param res response
 * @param next next activity
 * @param id query id
 */
exports.findClientById = function (req, res, next, id) {
	Client.findById(id).exec(function (err, client) {
		if (err) return next(err);
		if (!client) return next(new Error('can not find item with this ') + id);
		req.client = client;
		next();
	});
};


