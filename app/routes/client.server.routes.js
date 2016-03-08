'use strict';

var Client=require('../../app/controllers/client.server.controller'),
	User=require('../../app/controllers/users.server.controller');

/**
 * client Routes , admin User can CURD to all of the clients
 */
module.exports=function(app){
	//client routes for admin User
	app.route('/api/clients')
		.get(User.hasAuthorization(['admin']),Client.listClientsByManager)
		.post(User.hasAuthorization(['admin']),Client.createByManager);

	app.route('/api/clients/:client_id')
		.get(User.hasAuthorization(['admin']),Client.readByManager)
		.put(User.hasAuthorization(['admin']),Client.updateByManager)
		.delete(User.hasAuthorization(['admin']),Client.deleteByManager);

	app.route('/api/clients/logo')
		.post(User.hasAuthorization(['admin']),Client.postMediaFileByManager);
	app.route('/api/clients/logo/:file_name')
		.delete(User.hasAuthorization(['admin']),Client.deleteMediaFileByManager);

	//binding the client middleware
	app.param('client_id',Client.findClientById);
};

