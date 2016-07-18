var sanitize = require('mongo-sanitize');

module.exports = {
  mongo
};

function mongo(req, res, next)
{
  if (req.body)
  {
    Object.keys(req.body).forEach(function(key) {
      req.body[key] = sanitize(req.body[key]);
    });
    
    next();
  }
}
