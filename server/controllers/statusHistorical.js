const moment = require('moment');
const schedule = require('node-schedule');
const NodeCache = require('node-cache');

const db = require('../db');
const swiftping = require('../helpers/swiftping');
const socket = require('../services/socket');

module.exports = {
  createStatus,
  deleteStatus,
  getStatus,
  updateStatus,
  upsertStatus,
  getMinutelyStatuses,
  minutelyEmitter,
  startCron
};

const cache = new NodeCache({ stdTTL: 580, checkperiod: 600 });

function getMinutelyStatuses(type, callback)
{
  // let cachedDocs = cache.get('minutelyStatuses');
  // if (cachedDocs) {
  //   callback(null, cachedDocs);
  // }

  db.aggregate('statusHistorical', [
    {
      $match: {
        type: type,
        createdAt: { $gt: moment().subtract(1, 'week').toDate() }
      }
    },
    {
      $group: {
        _id: {
          day: { $dayOfYear: '$createdAt' },
          hour: { $hour: '$createdAt' }
        },
        avg: { $avg: '$time' },
        max: { $max: '$time' },
        min: { $min: '$time' },
        createdAt: { $first: '$createdAt' }
      }
    },
    {
      $sort: {
        createdAt: 1
      }
    },
    {
      $project: {
        _id: 0,
        day: '$_id.day',
        hour: '$_id.hour',
        avg: '$avg',
        max: '$max',
        min: '$min'
      }
    }
  ], {allowDiskUse: true}, (err, docs) => {
    if (err)
    {
      return callback(err);
    }

    cache.set('minutelyStatuses', docs);

    callback(null, docs);
  });
}

/**
 *
 // * @param {object} req - Express request
 // * @param {object} res - Express response
 */
function createStatus(status, callback)
{
  db.insert('statusHistorical', status,
    function(err, doc)
    {
      if (err)
      {
        callback({code: 'server_error', message: 'Could not create status.', error: err});
      }
      callback(null, doc);
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function deleteStatus(req, res)
{
  // TODO: Sanitize
  db.remove('statusHistorical', {_id: req.params.id},
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not delete status.'});
      }
      return swiftping.apiResponse('ok', res, doc);
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getStatus(req, res, next)
{
  // TODO: Sanitize
  db.find('statusHistorical',
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not fetch all status.'});
      }

      if (res.locals.api)
      {
        return swiftping.apiResponse('ok', res, doc);
      }

      res.locals.status = doc;
      next();
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function updateStatus(req, res)
{
  // TODO: Sanitize
  db.modify('statusHistorical', {_id: req.params.id}, req.body,
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not update status.'});
      }
      return swiftping.apiResponse('ok', res, doc);
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function upsertStatus(status, callback)
{
  db.upsert('statusHistorical', { code: status.code }, status,
    function(err, doc)
    {
      if (err)
      {
        callback({code: 'server_error', message: 'Could not upsert status.', error: err});
      }
      callback(null, doc);
    }
  );
}

function getLatestStatus(req, res, next)
{
  var regions = ['global', 'us-east1', 'us-west1', 'us-central1', 'europe-west1', 'asia-east1'];
  // TODO: Sanitize

  db.findWhere('statusHistorical', { region: 'global' }, {}, 1, { createdAt: -1 }, (err, docs) => {
    if (err) console.log(err);

    var promises = [];
    regions.forEach(region => {
      promises.push(new Promise((resolve, reject) => {
        db.findWhere('statusHistorical', { region: region }, {}, 1, { createdAt: -1 }, (err, docs) => {

          if (err || docs.length == 0) {
            console.log(err);
            return reject();
          }

          var dbRegion = docs[0];

          if (!docs[0].status)
          {
            dbRegion.status = false;
            dbRegion.text = 'Offline';
            dbRegion.statusCode = 'offline';
          }

          resolve(dbRegion);
        });
      }));
    });

    Promise.all(promises).then(statuses => {
      var globalStatuses = statuses.filter(status => {
        return status.type == 'global';
      });

      var regionStatuses = statuses.filter(status => {
        return status.type != 'region';
      });

      var serverStatuses = statuses.filter(status => {
        return status.type != 'server';
      });

      var status = {
        serverStatuses: serverStatuses,
        regionStatuses: regionStatuses,
        globalStatuses: globalStatuses,
        lastUpdated: moment(statuses[0].createdAt).format('HH:mm'),
        lastUpdatedHuman: moment(statuses[0].createdAt).fromNow()
      };

      if (res.locals.api)
      {
        return swiftping.apiResponse('ok', res, status);
      }

      res.locals.status = status;
      next();
    });
  });
}

function minutelyEmitter()
{
  getMinutelyStatuses('server', (err, status) => {
    socket.emit('global', 'historicalServers', status);
  });

  getMinutelyStatuses('global', (err, status) => {
    socket.emit('global', 'historicalLogin', status);
  });
}

function startCron()
{
  schedule.scheduleJob('0 * * * *', () => {
    minutelyEmitter();
  });
}
