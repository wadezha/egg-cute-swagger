# egg-cute-swagger

The Swagger plugin provides Swagger and Validate functions for egg. It generates Swagger documents and parameter (egg-validate) rules by configuring Controller annotations.

Refer to [egg-swagger-doc]

## Install

```bash
$ npm i egg-cute-swagger --save
```

## Configuration

Change `${app_root}/config/plugin.js` to enable Swagger plugin:

```ts
exports.swagger = {
  enable: true,
  package: 'egg-cute-swagger',
};
```

Configure swagger information in `${app_root}/config/config.default.js`:

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
    // It is necessary to add { isRef: true } in responses. After annotation parsing, the response data will be replaced with { isRef: true }. It is also possible not to configure responses.
    responses: {
      200: { schema: { type: 'object', properties: { code: { type: 'number', example: 0 }, msg: { type: 'string', example: 'success' }, data: { isRef: true } } }, description: 'OK', },
      401: { schema: { type: 'object', properties: { code: { type: 'number', example: 401 }, msg: { type: 'string', example: 'UNAUTHORIZED' }, } }, description: 'UNAUTHORIZED', },
      403: { schema: { type: 'object', properties: { code: { type: 'number', example: 403 }, msg: { type: 'string', example: 'FORBIDDEN' }, } }, description: 'FORBIDDEN', },
      500: { schema: { type: 'object', properties: { code: { type: 'number', example: 500 }, msg: { type: 'string', example: 'INTERNAL ERROR' }, } }, description: 'INTERNAL ERROR', },
    },
    // Swagger interfaces and pages need to exclude authentication verification, you can use url.startWith in middleware auth to filter out these URLs
    noAuthUrl: [
      '/swagger-ui',
      '/swagger-resources/',
      '/api-docs',
      '/webjars/',
      '/favicon-',
      '/oauth2-redirect',
    ],
    // Whether to enable authentication entry on the Swagger page
    enableSecurity: false,
    // Whether Swagger is enabled. If it is not enabled, the Swagger page cannot be opened, but the Validate rules will be loaded
    enable: true,
  },
  // load into app, default is open
  app: true,
  // load into agent, default is close
  agent: false,
};
```

## user guide

```ts
import { Controller } from 'egg';
import { prefix, router, permission, request, response, deprecated, ignored, security, produce, consume } from 'egg-cute-router';

// If deprecated, ignored, security, produce, consume are configured on the Controller, all routes in this Controller will use this configuration by default. 
// If the route has a custom configuration, the custom configuration will be used first.
// Note: The following cases are the highest configurations, except for router, all other configurations are optional.
@prefix('/home', 'summary', 'desc', 'group')
@deprecated()
@ignored()
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
  @ignored()
  @security('apikey')
  @produce('application/json,application/xml')
  @consume('application/json,application/xml')
  @permission('index')
  public async index() {
    console.log(this.app.swagger.rules)
    console.log(this.app.swagger.definitions)
    // The validate method requires the egg-validate plugin to be installed
    // The following is the validate return value. You can also pass in the errorHandle function. This function is optional. When calling, pass in the validate return value and ctx
    // [{ message: 'should be one of 1, 2, 3', code: 'invalid', field: 'userType', position: 'body' }, { message: 'required', field: 'userId', code: 'missing_field', position: 'query' }]
    this.app.swagger.validate({ body: ctx.request.body, query: ctx.request.query }, this.ctx);
    this.ctx.body = 'Hi World!';
  }
}

```

After the program starts, add "/swagger-ui.html" after the URL to enter the Swagger management page

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)
