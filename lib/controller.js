var md5 = require('js-md5');
var fs = require('fs-extra');
var execFile = require('child_process').execFile;
var exec = require('child_process').exec;
var https = require('https');
var url = require('url');
var querystring = require('querystring');

/**
 * @param config
 */
var Controller = module.exports.Controller = function(config)
{
  this.processed = false;
  
  var hash = md5('slacktex' + Math.random());
  
  this.texBin = config.get('tex.bin');
  this.pngBin = config.get('server.png_bin');
  this.tmpDir = config.get('server.temp_dir');
  this.tmpFile = this.tmpDir + '/' + hash;
  this.templateFile = config.get('tex.template');
  this.destFile = config.get('server.output_dir') + '/' + hash + '.png';
  
  this.publicFile = 'http://'+ config.get('server.host') + config.get('server.output_path')
    + '/' + hash + '.png';
  this.postbackOptions = url.parse(config.get('slack.webhook_url'));
  this.postbackOptions.method = 'POST';
};

/**
 * @param request
 */
Controller.prototype.parseRequest = function(request) 
{
  this.formulaTex = request.payload.text;
  this.postbackPayload = {
    username: request.payload.user_name,
    channel: '#' + request.payload.channel_name,
  };
};

/**
 * Reads info from request and builds latex object to create image
 */
Controller.prototype.process = function(callback)
{
  if (this.processed)
  {
    return;
  }
  
  var me = this;
  var data = this.getFile().replace('%formula%', this.formulaTex);
  
  this.writeTexFile(data, function()
  {
    me.processTex(function()
    {
      fs.exists(me.tmpFile + '.dvi', function (exists) 
      {   
        callback();
        
        me.convertTex(function()
        {
          me.copy(function()
          {
            me.postbackPayload.text = '<' + me.publicFile + '|Equation>';
            var postdata = querystring.stringify(
            {
              payload: JSON.stringify(me.postbackPayload) 
            });
            
            me.postbackOptions.headers = {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': postdata.length
            };
            
            var req = https.request(me.postbackOptions, function(res)
            {
              res.on('data', function(d) 
              {
                process.stdout.write(d);
              });
            });
            
            req.on('error', function(e) 
            {
              console.log('problem with request: ' + e.message);
            });
            req.write(postdata);
            req.end();
            
            me.cleanup(function(){});
          });
        });
      });
    });
  });
  
  this.processed = true;
};

/**
 * 
 */
Controller.prototype.writeTexFile = function(data, callback)
{
  fs.writeFile(this.tmpFile + '.tex', data, function(err) 
  {
    if (err)
    {
      throw err;
    }
    
    callback();
  });
};

/**
 * 
 */
Controller.prototype.processTex = function(callback)
{
  var args = [
    '-output-directory=' + this.tmpDir,
    '-interaction=nonstopmode',
    this.tmpFile + '.tex'
  ];
  
  execFile(this.texBin, args, function (error, stdout, stderr) 
  {
    if (error)
    {
      console.log('latex error: ' + error);
      throw error;
    }
    
    callback();
  });
};

/**
 * 
 */
Controller.prototype.convertTex = function(callback)
{
  var args = [
    '',
    '-q',
    '-T tight',
    '-D 300',
    '-o ' + this.tmpFile + '.png',
    this.tmpFile + '.dvi'
  ];
  
  exec(this.pngBin + args.join(' '), function (error, stdout, stderr) 
  {
    if (error)
    {
      console.log('png error: ' + error);
      throw error;
    }
    
    callback();
  });
};


/**
 * 
 */
Controller.prototype.copy = function(callback)
{
  fs.copy(this.tmpFile + '.png', this.destFile, function(error) 
  {
    if (error)
    {
      console.log('copy error');
      throw error;
    }
    
    callback();
  });
};

/**
 * 
 */
Controller.prototype.cleanup = function(callback)
{
  fs.remove(this.tmpFile + '.*', function(error) 
  {
    if (error)
    {
      console.log('cleanup error');
      throw error;
    }
    
    callback();
  });
};

/**
 * 
 */
Controller.prototype.getFile = function()
{
  return fs.readFileSync(this.templateFile).toString();
};

