var deferred = require('deferred');
var fs = require('fs');

/**
 * @params {String} data
 * @params {String} template
 */
var Latex = module.exports = function(data, template) 
{
  this.data = data;
  this.template = template;
  this.setToken(Latex.TOKEN);
};

Latex.TOKEN = '%formula%';

/**
 * @params {String} dest The destination file
 */
Latex.prototype.write = function(dest)
{
  var def = deferred();
  
  this.combine().then(function(data)
  {
    fs.writeFile(dest, data, function(err) 
    {
      if (err)
      {
        return def.reject(err);
      }
      
      def.resolve(dest);
    });
  }).done();
  
  return def.promise;
};

/**
 * Combines token data and template
 */
Latex.prototype.combine = function()
{
  var def = deferred(),
      token = this.token,
      data = this.data;
  
  if (!this.template)
  {
    return def.resolve(this.data);
  }
  
  fs.readFile(this.template, function(err, buffer)
  {
    if (err)
    {
      return def.reject(err);
    }
    
    def.resolve(buffer.toString().replace(token, data));
  });
  
  return def.promise;
};

/**
 * @params {String} token Set the combine token
 */
Latex.prototype.setToken = function(token)
{
  this.token = token;
  return this;
};
