var md5 = require('js-md5');
var fs = require('fs-extra');
var execFile = require('child_process').execFile;

/**
 * @param config
 */
var Controller = module.exports.Controller = function(config)
{
  this.processed = false;
  
  var hash = md5('slacktex' + Math.random());
  
  this.texBin = config.get('tex.bin');
  this.tmpDir = config.get('server.temp_dir');
  this.tmpFile = this.tmpDir + '/' + hash;
  this.templateFile = config.get('tex.template');
  this.destFile = config.get('server.output_dir') + '/' + hash + '.png';
};

/**
 * @param request
 */
Controller.prototype.parseRequest = function(request) 
{
  this.formulaTex = request.payload.text;
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
  
  this.writeTexFile(data, function(err)
  {
    if (err)
    {
      return callback(err);
    }
    
    me.processTex(function(err)
    {
      if (err)
      {
        return callback(err);
      }
      
      fs.exists(me.tmpFile + '.dvi', function (exists) 
      {
        if (!exists)
        {
          return callback(err);
        }
        
        callback();
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
  fs.write(this.tmpFile + '.tex', data, function(err, res) 
  {
    callback(err, res);
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
    if (error !== null) 
    {
      console.log('latex error: ' + error);
      return callback(error);
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
    '-q',
    '-T tight',
    '-D 300',
    '-o' + this.tmpFile + '.png',
    this.tmpFile + '.dvi',
    '2>&1'
  ];
  
  execFile(this.pngBin, args, function (error, stdout, stderr) 
  {
    if (error !== null) 
    {
      console.log('png error: ' + error);
      return callback(error);
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
      return callback(error);
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

