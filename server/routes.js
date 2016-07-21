var status = require('./controllers/status');
var swiftping = require('./helpers/swiftping');
var pinger = require('./services/pinger');
var config = require('../config');


pinger.startCron();

module.exports = function(app)
{
  app.use('*', function(req, res, next) {
    res.locals.hostname = config.env == 'prod' ? 'http://pokegostat.us' : 'http://localhost:8282';
    next();
  });

  app.get('/', status.getLatestStatus, function(req, res) {
    res.render('home/home');
  }, status.statusEmitter);

  app.get('/robots.txt', function(req, res)
  {
    res.set('Content-Type', 'text/plain');
    res.send('User-agent: *\nAllow: /');
  });

  app.use('/api/*', function(req, res, next) {
    res.locals.api = true;
    next();
  });

  app.get('/api/status', status.getStatus);

  app.get('*', function(req, res)
  {
    res.redirect('/');
  });
};
