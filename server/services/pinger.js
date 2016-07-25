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

function startCron()
{
  var j = schedule.scheduleJob('* * * * *', () => {
    pingGoLoginServer();
    pingPTCLoginServer();
    pingGoogleServers();
  });

  schedule.scheduleJob('* * * * *', () => {
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
    (function(server) {
      schedule.scheduleJob(`${second} * * * * *`, () => {
        pingGoServer(server);
      });
    }(i));
  }
}

pingGoLoginServer();
function pingGoLoginServer()
{
  db.findOneWhere('settings', { _id: 'urls' }, (err, urls) => {
    const promise = time(fetch)(urls.global);
    promise.then((res) => {
      var serverStatus = {
        region: 'global',
        status: res.status == 200,
        responseCode: res.status,
        time: promise.time,
        friendly: 'Google',
        text: goStatus(promise.time, res.status),
        createdAt: new Date(),
        sort: 1,
        statusCode: goStatus(promise.time, res.status).toLowerCase().split(' ').join('-'),
        type: 'global'
      };

      status.upsertStatus(serverStatus, (err, doc) => {
        statusHistorical.createStatus(serverStatus, (err, doc) => {});
      });

      twitter.sendTweet('login_' + code);
    });
  });
}

function pingPTCLoginServer()
{
  db.findOneWhere('settings', { _id: 'urls' }, (err, urls) => {
    const promise = time(fetch)(urls.ptc);
    promise.then((res) => {
      var serverStatus = {
        region: 'ptc',
        status: res.status == 200,
        responseCode: res.status,
        time: promise.time,
        friendly: 'PTC',
        text: goStatus(promise.time, res.status),
        createdAt: new Date(),
        sort: 1,
        statusCode: goStatus(promise.time, res.status).toLowerCase().split(' ').join('-'),
        type: 'global'
      };

      status.upsertStatus(serverStatus, (err, doc) => {
        statusHistorical.createStatus(serverStatus, (err, doc) => {});
      });

      twitter.sendTweet('ptc_' + code);
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

    if (percentage >= 0.1 && percentage < 0.25) {
      twitter.sendTweet('server_potential-load');
      swiftping.logger('info', 'twitter', 'Servers may become busy soon. ' + percentage * 100 + '%');
    } else if (percentage >= 0.25 && percentage < 0.5) {
      twitter.sendTweet('server_medium-load');
      swiftping.logger('info', 'twitter', 'Servers are experiencing a medium load. ' + percentage * 100 + '%');
    } else if (percentage >= 0.5 && percentage < 0.75) {
      twitter.sendTweet('server_high-load');
      swiftping.logger('info', 'twitter', 'Servers are experiencing a high load. ' + percentage * 100 + '%');
    } else if (percentage >= 0.75) {
      twitter.sendTweet('server_max-load');
      swiftping.logger('info', 'twitter', 'Servers under extreme load. ' + percentage * 100 + '%');
    } else {
      twitter.sendTweet('server_normal-load');
      swiftping.logger('info', 'twitter', 'Server loads are okay! ' + percentage * 100 + '%');
    }
  });
}

function pingGoServer(server)
{
  const promise = time(fetch)(`https://pgorelease.nianticlabs.com/plfe/${server}/rpc`, { method: 'POST' });

  promise.then((res) => {
    var serverStatus = {
      region: server,
      status: goStatus(promise.time, res.status) == 'Offline' ? false : true,
      responseCode: res.status,
      time: promise.time,
      friendly: 'Server ' + server,
      text: goStatus(promise.time, res.status),
      createdAt: new Date(),
      sort: 1,
      statusCode: goStatus(promise.time, res.status).toLowerCase().split(' ').join('-'),
      type: 'server'
    };
    status.upsertStatus(serverStatus, (err, doc) => {
      statusHistorical.createStatus(serverStatus, (err, doc) => {

      });
    });
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
      status.upsertStatus(serverStatus, function(err, doc) {
        statusHistorical.createStatus(serverStatus, function(err, doc) {
        });
      });
    });
  });
}

function goStatus(time, status)
{
  if (status == 404)
  {
    return 'Offline';
  }

  if (time === -1) return 'Offline';
  if (time < 500) return 'Normal Load';
  if (time >= 500 && time < 3000) return 'Medium Load';
  if (time >= 3000 && time < 10000) return 'High Load';
  if (time >= 10000) return 'Max Load';
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
