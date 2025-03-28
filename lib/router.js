'use strict';

const path = require('path');
const staticCache = require('koa-static-cache');
const DocumentClient = require('./document');

module.exports = {

  /**
   * 注册SwaggerUI基础路由
   */
  swaggerRouterRegister: app => {
    // swaggerUI json字符串访问地址
    app.get('/api-docs', ctx => {
      const client = new DocumentClient(app.config.swagger.client, app);
      ctx.response.status = 200;
      ctx.response.type = 'application/json';
      ctx.response.body = client.buildDocumentSwagger();
    });
    app.logger.info('[egg-cute-swagger] register router: get /swagger-doc');

    // swaggerUI的静态资源加入缓存，配置访问路由
    const swaggerH5 = path.join(__dirname, '../app/public');
    app.use(staticCache(swaggerH5, {}, {}));
    app.logger.info('[egg-cute-swagger] register router: get /swagger-ui.html');

  },
};
