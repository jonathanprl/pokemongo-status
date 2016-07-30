const status = require('./controllers/status');
const statusHistorical = require('./controllers/statusHistorical');
const blog = require('./controllers/blog');
const faq = require('./controllers/faq');
const swiftping = require('./helpers/swiftping');
const sitemap = require('./helpers/sitemap');
const pinger = require('./services/pinger');
const config = require('../config');


pinger.startCron();
statusHistorical.startCron();
status.startCron();

module.exports = function(app)
{
  app.use('*', (req, res, next) => {
    res.locals.hostname = config.env == 'prod' ? 'http://pokegostat.us' : 'http://localhost:8282';
    res.locals.pageTitle = 'Pokemon Go Server Status';
    res.locals.pageDescription = 'Check the status of the official Pokemon Go servers. Know if the servers are down just for you, or for everyone.';
    res.locals.pageKeywords = 'pokemon go server status, pokemongo server status, pokemon go servers, pokemongo down, ninantic, pokemongo, server status, ptc login server';
    next();
  });

  app.get('/', blog.getLatestBlog, (req, res) => {
    res.render('home/home');
  });

  app.get('/blog', blog.getBlogs, (req, res) => {
    res.locals.pageTitle = 'Blog - Pokemon Go Server Status';
    res.render('home/blog');
  });

  app.get('/blog/:seo_url', blog.getBlogBySeo, (req, res) => {
    res.locals.pageTitle = res.locals.blogs[0].title + ' - Pokemon Go Server Status';
    res.locals.pageDescription = res.locals.blogs[0].short_content;
    res.locals.pageKeywords = res.locals.blogs[0].keywords.join(',');
    res.render('home/blog');
  });

  app.get('/status', (req, res) => {
    res.locals.pageTitle = 'Status - Pokemon Go Server Status';
    res.render('home/status');
  });

  app.get('/faq', faq.getFaqs, (req, res) => {
    res.locals.pageTitle = 'FAQ - Pokemon Go Server Status';
    res.render('home/faq');
  });

  app.get('/robots.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('User-agent: *\nAllow: /');
  });

  app.get('/sitemap.xml', sitemap.generateSitemap);

  app.use('/api/*', (req, res, next) => {
    res.locals.api = true;
    next();
  });

  app.get('/api/status', status.getStatus);

  app.get('*', (req, res) => {
    res.redirect('/');
  });
};
