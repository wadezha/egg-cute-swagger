'use strict';

const router = require('./router');
const DocumentClient = require('./document');

class SwaggerClient {
  constructor () {
    this.rules;
  }

  init(config, app) {
    const document = new DocumentClient(config, app);
    this.rules = document.buildDocumentRule();
    if (config.enable) {
      router.swaggerRouterRegister(app);
    }
  }

  validate(data, ctx) {
    if (!ctx.app.validator) {
      throw new Error('The validator plugin is not installed');
    }

    const { url, method } = ctx;
    const rule = (this.rules || {})[`${url.split('?')[0]}.${method}`];
    // data有body/query/path/headers, 则rule中也必须要有
    if (!rule || Object.keys(data).filter(f => !Object.keys(rule).includes(f)).length > 0) {
      throw new Error('Validation rules for data not found');
    }

    Object.keys(data).forEach(f => {
      ctx.app.validator.validate(rule[f], data[f]);
    });
  }
}

module.exports = SwaggerClient;
