const moment = require('moment');
const schedule = require('node-schedule');

const db = require('../db');
const swiftping = require('../helpers/swiftping');
const socket = require('../services/socket');

module.exports = {
  createStatus,
  deleteStatus,
  getStatus,
  updateStatus,
  upsertStatus,
  updateLoginHistory,
  startCron
};

function startCron()
{
  var fiveMinutely = schedule.scheduleJob('*/5 * * * *', () => {
    updateLoginHistory('global');
    updateLoginHistory('ptc');
  });

  var fiveSecondly = schedule.scheduleJob('*/5 * * * * *', () => {
    db.findOneWhere('graphs', { code: 'ptcPastDay' }, {}, (err, graph) => {
      if (err || !graph || !graph.items || graph.items.length == 0)
      {
        return socket.emit('global', 'historicalLoginPTC', []);
      }
      socket.emit('global', 'historicalLoginPTC', graph.items);
    });
    db.findOneWhere('graphs', { code: 'globalPastDay' }, {}, (err, graph) => {
      if (err || !graph || !graph.items || graph.items.length == 0)
      {
        return socket.emit('global', 'historicalLoginGlobal', []);
      }
      socket.emit('global', 'historicalLoginGlobal', graph.items);
    });
  });
}

function updateLoginHistory(region)
{
  // let cachedDocs = cache.get('minutelyStatuses');
  // if (cachedDocs) {
  //   callback(null, cachedDocs);
  // }

  console.log('RUNNING AGGREGATE QUERY: updateLoginHistory');

  db.aggregate('statusHistorical', [
    {
      $match: {
        region: region,
        createdAt: { $gt: moment().subtract(1, 'day').toDate() }
      }
    },
    {
      $group: {
        _id: {
          day: { $dayOfYear: '$createdAt' },
          hour: { $hour: '$createdAt' },
          'minute': {
            '$subtract': [
              { '$minute': '$createdAt' },
              { '$mod': [{ '$minute': '$createdAt' }, 15] }
            ]
          }
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
        minute: '$_id.minute',
        createdAt: '$createdAt',
        avg: '$avg',
        max: '$max',
        min: '$min'
      }
    }
  ], {allowDiskUse: true}, (err, docs) => {
    if (err)
    {
      return;
    }

    db.upsert('graphs', { code: region + 'PastDay' }, { code: region + 'PastDay', items: docs, createdAt: new Date() }, (err, docs) => {
      console.log('FINISHED AGGREGATE QUERY: updateLoginHistory');
    });
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
