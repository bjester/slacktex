var config = require('config');
var Server = require('lib/server.js');

var server = new Server(config);
server.start();
