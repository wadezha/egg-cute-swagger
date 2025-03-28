'use strict';

class AbstractField {

  constructor (config) {
    this.config = config;
  }

  buildDefinitionRuleSingle(object, source, rules) {
    const def = source[object].content;
    const path = source[object].path;
    rules = rules ?? {};

    const properties = Object.assign({}, ...Object.keys(def).map(m => this.buildFieldRule('', Object.assign(def[m], { name: m }), `${path}: ${object}.${m}`, source, rules)));
    rules[object] = properties;
    return properties;
  }

  checkTypeRule(/* position, field, path, source, baseTypes */) {
    throw new Error('checkRuleType must be implemented.');
  }

  /**
   * 生成字段的Validate Rule格式 (包括Controller参数与Contract类)
   * @param {String} position 请求参数位置, body/path/query/headers
   * @param {Object} field 请求参数 { name: '', type: '', description: '', required: true }
   * @param {Object} path field路径
   * @param {Object} source contract对象名称数组
   * @return {Object} { name: { type: '', required: true, rule: '', max: '',  } }
   * @return {Object} { in: '', name: '', type: '', rule: '', required: true } or { name: { type: '', rule: '', required: true } }
   */
  buildFieldRule(position, field, path, source, rules) {

    const baseRules = ['name', 'type', 'required', 'convertType', 'default', 'max', 'min', 'allowEmpty', 'format', 'trim', 'compare', 'itemType'];
    let itemObj = Object.assign({}, ...Object.keys(field).filter(f => baseRules.includes(f)).map(f => { return { [f]: field[f] } }));

    itemObj.required = typeof itemObj.required === 'boolean' && itemObj.required ? true: false;
    itemObj.required = position === 'path' ? true : itemObj.required;

    field.type = field.type ?? '';

    const baseTypes = ['boolean', 'integer', 'number', 'string', 'enum', 'id', 'email', 'password', 'url'];
    let itemType= field.type.startsWith('array') ? field.type.substring(6, field.type.length - 1) : '';
    itemType = !position ? (field.itemType || '') : itemType;

    this.checkTypeRule(position, field, path, source, baseTypes);
  
    if (field.hasOwnProperty('enum') && Array.isArray(field.enum)) { // values
      field.type = 'enum'
      itemObj.values = field.enum;
    }

    if (field.hasOwnProperty('format') && (field.format === 'date-time'|| field.format === 'date')) {
      delete itemObj.format;
      field.type = field.format.replace('-', '');
    }

    itemObj.type = field.type;
    // object
    if (![...baseTypes, ...['datetime', 'date']].includes(field.type) && !field.type.startsWith('array')) {
      const definitions = rules.hasOwnProperty(field.type) ? rules[field.type] : this.buildDefinitionRuleSingle(field.type, source, rules);
      itemObj['rule'] = definitions;
      itemObj.type = 'object';
    }
  
    // array string
    if (field.type.startsWith('array') && baseTypes.includes(itemType)) {
      itemObj.type = 'array';
      itemObj.itemType = itemType;
      itemObj.rule = { type: itemType };
    }

    // array User
    if (field.type.startsWith('array') && !baseTypes.includes(itemType)) {
      itemObj.type = 'array';
      itemObj.itemType = 'object';
      itemObj.rule = rules.hasOwnProperty(itemType) ? rules[itemType] : this.buildDefinitionRuleSingle(itemType, source, rules);
    }
  
    if(position) {
      itemObj.in = position;
    }

    if(!position) {
      const name = itemObj.name;
      delete itemObj.name;
      itemObj = { [name]: itemObj };
    }

    return itemObj;
  }

  checkTypeSwagger(/* position, field, path, source, baseTypes */) {
    throw new Error('checkSwaggerType must be implemented.');
  }

  /**
   * 生成字段的Swagger格式 (包括Controller参数与Contract类)
   * body与response需要在其他地方再次处理数据, 此方法返回的数据统一是 definitions 格式
   * @param {String} position 请求参数位置, body/path/query/headers/response
   * @param {Object} field 请求参数 { name: '', type: '', description: '', required: true }
   * @param {Object} path field路径
   * @param {Object} source contract对象名称数组
   * @return {Object} { in: '', name: '', type: '', description: '', required: true } or { name: { type: '', description: '', required: true } }
   */
  buildFieldSwagger(position, field, path, source) {

    // definitions/response 此方法返回
    // { id: { type: 'integer', description: '', example: 0, min: 1, }
    // { po: { description: '', '$ref': '#/definitions/pVo', }
    // { ids: { type: 'array', description: '', items: { type: 'string' }, }
    // { list: { type: 'array', description: '', items: { '$ref': '#/definitions/pVo' }, }

    // request query/path
    // { in: 'query', name: 'xx', description: '', type: 'string' }
    // { in: 'query', name: 'xx', description: '', type: 'array', items: { type: 'string' } }
    // { in: 'path', name: 'xx', description: '', type: 'string' }
    // { in: 'path', name: 'xx', description: '', type: 'array', items: { type: 'string' } }
    // request body 最终需要
    // { in: 'body', description: '', schema: { type: 'object', properties: { code: { type: 'number', example: 0 } } } }
    // { in: 'body', description: '', schema: { '$ref': '#/definitions/pVo', description: '' } }
    // { in: 'body', description: '', schema: { type: 'array', description: '', items: { '$ref': '#/definitions/pVo' } } }

    const baseRules = ['name', 'example', 'format', 'enum', 'len', 'min', 'max', 'allowEmpty'];
    let itemObj = Object.assign({}, ...Object.keys(field).filter(f => baseRules.includes(f)).map(f => ({ [f]: field[f] })));

    itemObj.description = field.desc || '';
    itemObj.required = typeof field.required === 'boolean' && field.required ? true: false;
    itemObj.required = position === 'path' ? true : itemObj.required;
    field.type = field.type ?? '';
    field.type = ['enum', 'id', 'email', 'password', 'url'].includes(field.type) ? 'string' : field.type;
    itemObj.type = field.type;

    const baseTypes = ['boolean', 'integer', 'number', 'string'];
    let itemType = field.type.startsWith('array') ? field.type.substring(6, field.type.length - 1) : '';
    itemType = !position ? (field.itemType || '') : itemType;

    this.checkTypeSwagger(position, field, path, source, baseTypes);

    // object
    if (![...baseTypes, ...['array']].includes(field.type) && !field.type.startsWith('array')) {
      delete itemObj.type;
      Object.assign(itemObj, { $ref: `#/definitions/${field.type}` });
    }
    // array
    if (field.type.startsWith('array')) {
      itemObj.type = 'array';
      itemObj.items = { [baseTypes.includes(itemType) ? 'type' : '$ref']: baseTypes.includes(itemType) ? itemType : `#/definitions/${itemType}` };
    }

    if (field.type !== 'string') {
      delete itemObj.format;
    }

    if(position) {
      itemObj.in = position;
    }
    if (position === 'query' && field.type.startsWith('array')) {
      itemObj.collectionFormat = 'multi';
    }

    if(!position) {
      delete itemObj.required;
      const name = itemObj.name;
      delete itemObj.name;
      itemObj = { [name]: itemObj }
    }
    return itemObj;
  }
}

module.exports = AbstractField;
