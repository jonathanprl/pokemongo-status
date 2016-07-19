var status = require('./controllers/status');
var swiftping = require('./helpers/swiftping');
var pinger = require('./services/pinger.js');

pinger.startCron();

module.exports = function(app)
{
  app.get('/', status.getLatestStatus, function(req, res) {
    res.render('home/home');
  });

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
