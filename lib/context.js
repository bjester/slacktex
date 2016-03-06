var url = require('url');
var querystring = require('querystring');
var path = require('path');

var LatexWriter = require('lib/writer/latex.js');
var LatexConverter = require('lib/convert/latex.js');
var PngConverter = require('lib/convert/png.js');

/**
 * @param config
 */
var Context = module.exports = function(server, hash, tempDir, outDir, outPath)
{
  this.server = server;
  this.processed = false;
  this.params = {};
  
  this.texFile = path.join(tempDir, hash + '.tex');
  this.outFile = path.join(outDir, hash + '.png');
  this.outLink = outPath + '/' + hash + '.png';
};

/**
 * @param request
 */
Context.prototype.addParams = function(request) 
{
  this.params = request.payload;
  
  this.formulaTex = request.payload.text;
  this.postbackPayload = {
    username: request.payload.user_name,
    channel: '#' + request.payload.channel_name,
  };
};

Context.prototype.getRequestParam = function(name, def)
{
  if (name in this.params)
  {
    return this.params[name];
  }
  
  return def;
};

Context.prototype.buildLatexWriter = function(template)
{
  return new LatexWriter(this.getRequestParam('text'), template);
};

Context.prototype.buildLatexConverter = function(bin)
{
  return new LatexConverter(bin, this.texFile);
};

Context.prototype.buildPngConverter = function(bin, file)
{
  var pngc = new PngConverter(bin, file);
  pngc.addArg('-T tight').addArg('-D 300');
  return pngc;
};

Context.prototype.getRequestOptions = function(reqUrl, payload)
{
  var options = url.parse(reqUrl);
  options.method = 'POST';  
  options.headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': payload.length
  };
  
  return options;
};

Context.prototype.getRequestPayload = function()
{
  var payload = {
    username: this.getRequestParam('user_name'),
    channel: '#' + this.getRequestParam('channel_name'),
    text: '<' + this.outLink + '|' + this.getRequestParam('text') + '>'
  };
  
  return querystring.stringify(
  {
    payload: JSON.stringify(payload) 
  });
};
