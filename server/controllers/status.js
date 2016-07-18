var moment = require('moment');
var db = require('../db');
var swiftping = require('../helpers/swiftping');

module.exports = {
  createStatus,
  deleteStatus,
  getStatus,
  updateStatus,
  upsertStatus,
  getLatestStatus
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
  db.upsert('status', { code: status.code }, status,
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
  // TODO: Sanitize
  db.findWhere('status', {}, {}, 5, { createdAt: -1 },
    function(err, doc)
    {
      var statuses = doc.filter(function(status) {
        return status.region != 'global';
      });

      var global = doc.filter(function(status) {
        return status.region == 'global';
      })[0];

      statuses.unshift(global);

      var status = {
        statuses: statuses,
        lastUpdated: moment(doc[0].createdAt).fromNow()
      };

      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not fetch all status.'});
      }

      if (res.locals.api)
      {
        return swiftping.apiResponse('ok', res, status);
      }

      res.locals.status = status;
      next();
    }
  );
}
