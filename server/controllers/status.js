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
  var regions = ['global', 'us-east1', 'us-west1', 'us-central1', 'europe-west1', 'asia-east1'];
  // TODO: Sanitize

  db.findWhere('status', { region: 'global' }, {}, 1, { createdAt: -1 }, (err, docs) => {
    if (err) console.log(err);

    var promises = [];
    regions.forEach(region => {
      promises.push(new Promise((resolve, reject) => {
        db.findWhere('status', { region: region }, {}, 1, { createdAt: -1 }, (err, docs) => {

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
      var status = {
        statuses: statuses,
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
