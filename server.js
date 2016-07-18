#!/usr/bin/env node

'use strict';

var app = require('./server/express.js');
require('./server/routes.js')(app);
require('./server/db.js');
