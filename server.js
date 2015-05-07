var config = require('config');
var Hapi = require('hapi');
var Joi = require('joi');
var Controller = require('lib').Controller;

// Create a server with a host and port
var server = new Hapi.Server();
server.connection(
{ 
  host: config.get('server.host'),
  port: config.get('server.port')
});

// Add the route
server.route(
{
  method: 'POST',
  path: config.get('server.path'), 
  //debug: ['error'],
  handler: function (request, reply) 
  {
    try
    {
      var controller = new Controller(config);
      controller.parseRequest(request);
      controller.process(function(err)
      {
        if (err)
        {
          return reply(err);
        }
        
        reply('success');
      });
    }
    catch (e)
    {
      console.log(Controller, controller, e);
      return reply('An error occurred', null);
    }
  },
  config: 
  {
    validate: 
    {
      payload:
      {
        token: Joi.string().required().valid(config.get('slack.token')),
        command: Joi.string().required().valid(config.get('slack.command')),
        text: Joi.string().required()
      }
    }  
  }
});

// Start the server
server.start();
