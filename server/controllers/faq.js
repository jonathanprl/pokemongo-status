var db = require('../db');
var swiftping = require('../helpers/swiftping');

var NodeCache = require('node-cache');
var cache = new NodeCache({ stdTTL: 280, checkperiod: 300 });

module.exports = {
  getFaqs,
};


/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getFaqs(req, res, next)
{
  var cachedFaqs = cache.get('faqs');
  if (cachedFaqs !== undefined) {
    if (res.locals.api)
    {
      res.send(cachedFaqs);
    }
    res.locals.faqs = cachedFaqs;
    return next();
  }

  // TODO: Sanitize
  db.findWhere('faq', { publish: true }, { _id: 0 }, 1000, { sort: 1 }, (err, docs) => {
    if (err)
    {
      docs = [];
    }

    cache.set('faqs', docs);

    if (res.locals.api)
    {
      return res.send(docs);
    }

    res.locals.faqs = docs;
    next();
  });
}
