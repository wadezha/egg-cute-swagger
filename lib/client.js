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

  validate(data, ctx, callback) {
    if (!ctx.app.validator) {
      throw new Error('The validator plugin is not installed');
    }

    const matched = ctx.app.router.match(ctx.path, ctx.method);
    const route = (matched?.pathAndMethod || []).find(p => p.path);
    const url = route?.path || ctx.url;

    const rule = (this.rules || {})[`${url}.${ctx.method}`.toLowerCase()];
    // data有body/query/path/headers, 则rule中也必须要有
    if (!rule || Object.keys(data).filter(f => !Object.keys(rule).includes(f)).length > 0) {
      throw new Error('Validation rules for data not found');
    }
    let errors = [];
    for (const position of Object.keys(rule)) {
      const temp = (position === 'body' && Object.keys(rule[position]).length === 1 && Object.keys(rule[position])[0] === 'body') ? { body: data[position] } : data[position];
      const error = ctx.app.validator.validate(rule[position], temp);
      errors = [...errors, ...(error || []).map(m => Object.assign(m, { position }))];
    }
    if (callback && typeof callback === 'function') callback(errors, ctx);
    return errors;
  }
}

module.exports = SwaggerClient;
