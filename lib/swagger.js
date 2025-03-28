'use strict';

const SwaggerClient = require('./client');

let count = 0;

module.exports = app => {
  app.addSingleton('swagger', createSwagger);
};

function createSwagger(config, app) {
  let client = new SwaggerClient();
  app.beforeStart(async () => {
    const index = count++;
    client.init(config, app);
    app.coreLogger.info(`[egg-cute-swagger] instance[${index}] status OK`);
  });
  return client;
}
