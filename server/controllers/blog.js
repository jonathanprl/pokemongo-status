var db = require('../db');
var swiftping = require('../helpers/swiftping');

var NodeCache = require('node-cache');
var cache = new NodeCache({ stdTTL: 280, checkperiod: 300 });

module.exports = {
  getBlogs,
  getBlogBySeo,
  getLatestBlog
};

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getBlogs(req, res, next)
{
  var cachedBlogs = cache.get('blogs');
  if (cachedBlogs !== undefined) {
    if (res.locals.api)
    {
      res.send(cachedBlogs);
    }
    res.locals.blogs = cachedBlogs;
    return next();
  }

  // TODO: Sanitize
  db.findWhere('blog', { publish: true }, { _id: 0 }, 1, { published_at: -1 }, (err, docs) => {
    if (err)
    {
      docs = [];
    }

    cache.set('blogs', docs);

    if (res.locals.api)
    {
      return res.send(docs);
    }

    res.locals.blogs = docs;
    next();
  });
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getBlogBySeo(req, res, next)
{
  var cachedBlogs = cache.get('blogBySeo');
  if (cachedBlogs !== undefined) {
    if (res.locals.api)
    {
      res.send(cachedBlogs);
    }
    res.locals.blogs = cachedBlogs;
    return next();
  }

  // TODO: Sanitize
  db.findOneWhere('blog', {seo_url: req.params.seo_url }, {_id: 0}, (err, doc) => {
    if (err)
    {
      doc = {};
    }

    var blogs = [doc];

    cache.set('blogBySeo', blogs);

    if (res.locals.api)
    {
      return res.send(blogs);
    }

    res.locals.blogs = blogs;
    next();
  });
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getLatestBlog(req, res, next)
{
  var cachedBlog = cache.get('latestBlog');
  if (cachedBlog !== undefined) {
    if (res.locals.api)
    {
      res.send(cachedBlog);
    }
    res.locals.latestBlog = cachedBlog;
    return next();
  }

  // TODO: Sanitize
  db.findWhere('blog', { publish: true }, { _id: 0 }, 1, {published_at: -1}, (err, docs) => {
    if (err)
    {
      docs = [];
    }

    var latestBlog = docs[0] || {};

    cache.set('latestBlog', latestBlog);

    if (res.locals.api)
    {
      return res.send(latestBlog);
    }

    res.locals.latestBlog = latestBlog;
    next();
  });
}
