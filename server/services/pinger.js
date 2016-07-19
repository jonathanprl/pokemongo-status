const Rest = require('restler');
const cheerio = require('cheerio');
const path = require('path');
const gcloud = require('gcloud');
const fetch = require('node-fetch');
const time = require('promise-time');
const schedule = require('node-schedule');

const status = require('../controllers/status.js');
const statusHistorical = require('../controllers/statusHistorical.js');
const swiftping = require('../helpers/swiftping.js');
const db = require('../db');
const config = require('../../config.js');

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
    pingGoogleServers();
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
        time: promise.time,
        friendly: 'Global',
        text: goStatus(promise.time),
        createdAt: new Date(),
        sort: 1,
        statusCode: goStatus(promise.time).toLowerCase().split(' ').join('-'),
        type: 'global'
      };

      status.upsertStatus(serverStatus, (err, doc) => {
        statusHistorical.createStatus(serverStatus, (err, doc) => {});
      });
    });
  });
}

function pingGoServer(server)
{
  const promise = time(fetch)(`https://pgorelease.nianticlabs.com/plfe/${server}/rpc`, { method: 'POST' });

  promise.then((res) => {
    console.log(res.status, promise.time);
    var serverStatus = {
      region: server,
      status: goStatus(promise.time, res.status) == 'Offline' ? false : true,
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
