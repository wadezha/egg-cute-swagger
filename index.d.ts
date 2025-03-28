
import { Context } from "egg";


interface ValidateDataOptions {
  body?: any;
  query?: any;
  path?: any;
  headers?: any;
}

declare class SwaggerClient {
  rules: any;
  validate(data: ValidateDataOptions, ctx: Context, callback?: Function);
}

interface SwaggerApiInfoOptions {
  title?: string;
  description?: string;
  version?: string;
}

interface SwaggerClientOptions {
  basePath?: string;
  apiInfo?: SwaggerApiInfoOptions;

  schemes?: array[string];
  consumes?: array[string];
  produces?: array[string];

  securityDefinitions?: any;
  responses?: any;

  noAuthUrl?: array[string];
  enableSecurity?: boolean;
  enable?: boolean;
}

interface EggSwaggerClientOptions {
  app?: boolean;
  agent?: boolean;
  client?: SwaggerClientOptions;
}

declare module 'egg' {
  interface Application {
    swagger: SwaggerClient & Singleton<SwaggerClient>;
  }

  interface EggAppConfig {
    swagger: EggSwaggerClientOptions;
  }
}
