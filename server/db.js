var config = require('../config');
var mongodb = require('mongojs')(config.mongodb.connection);

module.exports = {
  find,
  findWhere,
  findOne,
  findOneWhere,
  insert,
  upsert,
  update,
  modify,
  remove,
  drop,
  aggregate
};

/**
 * Finds all records in the collection
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function find(collectionName, limit, sort, callback)
{
  if (typeof limit === 'function') {
    callback = limit;
    limit = null;
    sort = null;
  } else if (typeof sort === 'function') {
    callback = sort;
    sort = null;
  }

  limit = limit ? limit : 1000;
  sort = sort ? sort : {};

  mongodb.collection(collectionName).find({}).limit(limit).sort(sort).toArray(function (err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Finds record in the collection where
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function findWhere(collectionName, query, projection, limit, sort, callback)
{
  if (typeof limit === 'function') {
    callback = limit;
    limit = null;
    sort = null;
  } else if (typeof sort === 'function') {
    callback = sort;
    sort = null;
  }

  limit = limit ? limit : 1000;
  sort = sort ? sort : {};

  mongodb.collection(collectionName).find(query, projection).limit(limit).sort(sort).toArray(function (err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Finds one record in the collection
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function findOne(collectionName, query, callback)
{
  mongodb.collection(collectionName).findOne(query, function (err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Finds record in the collection where
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function findOneWhere(collectionName, query, projection, callback)
{
  mongodb.collection(collectionName).findOne(query, projection,
    function (err, docs)
    {
      if (err)
      {
        console.log(err);
        callback(err, null);
        return;
      }

      callback(null, docs);
    }
  );
}

/**
 * Insert document into a collection
 * @param {string} collectionName - MongoDB collection name
 * @param {object} doc - Document
 * @param {function} callback - Success or error callback function
 */
function insert(collectionName, doc, callback)
{
  mongodb.collection(collectionName).insert(doc, function(err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Modify doc in the collection
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function modify(collectionName, query, update, callback)
{
  mongodb.collection(collectionName).findAndModify({query: query, update: update}, function (err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Insert document into a collection if doesn't already exist
 * @param {string} collectionName - MongoDB collection name
 * @param {string} query - MongoDB query
 * @param {object} doc - Document
 * @param {function} callback - Success or error callback function
 */
function upsert(collectionName, query, doc, callback)
{
  if ('_id' in query)
  {
    query._id = mongodb.ObjectId(query._id);
  }
  mongodb.collection(collectionName).update(query, doc, {upsert: true}, function(err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}

/**
 * Update document in collection which matches query
 * @param {string} collectionName - MongoDB collection name
 * @param {string} query - MongoDB query
 * @param {object} doc - Document
 * @param {function} callback - Success or error callback function
 */
function update(collectionName, query, doc, callback)
{
  if ('_id' in query)
  {
    query._id = mongodb.ObjectId(query._id);
  }
  mongodb.collection(collectionName).update(query, doc, function(err, doc)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, doc);
  });
}

/**
 * Remove document that matches query
 * @param {string} collectionName - MongoDB collection name
 * @param {string} query - MongoDB query
 * @param {function} callback - Success or error callback function
 */
function remove(collectionName, query, callback)
{
  // TODO: Move to middleware?
  if ('_id' in query)
  {
    query._id = mongodb.ObjectId(query._id);
  }

  mongodb.collection(collectionName).remove(query, function(err, doc)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, doc);
  });
}

/**
 * Drop collection
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function drop(collectionName, callback)
{
  mongodb.collection(collectionName).drop(function(err, doc)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, doc);
  });
}

/**
 * Aggregate collection
 * @param {string} collectionName - MongoDB collection name
 * @param {function} callback - Success or error callback function
 */
function aggregate(collectionName, query, options, callback)
{
  mongodb.collection(collectionName).aggregate(query, options, function (err, docs)
  {
    if (err)
    {
      console.log(err);
      callback(err, null);
      return;
    }

    callback(null, docs);
  });
}
