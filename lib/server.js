var https = require('https');
var url = require('url');
var path = require('path');

var Hapi = require('hapi');
var Joi = require('joi');
var md5 = require('js-md5');
var fs = require('fs-extra');
var deferred = require('deferred');

var Context = require('lib/context.js');

/**
 * @param config
 */
var Server = module.exports = function(config)
{
  this.hapi = new Hapi.Server();
  this.config = config;
  
  this.postbackOptions = url.parse(config.get('slack.webhook_url'));
  this.postbackOptions.method = 'POST';
};

Server.CONFIG = {
  SERVER: {
    HOST: 'server.host',
    PORT: 'server.port',
    REQUEST_PATH: 'server.request_path',
    OUTPUT_PATH: 'server.output_path',
    TEMP_DIR: 'server.temp_dir',
    OUTPUT_DIR: 'server.output_dir'
  },
  SLACK: {
    TOKEN: 'slack.token',
    COMMAND: 'slack.command',
    WEBHOOK_URL: 'slack.webhook_url'
  },
  TEX: {
    BIN: 'tex.bin',
    TEMPLATE: 'tex.template'
  },
  PNG: {
    BIN: 'png.bin'
  }
};

/**
 * Prep the server by adding configs
 */
Server.prototype.prep = function()
{
  var self = this;
  
  this.hapi.connection(
  {
    host: this.config.get(Server.CONFIG.SERVER.HOST),
    port: this.config.get(Server.CONFIG.SERVER.PORT)
  });
  
  this.hapi.route(
  {
    method: 'POST',
    path: this.config.get(Server.CONFIG.SERVER.REQUEST_PATH), 
    handler: function (request, reply) 
    {
      self.handle(request, reply);
    },
    config: 
    {
      validate: this.getValidateConfig()
    }
  });
  
  this.prepped = true;
  return this;
};

/**
 * Start the server
 */
Server.prototype.start = function()
{
  if (!this.prepped)
  {
    this.prep();
  }
  
  this.hapi.start();
  return this;
};

/**
 * Handle a request
 * 
 * @params {Object} request
 * @params {Object} reply
 */
Server.prototype.handle = function(request, reply)
{
  var tmpDir = this.config.get(Server.CONFIG.SERVER.TEMP_DIR);
  var hash = md5('slacktex' + Math.random());
  var reqUrl = this.config.get(Server.CONFIG.SLACK.WEBHOOK_URL);
  
  var context = new Context(
    this,
    hash,
    tmpDir,
    this.config.get(Server.CONFIG.SERVER.OUTPUT_DIR),
    url.format({
      protocol: 'http',
      hostname: this.config.get(Server.CONFIG.SERVER.HOST),
      pathname: this.config.get(Server.CONFIG.SERVER.OUTPUT_PATH)
    }));
    
  context.addParams(request);
  
  var latexBin = this.config.get(Server.CONFIG.TEX.BIN);
  var pngBin = this.config.get(Server.CONFIG.PNG.BIN);
  
  var writer = context.buildLatexWriter(this.config.get(Server.CONFIG.TEX.TEMPLATE));
  writer.write(context.texFile)
    .then(function(file)
    {
      var converter = context.buildLatexConverter(latexBin);
      return converter.convert(tmpDir);
    })
    .then(function(file)
    {
      reply();
      
      var pngConverter = context.buildPngConverter(pngBin, file);
      return pngConverter.convert(context.outFile);
    })
    .then(function()
    {
      var d = deferred();
      var payload = context.getRequestPayload();
      var options = context.getRequestOptions(reqUrl, payload);
      
      var req = https.request(options, function(res)
      {
        res.on('data', function(d) 
        {
          process.stdout.write(d);
        });
        
        res.on('end', function () 
        {
          d.resolve();
        });
      });
      
      req.on('error', function(e) 
      {
        console.log('problem with request: ' + e.message);
      });
      
      req.write(payload);
      req.end();
      
      return d.promise();
    })
    .then(function()
    {
      fs.remove(path.join(tmpDir, hash + '.*'), function(error) 
      {
        if (error)
        {
          console.log('cleanup error');
          throw error;
        }
      });
      
      delete context;
    }).done();
};

/**
 * Param validation config
 */
Server.prototype.getValidateConfig = function()
{
  return {
    payload:
    {
      token: Joi.string().required().valid(this.config.get(Server.CONFIG.SLACK.TOKEN)),
      command: Joi.string().required().valid(this.config.get(Server.CONFIG.SLACK.COMMAND)),
      text: Joi.string().required(),
      user_name: Joi.string().required(),
      channel_name: Joi.string().required(),
      
      // Not used
      team_id: Joi.any().optional(),
      team_domain: Joi.any().optional(),
      channel_id: Joi.any().optional(),
      user_id: Joi.any().optional(),
      response_url: Joi.any().optional()
    }
  }; 
};

