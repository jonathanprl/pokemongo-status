'use strict';

var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var env = process.env.ENV || 'dev';
var config = require('../config');
var path = require('path');
var socket = require('./services/socket');

app.set('views', path.normalize(__dirname + '/../dist/views'));
app.set('view engine', 'jade');
app.use(bodyParser.json());
app.use(express.static(path.normalize(__dirname + '/../dist/assets')));

var server = app.listen(config.port);

socket.connect(server);

console.log('Listening on port %s. Current environment: %s', config.port, config.env);

module.exports = app;
