'use strict';

const swagger = require('./lib/swagger');

module.exports = agent => {
  if (agent.config.swagger.agent) swagger(agent);
};
