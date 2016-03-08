'use strict';

var fs = require('fs');

module.exports = function(grunt) {
	// Unified Watch Object
	var watchFiles = {
		serverViews: ['app/views/**/*.*'],
		serverJS: ['gruntfile.js', 'server.js', 'config/**/*.js', 'app/**/*.js', '!app/tests/'],
		clientViews: ['public/modules/**/views/**/*.html'],
		clientJS: ['public/js/*.js', 'public/modules/**/*.js'],
		clientCSS: ['public/modules/**/*.css'],
		mochaTests: ['app/tests/**/*.js'],
		sassFiles:['public/sass/*/*.*','public/sass/*.*']
	};

	// Project Configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		watch: {
			serverViews: {
				files: watchFiles.serverViews,
				options: {
					livereload: true
				}
			},
			serverJS: {
				files: watchFiles.serverJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientViews: {
				files: watchFiles.clientViews,
				options: {
					livereload: true
				}
			},
			clientJS: {
				files: watchFiles.clientJS,
				tasks: ['jshint'],
				options: {
					livereload: true
				}
			},
			clientCSS: {
				files: watchFiles.clientCSS,
				tasks: ['csslint'],
				options: {
					livereload: true
				}
			},
			mochaTests: {
				files: watchFiles.mochaTests,
				tasks: ['test:server'],
			},
			sass:{
				files:watchFiles.sassFiles,
				tasks:['sass'],
				options: {
					livereload: true
				}
			}
		},
		jshint: {
			all: {
				src: watchFiles.clientJS.concat(watchFiles.serverJS),
				options: {
					jshintrc: true
				}
			}
		},
		csslint: {
			options: {
				csslintrc: '.csslintrc'
			},
			all: {
				src: watchFiles.clientCSS
			}
		},
		uglify: {
			production: {
				options: {
					mangle: false
				},
				files: {
					'public/dist/intro_scripts.min.js': 'public/js/intro_scripts.js'
				}
			}
		},
		cssmin: {
			combine: {
				files: {
					'public/dist/intro_styles.min.css': 'public/css/intro_styles.css'
				}
			}
		},
		nodemon: {
			dev: {
				script: 'server.js',
				options: {
					nodeArgs: ['--debug'],
					ext: 'js,html',
					watch: watchFiles.serverViews.concat(watchFiles.serverJS)
				}
			}
		},
		'node-inspector': {
			custom: {
				options: {
					'web-port': 1337,
					'web-host': 'localhost',
					'debug-port': 5858,
					'save-live-edit': true,
					'no-preload': true,
					'stack-trace-limit': 50,
					'hidden': []
				}
			}
		},
		ngAnnotate: {
			production: {
				files: {
					//'public/dist/intro_scripts.min.js': 'public/js/intro_scripts.js'
				}
			}
		},
		concurrent: {
			default: ['nodemon', 'watch'],
			debug: ['nodemon', 'watch', 'node-inspector'],
			options: {
				logConcurrentOutput: true,
				limit: 10
			}
		},
		env: {
			test: {
				NODE_ENV: 'test'
			},
			secure: {
				NODE_ENV: 'secure'
			}
		},
		sass: {                              // Task
			dist: {                            // Target
				options: {                       // Target options
					style: 'expanded'
				},
				files: {                         // Dictionary of files
					'public/css/intro_styles.css': 'public/sass/intro_styles.scss'       // 'destination': 'source'
				}
			}
		},
		mochaTest: {
			src: watchFiles.mochaTests,
			options: {
				reporter: 'spec',
				require: 'server.js'
			}
		},
		copy: {
		    localConfig: {
	            src: 'config/env/local.example.js',
	            dest: 'config/env/local.js',
	            filter: function() {
	            	return !fs.existsSync('config/env/local.js');
	            }
		    }
		}
	});

	// Load NPM tasks
	require('load-grunt-tasks')(grunt);

	grunt.loadNpmTasks('grunt-contrib-sass');

	// Making grunt default to force in order not to break the project.
	grunt.option('force', true);

	// A Task for loading the configuration object
	grunt.task.registerTask('loadConfig', 'Task that loads the config into a grunt option.', function() {
		var init = require('./config/init')();
		var config = require('./config/config');

		grunt.config.set('applicationJavaScriptFiles', config.assets.js);
		grunt.config.set('applicationCSSFiles', config.assets.css);
	});

	// Default task(s).
	grunt.registerTask('default', ['sass','jshint','lint', 'copy:localConfig', 'concurrent:default']);

	// Debug task.
	grunt.registerTask('debug', ['sass','jshint','lint', 'copy:localConfig', 'concurrent:debug']);

	// Secure task(s).
	grunt.registerTask('secure', ['sass','env:secure', 'lint', 'copy:localConfig', 'concurrent:default']);

	// Lint task(s).
	grunt.registerTask('lint', ['sass','jshint', 'csslint']);

	// Build task(s).
	grunt.registerTask('build', ['sass','jshint','lint', 'loadConfig', 'ngAnnotate', 'uglify', 'cssmin']);

	// Test task.
	grunt.registerTask('test', ['copy:localConfig', 'test:server', 'test:client']);
	grunt.registerTask('test:server', ['env:test', 'mochaTest']);
	grunt.registerTask('test:client', ['env:test']);
};
