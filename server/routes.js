const status = require('./controllers/status');
const statusHistorical = require('./controllers/statusHistorical');
const swiftping = require('./helpers/swiftping');
const pinger = require('./services/pinger');
const config = require('../config');


pinger.startCron();
statusHistorical.startCron();
status.startCron();

module.exports = function(app)
{
  app.use('*', (req, res, next) => {
    res.locals.hostname = config.env == 'prod' ? 'http://pokegostat.us' : 'http://localhost:8282';
    next();
  });

  app.get('/', status.getLatestStatus, (req, res) => {
    res.render('home/home');
    statusHistorical.minutelyEmitter();
  });

  app.get('/robots.txt', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('User-agent: *\nAllow: /');
  });

  app.use('/api/*', (req, res, next) => {
    res.locals.api = true;
    next();
  });

  app.get('/api/status', status.getStatus);

  app.get('*', (req, res) => {
    res.redirect('/');
  });
};
