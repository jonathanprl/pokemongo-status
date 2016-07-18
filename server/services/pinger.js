const Rest = require('restler');
const cheerio = require('cheerio');
const path = require('path');
const gcloud = require('gcloud');
const fetch = require('node-fetch');
const time = require('promise-time');

const status = require('../controllers/status.js');
const swiftping = require('../helpers/swiftping.js');
const db = require('../db');

var gce = gcloud.compute({
  projectId: 'gamerstats-1349',
  keyFilename: path.normalize(__dirname + '/../resources/g.json')
});

module.exports = {
  pingGoServers,
  pingGoogleServers
};

function pingGoServers()
{
  db.findOneWhere('settings', { _id: 'urls' }, (err, urls) => {
    const promise = time(fetch)(urls.global);
    promise.then(() => {
      status.createStatus({
        region: 'global',
        status: true,
        time: promise.time,
        sub: false,
        friendly: 'Global',
        text: goStatus(promise.time),
        createdAt: new Date(),
        sort: 1,
        statusCode: goStatus(promise.time).toLowerCase().split(' ').join('-')
      }, (err, doc) => {
      });
    });
  });
}

function pingGoogleServers()
{
  gce.getRegions(function(err, regions) {
    regions.forEach(function(region) {
      status.createStatus({
        region: region.id,
        status: region.metadata.status == 'UP' ? true : false,
        time: 1,
        sub: true,
        friendly: friendlyRegionName(region.name),
        text: region.metadata.status == 'UP' ? 'Online' : 'Offline',
        createdAt: new Date(),
        sort: 2,
        statusCode: region.metadata.status == 'UP' ? 'online' : 'offline'
      }, function(err, doc) {
      });
    });
  });
}

function goStatus(time)
{
  if (time === -1) return 'Offline';
  if (time < 500) return 'Online';
  if (time >= 500 && time < 2000) return 'Medium load';
  if (time >= 2000 && time < 5000) return 'High Load';
  if (time >= 5000) return 'Offline';
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
