# egg-cute-swagger

Swagger 插件是为 egg 提供 Swagger以及Validate 功能, 通过配置Controller注解, 生成Swagger文档以及parameter(egg-validate)规则

此插件参考 [egg-swagger-doc]

## 安装

```bash
$ npm i egg-cute-swagger --save
```

## 配置

通过 `config/plugin.js` 配置启动 Swagger 插件:

```ts
exports.swagger = {
  enable: true,
  package: 'egg-cute-swagger',
};
```

在 `config/config.${env}.js` 配置各个环境的Swagger信息：

```ts
exports.swagger = {
  client: {
    basePath: '/',
    apiInfo: {
      title: 'egg-swagger',
      description: 'swagger-ui for egg',
      version: '1.0.0',
    },
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    securityDefinitions: {
      apiname: {
        type: 'apiKey',
        name: 'clientkey',
        in: 'header',
      },
      apiname2: {
        type: 'oauth2',
        tokenUrl: 'http://petstore.swagger.io/oauth/dialog',
        flow: 'password',
        scopes: {
          'write:access_token': 'write access_token',
          'read:access_token': 'read access_token',
        },
      },
    },
    // 必需在responses中加入{ isRef: true }, 注解解析后会将response的数据替换掉{ isRef: true }, 也可不配置responses
    responses: {
      200: { schema: { type: 'object', properties: { code: { type: 'number', example: 0 }, msg: { type: 'string', example: 'success' }, data: { isRef: true } } }, description: 'OK', },
      401: { schema: { type: 'object', properties: { code: { type: 'number', example: 401 }, msg: { type: 'string', example: 'UNAUTHORIZED' }, } }, description: 'UNAUTHORIZED', },
      403: { schema: { type: 'object', properties: { code: { type: 'number', example: 403 }, msg: { type: 'string', example: 'FORBIDDEN' }, } }, description: 'FORBIDDEN', },
      500: { schema: { type: 'object', properties: { code: { type: 'number', example: 500 }, msg: { type: 'string', example: 'INTERNAL ERROR' }, } }, description: 'INTERNAL ERROR', },
    },
    // Swagger接口与页面需要排除鉴权验证, 可在middleware auth中用url.startWith过滤掉这些URL
    noAuthUrl: [
      '/swagger-ui',
      '/swagger-resources/',
      '/api-docs',
      '/webjars/',
      '/favicon-',
      '/oauth2-redirect',
    ],
    // Swagger页面上是否开启鉴权入口
    enableSecurity: false,
    // Swagger是否启用, 不启用时无法打开Swagger页面，但会加载Validate的规则
    enable: true,
  },
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

## 使用指南

```ts
import { Controller } from 'egg';
import { prefix, router, permission, request, response, deprecated, ignore, security, produce, consume } from 'egg-cute-router';

// 若在Controller上配置deprecated, ignore, security, produce, consume 则此Controller中所有的路由都会默认此配置, 如果路由有定制配置时以定制配置为准
// 注：以下案例是最高配置, 除router外都是选配
@prefix('/home', 'summary', 'desc', 'group')
@deprecated()
@ignore()
@security('apiname')
@produce('application/json,application/xml')
@consume('application/json,application/xml')
@permission('home')
export default class HomeController extends Controller {
  @router('get', '/index', 'summary', 'desc')
  @request('query', 'number', 'id', 'desc', 'example', true, { min: 1, format: '' })
  @request('query', 'string', 'name', 'desc', 'example', true, { min: 1, format: '' })
  @request('body', 'array[User]', 'uVo')
  @request('body', 'string', 'name', 'desc', 'example', true, { min: 1, format: '' })
  @request('path', 'string', 'name2')
  @response('string', 'name3', 'desc', 'example', true, { min: 1, format: '' })
  @response('User', 'uVo')
  @deprecated()
  @ignore()
  @security('apikey')
  @produce('application/json,application/xml')
  @consume('application/json,application/xml')
  @permission('index')
  public async index() {
    console.log(this.app.swagger.rules)
    // validate 需要安装egg-validate插件
    // 以下是validate返回值, 也可传入errorHandle函数, 此函数是选填, 调用时传入validate返回值与ctx
    // [{ message: 'should be one of 1, 2, 3', code: 'invalid', field: 'userType', position: 'body' }, { message: 'required', field: 'userId', code: 'missing_field', position: 'query' }]
    this.app.swagger.validate({ body: ctx.request.body, query: ctx.request.query }, this.ctx, errorHandle);
    this.ctx.body = 'Hi World!';
  }
}

```

程序启动后打开在网址后加上 /swagger-ui.html 进入Swagger管理页

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
