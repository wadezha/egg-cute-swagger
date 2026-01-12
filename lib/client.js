'use strict';

const router = require('./router');
const DocumentClient = require('./document');

class SwaggerClient {
  constructor () {
    this.rules;
    this.definitions;
  }

  init(config, app) {
    const document = new DocumentClient(config, app);
    this.rules = document.buildDocumentRule();
    this.definitions = document.__CONTRACT__.buildDefinitionRule().definitions;
    if (config.enable) {
      router.swaggerRouterRegister(app);
    }
  }

  validate(data, ctx, callback, rule = null) {
    if (!ctx.app.validator) {
      throw new Error('The validator plugin is not installed');
    }

    const matched = ctx.app.router.match(ctx.path, ctx.method);
    const route = (matched?.pathAndMethod || []).find(p => p.path);
    const url = route?.path || ctx.url;

    rule = rule ? rule : (this.rules || {})[`${url}.${ctx.method}`.toLowerCase()];
    // data有body/query/path/headers, 则rule中也必须要有
    if (!rule || Object.keys(data).filter(f => !Object.keys(rule).includes(f)).length > 0) {
      throw new Error('Validation rules for data not found');
    }

    data = { ...{ body: {}, query: {}, path: {} }, ...data };
    let errors = [];
    for (const position of Object.keys(rule)) {
      let temp = (position === 'body' && Object.keys(rule[position]).length === 1 && Object.keys(rule[position])[0] === 'body') ? { body: data[position] } : data[position];
      const error = ctx.app.validator.validate(rule[position], temp);
      errors = [...errors, ...(error || []).map(m => Object.assign(m, { position }))];
      // body单个无name时规则与数据会被改装成 { body: { body: {} } }
      temp = Object.keys(rule[position]).find(f => ['body'].includes(f)) ? temp[position] : temp;
      Object.keys(temp).forEach(f => {
        if (position === 'path') ctx.params[f] = temp[f];
        if (['body', 'query'].includes(position)) ctx.request[position][f] = temp[f];
      });
      // headers 不处理
    }

    if (callback && typeof callback === 'function') callback(errors, ctx);
    return errors;
  }
}

module.exports = SwaggerClient;
