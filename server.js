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
  path: config.get('server.request_path'), 
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
      reply('An error occurred', null);
      throw e;
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
        text: Joi.string().required(),
        user_name: Joi.string().required(),
        channel_name: Joi.string().required(),
        
        // Not used
        team_id: Joi.any().optional(),
        team_domain: Joi.any().optional(),
        channel_id: Joi.any().optional(),
        user_id: Joi.any().optional()
      }
    }  
  }
});

// Start the server
server.start();
