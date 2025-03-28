
const util = require('./util');
const appRouters = require('egg-cute-router').routers;

const ContractFiled = require('./contract');
const AbstractField = require('./field');

class DocumentClient extends AbstractField {

  static instance = null;
  constructor (config, app) {
    if(DocumentClient.instance) {
      delete DocumentClient.instance.createInstance;
      return DocumentClient.instance;
    }
    super(config);
    this.__DOCUMENT_SWAGGER__;
    this.__DOCUMENT_RULES__;
    this.__CONTRACT__ = new ContractFiled(config, app);

    return DocumentClient.instance = this;
  }

  buildDocumentSwagger() {
    if (this.__DOCUMENT_SWAGGER__) {
      return this.__DOCUMENT_SWAGGER__;
    }

    // 遍历contract,组装swagger.definitions
    const definitions = this.__CONTRACT__.buildDefinitionSwagger();

    // 递归获取 tags&paths
    const tagPath = this.buildTagPath(this.config, definitions);

    // build document
    this.__DOCUMENT_SWAGGER__ = {
      host: '',
      swagger: '2.0',
      basePath: this.config.basePath,
      info: this.config.apiInfo,
      schemes: this.config.schemes,
      tags: tagPath.tags,
      paths: tagPath.paths,
      securityDefinitions: this.config.securityDefinitions,
      definitions,
    };
    return this.__DOCUMENT_SWAGGER__;
  }

  buildTagPath(config, definitions) {
    const routers = appRouters.filter(f => !f.ignore);
    const tags = [];
    const paths = {};
    for (const router of routers) {
      const tag = `${router.controllerGroup ? router.controllerGroup + '/' : ''}${router.controllerSummary || router.controller}`;
      if (!tags.find(f => f.name === tag)) {
        tags.push({ name: tag, description: router.controllerDesc });
      }

      const permission = `<p><b>Permission</b> <span style="font-size:13px;padding:0 6px 3px 6px;border-radius:4px;background-color:#f2eefd;color:#9373ee;">${router.permission}</span></p>`;
      const swagger = {};
      swagger.tags = [tag];
      swagger.summary = router.handlerSummary || router.handler;
      swagger.description = `<p style="font-size:13px;">${router.handlerDesc}</p> ${router.permission ? permission : ''}`;
      swagger.operationId = router.url.replace(/^\/+|\/+$/g, '').replace(/\//g, '.');
      swagger.consumes = router.consume ? router.consume.split(',') : config.consumes;
      swagger.produces = router.produce ? router.produce.split(',') : config.produces;
      swagger.parameters = this.buildParameterSwagger(router, definitions);
      swagger.security = this.buildSecurity(router.security, config);
      swagger.responses = this.buildResponses(router, config, definitions);
      swagger.deprecated = router.deprecated;

      util.ensurePathExists(paths, `${router.url},${router.method}`, {});
      paths[router.url][router.method] = swagger;
    }
    return { tags, paths };
  }

  /**
   * 解析安全验证
   * @param {Array} security 设定的安全验证名称
   * @param {Object} config swagger配置
   * @returns {Array} [{ apikey1: [{ type: 'apiKey', }] }, { oauth: ['scopes1', 'scopes2'] }]
   */
  buildSecurity(security, config) {
    const configSecuritys = config.enableSecurity ? config.securityDefinitions : {};
    const keys = security ? Object.keys(configSecuritys).filter(f => security.split(',').includes(f)) : Object.keys(configSecuritys);
    const valFunc = (key) => {
      if (config.securityDefinitions[key].type === 'apiKey') return [config.securityDefinitions[key]];
      if (config.securityDefinitions[key].type === 'oauth2') return Object.keys(config.securityDefinitions[key].scopes);
    };

    return keys.map(k => ({ [k]: valFunc(k) }));
  }

  buildParameterSwagger(router, definitions) {
    const requests = (router.request ?? []).map(m => this.buildFieldSwagger(m.position, m, `${router.controller} ${router.handler}: ${m.position}.${m.name}`, definitions));

    // body 需要合并, 支持 User, array[string]/array[User]
    // query/path/headers: 支持 integer/string/boolean/number, array[string]
    const bodyParams = requests.filter(f => f.in === 'body');
    if (requests.length === 0 || bodyParams.length === 0) {
      return requests;
    }

    // { in: 'body', name: 'id', description: '', type: 'string', example: '' }
    // { in: 'body', name: 'po', description: '', '$ref': '#/definitions/pVo' }
    // { in: 'body', name: 'pos', description: '', type: 'array', items: { '$ref': '#/definitions/pVo' } }
    // =>
    // { in: 'body', description: '', schema: { type: 'object', properties: { id: { type: 'string', example: '' } } } }
    // { in: 'body', description: '', schema: { '$ref': '#/definitions/pVo', description: '' } }
    // { in: 'body', description: '', schema: { type: 'array', description: '', items: { '$ref': '#/definitions/pVo' } } }
    // body只有一条数据 且 类型是object与array时 改装数据返回 
    if (bodyParams.length === 1 && bodyParams.find(f => f.hasOwnProperty('$ref') || f.type === 'array')) {
      const schema = Object.assign({}, ...Object.keys(bodyParams[0]).filter(f => ['type', '$ref', 'items'].includes(f)).map(f => ({ [f]: bodyParams[0][f] })));
      return [...requests.filter(f => f.in !== 'body'), ...[{ in: 'body', name: 'body', description: bodyParams[0].description || '', required: true, schema }]];
    }

    // body有多条数据时, name一定要有, 将多条数据组装成object类型
    if (bodyParams.find(f => !f.name)) {
      throw new Error(`[egg-cute-swagger] ${router.controller} ${router.handler}: body.name does not empty`);
    }

    const properties = bodyParams.reduce((acc, m) => {
      acc[m.name] = Object.assign({}, ...Object.keys(m).filter(f => !['in', 'name'].includes(f)).map(f => ({ [f]: m[f] })));
      return acc;
    }, {});

    return [...requests.filter(f => f.in !== 'body'), ...[{ in: 'body', name: 'body', description: '', required: true, schema: { type: 'object', properties } }]];
  }

  // { name: 'id', description: '', type: 'string', example: '' }
  // { name: 'po', description: '', '$ref': '#/definitions/pVo' }
  // { name: 'pos', description: '', type: 'array', items: { '$ref': '#/definitions/pVo' } }
  // =>
  // { 200: { schema: { type: 'object', properties: { code: { type: 'number', example: 0 }, msg: { type: 'string', example: 'success' }, data: { isRef: true } } }, description: 'OK' } }
  // { 200: { schema: { type: 'boolean' }, description: 'OK' } }
  // { 200: { schema: { type: 'array', items: { '$ref': '#/definitions/productVo' } }, description: 'OK' } }
  // { 200: { schema: { '$ref': '#/definitions/productVo' }, description: 'OK' } }
  buildResponses(router, config, definitions) {
    const temp1 = config.responses || { 200: { schema: { isRef: true }, description: 'OK' } };
    const temp2 = config.responses || { 200: { schema: { type: 'object', properties: { isRef: true } }, description: 'OK' } };
    const responses = (router.response ?? []).map(m => this.buildFieldSwagger('response', m, `${router.controller} ${router.handler}: ${m.position}.${m.name}`, definitions));

    // 需要合并, 支持 User, array[string]/array[User]
    if (responses.length === 0) {
      return JSON.parse(JSON.stringify(temp1).replace(`{"isRef":true}`, `{}`));
    }

    if (responses.length === 1) {
      const properties = Object.assign({}, ...Object.keys(responses[0]).filter(f => !['name', 'in'].includes(f)).map(f => ({ [f]: responses[0][f] })));
      return JSON.parse(JSON.stringify(temp1).replace(`{"isRef":true}`, JSON.stringify(properties)));
    }

    if (responses.find(f => !f.name)) {
      throw new Error(`[egg-cute-swagger] ${router.controller} ${router.handler}: response.name does not empty`);
    }

    const properties = responses.reduce((acc, m) => {
      acc[m.name] = Object.assign({}, ...Object.keys(m).filter(f => !['name', 'in'].includes(f)).map(f => ({ [f]: m[f] })));
      return acc;
    }, {});

    return JSON.parse(JSON.stringify(temp2).replace(`{"isRef":true}`, JSON.stringify({ type: 'object', properties })));
  }

  checkTypeField(position, field, path, source, baseTypes) {
    let itemType = field.type.startsWith('array') ? field.type.substring(6, field.type.length - 1) : '';
    itemType = !position ? (field.itemType || '') : itemType;

    // 标准验证 必须是以下类型 integer/string/boolean/number/User, array[string]/array[User]
    if (!field.type.startsWith('array') && ![...baseTypes, ...['array']].includes(field.type) && !source.hasOwnProperty(field.type)) {
      throw new Error(`[egg-cute-swagger] ${path}.type does not support`);
    }
    if (field.type.startsWith('array') && !baseTypes.includes(itemType) && !source.hasOwnProperty(itemType)) {
      throw new Error(`[egg-cute-swagger] ${path}.itemType does not support`);
    }

    // query/path/headers: 只支持 integer/string/boolean/number, array[string]
    const noBodyPositions = ['query', 'path', 'headers'];
    if (noBodyPositions.includes(position) && !field.type.startsWith('array') && !baseTypes.includes(field.type)) {
      throw new Error(`[egg-cute-swagger] ${path}.type does not support`);
    }
    if (noBodyPositions.includes(position) && field.type.startsWith('array') && !baseTypes.includes(itemType)) {
      throw new Error(`[egg-cute-swagger] ${path}.itemType does not support`);
    }
  }

  checkTypeRule(position, field, path, source, baseTypes) {
    this.checkTypeField(position, field, path, source, baseTypes);
  }

  checkTypeSwagger(position, field, path, source, baseTypes) {
    this.checkTypeField(position, field, path, source, baseTypes);
  }

  buildDocumentRule() {
    if (this.__DOCUMENT_RULES__) {
      return this.__DOCUMENT_RULES__;
    }

    // 遍历contract,组装swagger.definitions
    const { definitions, source } = this.__CONTRACT__.buildDefinitionRule();
    const paths = {};

    for (const router of appRouters) {
      const rules = this.buildParameterRule(router, source, definitions);
      util.ensurePathExists(paths, `${router.url}.${router.method}`.toLowerCase(), {});
      paths[`${router.url}.${router.method}`.toLowerCase()] = rules;
    }

    this.__DOCUMENT_RULES__ = paths;
    return paths;
  }

  mergeParameterRule(position, router, params) {
    // body 单条数据 object/array 需加上名称, 最终转化的规则是{ body: { type: 'array', itemType: 'object', rule: { id: {}} } }
    if (position === 'body' && params.length === 1 && params.find(f => f.type === 'object' || f.type === 'array')) {
      params = params.map(m => Object.assign(m, { name: 'body' }));
    }

    // body大于一条 或 其他position数据, 需要合并成对象, 名称不可为空
    if (params.find(f => !f.name)) {
      throw new Error(`[egg-cute-swagger] ${router.controller} ${router.handler}: ${position}.name does not empty`);
    }

    // 数组对象合并成对象
    const properties = params.reduce((acc, m) => {
      acc[m.name] = Object.assign({}, ...Object.keys(m).filter(f => !['name', 'in'].includes(f)).map(f => ({ [f]: m[f] })));
      return acc;
    }, {});
    return properties;
  }

  buildParameterRule(router, source, routes) {
    const requests = (router.request ?? []).map(m => this.buildFieldRule(m.position, m, `${router.controller} ${router.handler}: ${m.position}.${m.name}`, source, routes));
    const positions = Array.from(new Set(requests.map(m => m.in)));
    return Object.assign({}, ...positions.map(m => ({ [m]: this.mergeParameterRule(m, router, requests.filter(f => f.in === m)) })));
  }

  init() {
    this.buildDocumentSwagger();
    this.buildDocumentRule();
  }
}

module.exports = DocumentClient;
