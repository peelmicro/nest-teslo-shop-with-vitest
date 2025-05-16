// Base mock interface
export interface Mock<T = any> {
  (...args: any[]): any;
  mockImplementation: (fn: (...args: any[]) => any) => Mock;
  mockResolvedValue: (value: any) => Mock;
  mockReturnValue: (value: any) => Mock;
  mockReturnThis: () => Mock;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
  mock?: {
    calls: any[][];
  };
}

// HTTP method types
export type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head' | 'options';

// HTTP request interface
export interface HttpRequest {
  (): any;
  get: Mock;
  post: Mock;
  put: Mock;
  delete: Mock;
  patch: Mock;
  head: Mock;
  options: Mock;
}

// Base interface for the test runner
export interface TestRunner {
  // Core mocking functions
  fn(implementation?: (...args: any[]) => any): Mock;
  spyOn(object: any, method: string | number): Mock;
  mock(moduleName: string, factory: () => any): void;
  mockModule(moduleName: string): any;
  mockModuleWithImports(options: {
    moduleName: string;
    importOriginal?: boolean;
    factory: (originalModule: any) => any;
  }): any;
  
  // Mock control
  clearAllMocks(): void;
  resetAllMocks(): void;
  restoreAllMocks(): void;
  
  // HTTP testing
  http: HttpRequest;
  
  // NestJS specific mocks
  setupNestJSMocks(options?: {
    mockNestFactory?: boolean;
    mockValidationPipe?: boolean;
    preventAppStartup?: boolean;
    customApp?: any;
  }): void;
  
  // Common guards
  createCommonGuardMocks(): {
    AuthGuard: new () => any;
    JwtAuthGuard: new () => any;
    RolesGuard: new (reflector: any) => any;
  };
  
  // HTTP testing utilities
  http: {
    (app: any): {
      [key in HttpMethod]: (url: string) => HttpRequest;
    };
    get: (url: string) => Promise<any>;
    post: (url: string, data?: any) => Promise<any>;
    put: (url: string, data?: any) => Promise<any>;
    delete: (url: string) => Promise<any>;
    patch: (url: string, data?: any) => Promise<any>;
  };
}

declare const testRunner: TestRunner;

declare global {
  // eslint-disable-next-line no-var
  var testRunner: TestRunner;
}

export default testRunner;
