'use strict';

const swagger = require('./lib/swagger');

module.exports = app => {
  if (app.config.swagger.app) swagger(app);
};
