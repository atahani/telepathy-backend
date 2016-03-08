'use strict';

/**
 * Module dependencies.
 */

var fs=require('fs-extra'),
	path = require('path'),
	jsonQuery = require('json-query'),
	jf = require('jsonfile'),
	sharp=require('sharp'),
	_ = require('lodash'),
	mkdirp = require('mkdirp');

/**
 * internal function for resize and save image into cache dir
 * @param original_file_path original file path
 * @param cache_file_path cache file path
 * @param width  width for resize image
 * @param height height for resize image
 * @param quality quality for resize image
 * @param callback when resize image save action complete
 */
var _resizeAndSave=function(original_file_path,cache_file_path,width,height,quality,callback){
	sharp(original_file_path).resize(width,height).quality(quality).toFile(cache_file_path,callback);
};

/**
 * resize images with params info
 * route_name param >> the route name that set in '/config/media_route_config.json' file
 * width param >> width of image that want to resize
 * height param >> height of image that want to resize
 * quality param >> the quality of resize image , this is optional params
 * file_name param >> the file_name of jpeg file
 * @param req request
 * @param res response
 */
exports.getResizedImages=function(req,res){
	var width;
	var height;
	var quality=100;
	var route_name=req.params.route_name;
	if(!isNaN(req.params.width)){
		width=parseInt(req.params.width);
	}
	if(!isNaN(req.params.height)){
		height=parseInt(req.params.height);
	}
	if(!isNaN(req.params.quality)){
		quality=parseInt(req.params.quality);
	}
	//fist get image if exist
	var configs=jf.readFileSync(path.resolve('./config/media_route_config.json'),false);
	var routeRule=jsonQuery('routes[route='+route_name+']',{data:configs}).value;
	if(routeRule){
		var url=req.params.file_name;
		var filetype=path.extname(url);
		var filename=path.basename(url, filetype);
		var orginalFilePath=path.join(global.__base,path.join(routeRule.dir,filename+filetype));
		if (fs.existsSync(orginalFilePath)){
			res.setHeader('Cache-Control', 'public, max-age=31557600');
			//check size info
			if(!width && !height){
				//send orginalfile
				res.sendFile(orginalFilePath);
			}
			else {
				var sizerule=(width?width:'')+'_'+(height?height:'')+'_'+quality;
				var cashFilePath=path.join(global.__base,path.join(routeRule.cache_dir,filename+'_'+sizerule+filetype));
				if (fs.existsSync(cashFilePath)) {
					res.sendFile(cashFilePath);
				}
				else {
					//resize it and save it to cash dir
					var cashDirPath=path.join(global.__base,routeRule.cache_dir);
					if(!fs.existsSync(cashDirPath)){
						mkdirp(cashDirPath,function(err){
							if(err){
								res.status(500).send({message:'error was happened'});
							}
							else {
								_resizeAndSave(orginalFilePath,cashFilePath,width,height,quality,function(err,info){
									res.sendFile(cashFilePath);
								});
							}
						});
					}
					else {
						_resizeAndSave(orginalFilePath,cashFilePath,width,height,quality,function(err,info){
							res.sendFile(cashFilePath);
						});
					}
				}
			}
		}
		else {
			res.status(404).send({message:'image not found'});
		}
	}
	else {
		res.status(400).send({message:'bad request'});
	}
};
