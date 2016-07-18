var db = require('../db');
var swiftping = require('../helpers/swiftping');

module.exports = {
  createSetting,
  deleteSetting,
  getSetting,
  getSettings,
  updateSetting,
  upsertSetting
};

/**
 *
 // * @param {object} req - Express request
 // * @param {object} res - Express response
 */
function createSetting(setting, callback)
{
  db.insert('settings', setting,
    function(err, doc)
    {
      if (err)
      {
        callback({code: 'server_error', message: 'Could not create setting.', error: err});
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
function deleteSetting(req, res)
{
  // TODO: Sanitize
  db.remove('settings', {_id: req.params.id},
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not delete setting.'});
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
function getSetting(req, res, next)
{
  // TODO: Sanitize
  db.find('settings',
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not fetch all setting.'});
      }

      if (res.locals.api)
      {
        return swiftping.apiResponse('ok', res, doc);
      }

      res.locals.setting = doc;
      next();
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function getSettings(req, res, next)
{
  // TODO: Sanitize
  db.find('settings',
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not fetch all setting.'});
      }

      if (res.locals.api)
      {
        return swiftping.apiResponse('ok', res, doc);
      }

      res.locals.setting = doc;
      next();
    }
  );
}

/**
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 */
function updateSetting(req, res)
{
  // TODO: Sanitize
  db.modify('settings', {_id: req.params.id}, req.body,
    function(err, doc)
    {
      if (err)
      {
        return swiftping.apiResponse('error', res, {code: 'server_error', message: 'Could not update setting.'});
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
function upsertSetting(setting, callback)
{
  db.upsert('settings', { code: setting.code }, setting,
    function(err, doc)
    {
      if (err)
      {
        callback({code: 'server_error', message: 'Could not upsert setting.', error: err});
      }
      callback(null, doc);
    }
  );
}
