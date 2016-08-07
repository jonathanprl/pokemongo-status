const Rest = require('restler');
const cheerio = require('cheerio');
const path = require('path');
const gcloud = require('gcloud');
const fetch = require('node-fetch');
const time = require('promise-time');
const schedule = require('node-schedule');
const moment = require('moment');

const status = require('../controllers/status');
const statusHistorical = require('../controllers/statusHistorical');
const swiftping = require('../helpers/swiftping');
const db = require('../db');
const config = require('../../config');
const twitter = require('../services/twitter');

var gce = gcloud.compute({
  projectId: 'gamerstats-1349',
  keyFilename: path.normalize(__dirname + '/../resources/g.json')
});

module.exports = {
  pingGoLoginServer,
  pingGoogleServers,
  startCron
};

var statusTypes = [];
db.find('statusTypes', (err, docs) => {
  statusTypes = docs;
});

let serverCounter = {};

function startCron()
{
  var j = schedule.scheduleJob('* * * * *', () => {
    pingGoLoginServer();
    pingPTCLoginServer();
    pingGoogleServers();
  });

  schedule.scheduleJob('*/15 * * * *', () => {
    tweetServerStatus();
  });

  if (!config.pingAllServers) {
    console.log('Ping all servers is disabled');
    return false;
  }

  var servers = 600;

  for (var i=1;i<=servers;i++)
  {
    var second = i % 60;
    serverCounter[i] = 10;
    (function(server) {
      schedule.scheduleJob(`${second} * * * * *`, () => {
        pingGoServer(server);
      });
    }(i));
  }
}

serverCounter['google'] = 10;
pingGoLoginServer();
function pingGoLoginServer()
{
  serverCounter['google']++;
  db.findOneWhere('settings', { _id: 'urls' }, (err, urls) => {
    const promise = time(fetch)(urls.global);
    promise.then((res) => {
      var statusText = 'Offline';
      var statusCode = 'offline';

      var statusType = statusTypes.filter(statusType => {
        return statusType.type == 'time' && promise.time >= statusType.gt && promise.time < statusType.lt;
      })[0];

      if (statusType)
      {
        statusCode = statusType.code;
        statusText = statusType.friendly;
      }

      var serverStatus = {
        region: 'global',
        status: res.status == 200,
        responseCode: res.status,
        time: promise.time,
        friendly: 'Google',
        text: statusText,
        createdAt: new Date(),
        sort: 1,
        statusCode: statusCode,
        type: 'global'
      };

      status.upsertStatus({ region: 'global', type: 'global' }, serverStatus, (err, doc) => {
        if (err) swiftping.logger('error', 'Google Upsert', {code: 'server_error', message: 'Could not upsert status.', error: err});
      });

      if (serverCounter['google'] >= 10)
      {
        statusHistorical.createStatus(serverStatus, (err, doc) => {});
        serverCounter['google'] = 0;
      }

      twitter.sendTweet('login_' + code);
    });
  });
}

serverCounter['ptc'] = 10;
pingPTCLoginServer();
function pingPTCLoginServer()
{
  serverCounter['ptc']++;
  db.findOneWhere('settings', { _id: 'urls' }, (err, urls) => {
    const promise = time(fetch)(urls.ptc);
    promise.then((res, data) => {
      res.text().then(function(body) {
        let status = res.status == 200;
        let time = promise.time;

        let $ = cheerio.load(body);
        if ($('#maintenance').length > 0)
        {
          time = Math.ceil(Math.random() * 10000) + 18000;
          status = false;
        }

        var statusText = 'Offline';
        var statusCode = 'offline';

        var statusType = statusTypes.filter(statusType => {
          return statusType.type == 'time' && promise.time >= statusType.gt && promise.time < statusType.lt;
        })[0];

        if (statusType)
        {
          statusCode = statusType.code;
          statusText = statusType.friendly;
        }

        var serverStatus = {
          region: 'ptc',
          status: res.status == 200,
          responseCode: res.status,
          time: time,
          friendly: 'PTC',
          text: statusText,
          createdAt: new Date(),
          sort: 1,
          statusCode: statusCode,
          type: 'global'
        };

        db.upsert('status', { region: 'ptc', type: 'global' }, serverStatus, (err, doc) => {
          if (err) swiftping.logger('error', 'PTC Upsert', {code: 'server_error', message: 'Could not upsert status.', error: err});
        });

        if (serverCounter['ptc'] >= 10)
        {
          statusHistorical.createStatus(serverStatus, (err, doc) => {});
          serverCounter['ptc'] = 0;
        }

        twitter.sendTweet('ptc_' + code);
      });
    });
  });
}

function tweetServerStatus()
{
  swiftping.logger('info', 'twitter', 'Checking server load statuses...');
  db.findWhere('statusHistorical', {
    type: 'server',
    createdAt: {
      $gt: moment().subtract(5, 'minutes').toDate()
    }
  }, {}, (err, docs) => {
    var statuses = docs.map(doc => {
      return doc.statusCode;
    });

    var abnormalLoad = statuses.filter(status => {
      return status == 'medium-load' || status == 'high-load' || status == 'max-load';
    });

    var percentage = 0;

    if (abnormalLoad.length > 0)
    {
      percentage = abnormalLoad.length / statuses.length;
    }

    percentage *= 100;

    var statusType = statusTypes.filter(statusType => {
      return statusType.type == 'percentage' && percentage >= statusType.gt && percentage < statusType.lt;
    })[0];

    twitter.sendTweet('server_' + statusType.code);
    swiftping.logger('info', 'twitter', statusType.friendly + ' ' + percentage + '%');
  });
}

function pingGoServer(server)
{
  serverCounter[server]++;
  const promise = time(fetch)(`https://pgorelease.nianticlabs.com/plfe/${server}/rpc`, { method: 'POST' });

  promise.then((res) => {
    var statusText = 'Offline';
    var statusCode = 'offline';

    var statusType = statusTypes.filter(statusType => {
      return statusType.type == 'time' && promise.time >= statusType.gt && promise.time < statusType.lt;
    })[0];

    if (statusType)
    {
      statusCode = statusType.code;
      statusText = statusType.friendly;
    }

    var serverStatus = {
      region: server,
      status: statusCode == 'offline' ? false : true,
      responseCode: res.status,
      time: promise.time,
      friendly: 'Server ' + server,
      text: statusText,
      createdAt: new Date(),
      sort: 1,
      statusCode: statusCode,
      type: 'server'
    };

    db.upsert('status', { region: serverStatus.region, type: serverStatus.type }, serverStatus, (err, doc) => {
      if (err) swiftping.logger('error', 'PTC Upsert', {code: 'server_error', message: 'Could not upsert status.', error: err});
    });

    if (serverCounter[server] >= 10)
    {
      statusHistorical.createStatus(serverStatus, (err, doc) => {});
      serverCounter[server] = 0;
    }
  });
}

function pingGoogleServers()
{
  gce.getRegions(function(err, regions) {
    regions.forEach(function(region) {
      var serverStatus = {
        region: region.id,
        status: region.metadata.status == 'UP' ? true : false,
        responseCode: 'N/A',
        time: 1,
        friendly: friendlyRegionName(region.name),
        text: region.metadata.status == 'UP' ? 'Online' : 'Offline',
        createdAt: new Date(),
        sort: 2,
        statusCode: region.metadata.status == 'UP' ? 'online' : 'offline',
        type: 'region'
      };
      status.upsertStatus({ region: region.id, type: 'region' }, serverStatus, function(err, doc) {
        statusHistorical.createStatus(serverStatus, function(err, doc) {
        });
      });
    });
  });
}

function friendlyRegionName(name)
{
  return name.split('-').map(function(s) {
    if (s == 'us')
    {
      return s.toUpperCase();
    }
    return s[0].toUpperCase() + s.substring(1);
  }).join(' ').slice(0, -1);
}
