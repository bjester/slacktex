var deferred = require('deferred');
var execFile = require('child_process').execFile;
var path = require('path');

/**
 * @params {String} binary
 * @params {String} file
 */
var Latex = module.exports = function(binary, file) 
{
  this.binary = binary;
  this.args = [ '-interaction=nonstopmode' ];
  this.file = file;
};

/**
 * @params {String} destDir The destination directory
 */
Latex.prototype.convert = function(destDir)
{
  var def = deferred(),
      base = path.basename(this.file, '.tex');
      
  this.addArg('-output-directory=' + destDir)
      .addArg(this.file);
      
  execFile(this.binary, this.args, function (error, stdout, stderr) 
  {
    if (error)
    {
      return def.reject(error);
    }
    
    def.resolve(path.join(destDir, base + '.dvi'));
  });
  
  return def.promise;
};

/**
 * @params {String} arg
 */
Latex.prototype.addArg = function(arg)
{
  this.args.push(arg);
  return this;
};
