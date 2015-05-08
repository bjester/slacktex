var deferred = require('deferred');
var exec = require('child_process').exec;

/**
 * @params {String} binary
 * @params {String} file
 */
var Png = module.exports = function(binary, file)
{
  this.binary = binary;
  this.args = [ '', '-q' ];
  this.file = file;
};

/**
 * @params {String} dest The destination file
 */
Png.prototype.convert = function(dest)
{
  var def = deferred();
      
  this.addArg('-o ' + dest)
      .addArg(this.file);
      
  exec(this.binary + this.args.join(' '), function (error, stdout, stderr) 
  {
    if (error)
    {
      return def.reject(error);
    }
    
    def.resolve(dest);
  });
  
  return def.promise;
};

/**
 * @params {String} arg
 */
Png.prototype.addArg = function(arg)
{
  this.args.push(arg);
  return this;
};
