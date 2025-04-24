'use strict';

const fs = require('fs');
const path = require('path');
const AbstractField = require('./field');

class ContractClient extends AbstractField {

  constructor (config, app) {
    super(config);
    this.__CONTRACT__;
    this.__CONTRACT_SWAGGER__;
    this.__CONTRACT_RULES__;
    this.app = app;
  }

  contractLoader(baseDir, directory) {
    const contractDir = path.join(baseDir, directory);

    const names = fs.readdirSync(contractDir);
    for (let name of names) {
  
      const filepath = path.join(contractDir, name);
      const stat = fs.statSync(filepath);
  
      if (stat.isDirectory()) {
        this.contractLoader(contractDir, name);
        continue;
      }
  
      if (stat.isFile() && ['.js', '.ts'].indexOf(path.extname(filepath)) !== -1) {
        let def = require(filepath.split(/\.(js|ts)/)[0]);
  
        for (let object in def) {
          this.__CONTRACT__[object] = {
            path: `app${filepath.split('app')[1]}`,
            content: def[object],
          };
        }
      }
    }
  }

  generateContract() {
    this.__CONTRACT__ = {};
    let baseDir = path.join(this.app.config.baseDir, 'app/contract');
  
    if (!fs.existsSync(baseDir)) {
      // app.logger.warn('[egg-cute-swagger] can not found contract in app`s directory');
      throw new Error('[egg-cute-swagger] can not found contract in app`s directory');
    }
  
    this.contractLoader(baseDir, '');
  }

  /**
   * 构建Swagger的definition
   * @param {object} source contract超集
   */
  buildDefinitionSwagger() {
    if (this.__CONTRACT_SWAGGER__) {
      return this.__CONTRACT_SWAGGER__;
    }

    if (!this.__CONTRACT__) {
      this.generateContract();
    }

    // { User: { path: 'app\\contract\\request\\bas.ts', content: { pageNum: [Object], size: [Object] }, Role: { path: '', content: {} } }
    const source = JSON.parse(JSON.stringify(this.__CONTRACT__));

    const result = {};
    for (const object in source) {
      const def = source[object].content;
      const path = source[object].path;

      // {"id":{"type":"integer","required":true,"min":1,"example":2},"product":{"type":"string","required":true,"enum":[11,12,13]},"po":{"type":"pVo","required":true},"list":{"type":"array","itemType":"pVo"}}
      // {"id":{"min":1,"example":2,"type":"integer"},"product":{"enum":[11,12,13],"type":"string"},"po":{"$ref":"#/definitions/pVo"},"list":{"type":"array","items":{"$ref":"#/definitions/pVo"}}}

      const properties = Object.assign({}, ...Object.keys(def).map(m => this.buildFieldSwagger('', Object.assign(def[m], { name: m }), `${path}: ${object}.${m}`, source)));
      const required = Object.keys(def).map(m => def[m].required ? m : '').filter(f => !!f);
      result[object] = { type: 'object', required, properties };
    }
    this.__CONTRACT_SWAGGER__ = result;
    return result;
  }

  /**
   * 构建Rule的definition
   * @param {object} source contract超集
   */
  buildDefinitionRule() {
    if (this.__CONTRACT_RULES__) {
      return this.__CONTRACT_RULES__;
    }

    if (!this.__CONTRACT__) {
      this.generateContract();
    }

    // { User: { path: 'app\\contract\\request\\bas.ts', content: { pageNum: [Object], size: [Object] }, Role: { path: '', content: {} } }
    // const source = JSON.parse(JSON.stringify(this.__CONTRACT__)); // 会将正则转成一个空对象
    const source = this.__CONTRACT__;

    let rules;
    for (const object in source) {
      this.buildDefinitionRuleSingle(object, source, rules);
    }
    this.__CONTRACT_RULES__ = { definitions: rules || {}, source };
    return this.__CONTRACT_RULES__;
  }

  // 标准验证 必须是以下类型 integer/string/boolean/number/User, array[string]/array[User]
  checkTypeField(position, field, path, definitions, baseTypes) {
    let itemType = field.type.startsWith('array') ? field.type.substring(6, field.type.length - 1) : '';
    itemType = !position ? (field.itemType || '') : itemType;

    if (!field.type.startsWith('array') && !baseTypes.includes(field.type) && !definitions.hasOwnProperty(field.type)) {
      throw new Error(`[egg-cute-swagger] ${path}.type does not support`);
    }
    if (field.type.startsWith('array') && !baseTypes.includes(itemType) && !definitions.hasOwnProperty(itemType)) {
      throw new Error(`[egg-cute-swagger] ${path}.itemType does not support`);
    }
  }

  checkTypeRule(position, field, path, definitions, baseTypes) {
    this.checkTypeField(position, field, path, definitions, baseTypes);
  }

  checkTypeSwagger(position, field, path, definitions, baseTypes) {
    this.checkTypeField(position, field, path, definitions, baseTypes);
  }
}

module.exports = ContractClient;
