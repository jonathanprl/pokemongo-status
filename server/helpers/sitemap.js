var db = require('../db');
var sm = require('sitemap');

module.exports = {
  generateSitemap
};

function generateSitemap(req, res)
{
  db.find('blog', (err, blogs) => {

    var urls = [];

    blogs.forEach(function(blog) {
      urls.unshift({ url: '/blog/' + blog.seo_url });
    });

    urls.unshift(
      { url: '/' },
      { url: '/status' },
      { url: '/faq' },
      { url: '/blog' }
    );

    sitemap = sm.createSitemap ({
      hostname: 'http://pokegostat.us',
      cacheTime: 600000,        // 600 sec - cache purge period
      urls: urls
    });

    sitemap.toXML(function (err, xml) {
      if (err) {
        return res.status(500).end();
      }
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    });
  });
}
