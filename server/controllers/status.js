const moment = require('moment');
const db = require('../db');
const swiftping = require('../helpers/swiftping');
const socket = require('../services/socket');
const schedule = require('node-schedule');

module.exports = {
  createStatus,
  deleteStatus,
  getStatus,
  updateStatus,
  upsertStatus,
  getLatestStatus,
  statusEmitter,
  startCron
};

/**
 *
 // * @param {object} req - Express request
 // * @param {object} res - Express response
 */
function createStatus(status, callback)
{
  db.insert('status', status,
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
  db.remove('status', {_id: req.params.id},
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
  db.find('status',
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
  db.modify('status', {_id: req.params.id}, req.body,
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
  db.upsert('status', { region: status.region }, status,
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

function _getLatestStatus(callback)
{
  var types = ['global', 'region', 'server'];
  // TODO: Sanitize

  var promises = [];
  types.forEach(type => {
    promises.push(new Promise((resolve, reject) => {
      db.findWhere('status', { type: type }, { _id: 0, type:1, friendly: 1, text: 1, statusCode: 1, region: 1, time: 1 }, null, { region: 1 }, (err, docs) => {

        if (err) {
          console.log(err);
          return reject();
        }

        resolve({
          type: type,
          statuses: docs
        });
      });
    }));
  });

  Promise.all(promises).then(types => {
    var serverStatuses = types.filter((type) => { return type.type == 'server'; })[0].statuses;
    var onlineCount = serverStatuses.filter((status) => { return status.statusCode != 'offline'; }).length;

    var normalLoadCount = serverStatuses.filter((status) => { return status.statusCode == 'normal-load'; }).length;
    var mediumLoadCount = serverStatuses.filter((status) => { return status.statusCode == 'medium-load'; }).length;
    var highLoadCount = serverStatuses.filter((status) => { return status.statusCode == 'high-load'; }).length;
    var maxLoadCount = serverStatuses.filter((status) => { return status.statusCode == 'max-load'; }).length;

    var generalStatus = {
      code: 'normal-load',
      text: 'Normal Load'
    };

    if (((mediumLoadCount + highLoadCount + maxLoadCount) / onlineCount) > 0.1) {
      generalStatus = {
        code: 'medium-load',
        text: 'Medium Load'
      };
    } else if (((mediumLoadCount + highLoadCount + maxLoadCount) / onlineCount) > 0.5) {
      generalStatus = {
        code: 'high-load',
        text: 'High Load'
      };
    } else if (((mediumLoadCount + highLoadCount + maxLoadCount) / onlineCount) > 0.75) {
      generalStatus = {
        code: 'max-load',
        text: 'Major Issues'
      };
    }


    var status = {
      stats: {
        totalCount: serverStatuses.length,
        onlineCount: onlineCount,
        offlineCount: serverStatuses.length - onlineCount,
        normalLoadCount: normalLoadCount,
        mediumLoadCount: mediumLoadCount,
        highLoadCount: highLoadCount,
        maxLoadCount: maxLoadCount,
        generalStatus: generalStatus
      },
      regionStatuses: types.filter((type) => { return type.type == 'region'; })[0].statuses,
      globalStatuses: types.filter((type) => { return type.type == 'global'; })[0].statuses
    };

    callback(null, status);
  });
}

function getLatestStatus(req, res, next)
{
  _getLatestStatus((err, status) => {
    if (res.locals.api)
    {
      return swiftping.apiResponse('ok', res, status);
    }

    res.locals.status = status;
    next();
  });
}

function statusEmitter()
{
  _getLatestStatus((err, status) => {
    socket.emit('global', 'status', status);
  });
}

function startCron()
{
  schedule.scheduleJob('*/5 * * * * *', () => {
    statusEmitter();
  });
}
