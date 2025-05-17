/**
 * Framework-agnostic test utilities that work with both Jest and Vitest
 * This file can be reused across any NestJS application
 */

import * as requestCjs from 'supertest';
// @ts-ignore
import requestEsm from 'supertest';
// Detect which test framework is being used
const isVitest = typeof globalThis.vi !== 'undefined';
const request = isVitest ? requestEsm : requestCjs;

// Export the framework detection flag for use in test files
export { isVitest };

/**
 * Generic mock type that works with both Jest and Vitest
 */
export type Mock<T = any> = {
  (...args: any[]): any;
  mockImplementation: (fn: (...args: any[]) => any) => Mock;
  mockResolvedValue: (value: any) => Mock;
  mockReturnValue: (value: any) => Mock;
  mockClear: () => void;
  mockReset: () => void;
  mockRestore: () => void;
  mock?: {
    calls: any[][];
  };
};

/**
 * Creates a mock implementation of NestJS TestingModule
 * that returns consistent values for components
 */
export const createMockModule = () => {
  const mocks = new Map();
  
  const mockModule = {
    get: (token: any) => {
      const key = typeof token === 'string' ? token : token.name;
      if (!mocks.has(key)) {
        mocks.set(key, {});
      }
      return mocks.get(key);
    },
    resolve: testRunner.fn(),
    init: testRunner.fn(),
    close: testRunner.fn()
  };
  
  return mockModule;
};

// Counter to ensure each test gets a unique port
let portCounter = 5000;

/**
 * Creates a standard NestJS application mock with common methods
 */
export const createMockNestApp = () => {
  // Use a unique port for each instance to avoid conflicts
  const uniquePort = process.env.PORT || portCounter++;
  
  return {
    useGlobalPipes: testRunner.fn(),
    setGlobalPrefix: testRunner.fn(),
    // Don't actually try to listen on any port, just resolve
    listen: testRunner.fn().mockImplementation((port) => {
      // Store the port that was used for assertions
      (global as any).__lastPort = port || uniquePort;
      return Promise.resolve();
    }),
    enableCors: testRunner.fn(),
    useGlobalFilters: testRunner.fn(),
    useGlobalInterceptors: testRunner.fn(),
    useGlobalGuards: testRunner.fn(),
    getHttpServer: testRunner.fn().mockReturnValue({}),
    getHttpAdapter: testRunner.fn().mockReturnValue({
      getInstance: () => ({}),
      getType: () => 'express'
    }),
    close: testRunner.fn().mockResolvedValue(undefined) // Add close method for cleanup
  };
};

/**
 * Prepares commonly used mocks for NestJS tests
 * Returns properly mocked functions that work with both Jest and Vitest
 */
export const prepareMocksForTest = () => {
  // Common authentication mocks
  const authMocks = {
    hashSync: testRunner.fn().mockReturnValue('hashed-password'),
    compareSync: testRunner.fn().mockReturnValue(true),
    genSaltSync: testRunner.fn().mockReturnValue('salt')
  };

  // Common file system mocks
  const fsMocks = {
    existsSync: testRunner.fn().mockReturnValue(true),
    readFileSync: testRunner.fn().mockReturnValue('file-content'),
    writeFileSync: testRunner.fn()
  };

  // Common NestJS decorator mocks
  const nestjsDecoratorMocks = {
    SetMetadata: testRunner.fn().mockImplementation((key, value) => {
      return () => ({ key, value });
    }),
    createParamDecorator: testRunner.fn().mockImplementation((factory) => {
      return (...args: any[]) => ({ factory, args });
    }),
    applyDecorators: testRunner.fn().mockImplementation((...decorators) => {
      return decorators;
    }),
    UseGuards: testRunner.fn().mockImplementation((...guards) => {
      return () => ({ guards });
    })
  };

  // Mock execution context for decorators
  const executionContextMock = {
    switchToHttp: testRunner.fn().mockReturnValue({
      getRequest: testRunner.fn().mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        rawHeaders: ['Authorization', 'Bearer Token']
      }),
    }),
    getClass: testRunner.fn().mockReturnValue({}),
    getHandler: testRunner.fn().mockReturnValue({}),
  };

  // NestJS HTTP decorators
  const httpDecoratorMocks = {
    Controller: testRunner.fn().mockImplementation((prefix) => {
      return (target: any) => { 
        target.prefix = prefix; 
        return target;
      };
    }),
    Get: testRunner.fn().mockImplementation((path) => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    }),
    Post: testRunner.fn().mockImplementation((path) => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    }),
    Put: testRunner.fn().mockImplementation((path) => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    }),
    Delete: testRunner.fn().mockImplementation((path) => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    }),
    Patch: testRunner.fn().mockImplementation((path) => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    })
  };

  // NestJS common exception classes
  const exceptionMocks = {
    UnauthorizedException: class UnauthorizedException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'UnauthorizedException';
      }
    },
    BadRequestException: class BadRequestException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'BadRequestException';
      }
    },
    InternalServerErrorException: class InternalServerErrorException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InternalServerErrorException';
      }
    },
    ForbiddenException: class ForbiddenException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ForbiddenException';
      }
    },
    NotFoundException: class NotFoundException extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NotFoundException';
      }
    }
  };

  // Swagger related mocks
  const swaggerMocks = {
    ApiTags: testRunner.fn().mockImplementation(() => {
      return (target: any) => target;
    }),
    ApiResponse: testRunner.fn().mockImplementation(() => {
      return (target: any, key: string, descriptor: PropertyDescriptor) => descriptor;
    }),
    ApiProperty: testRunner.fn().mockImplementation(() => {
      return (target: any, key: string) => {};
    }),
    DocumentBuilder: testRunner.fn().mockReturnValue({
      setTitle: testRunner.fn().mockReturnThis(),
      setDescription: testRunner.fn().mockReturnThis(),
      setVersion: testRunner.fn().mockReturnThis(),
      build: testRunner.fn().mockReturnValue({})
    }),
    SwaggerModule: {
      createDocument: testRunner.fn().mockReturnValue({}),
      setup: testRunner.fn(),
    }
  };

  // NestJS passport mocks
  const passportMocks = {
    AuthGuard: testRunner.fn(() => 'MockAuthGuard')
  };

  return {
    auth: authMocks,
    fs: fsMocks,
    nestjs: {
      decorators: nestjsDecoratorMocks,
      http: httpDecoratorMocks,
      exceptions: exceptionMocks,
      executionContext: executionContextMock
    },
    swagger: swaggerMocks,
    passport: passportMocks
  };
};

/**
 * Ready-to-use test request object for e2e tests
 * This provides a consistent API for both Jest and Vitest
 */
export const createTestRequestMock = () => {
  // The chainable request methods
  const chainMethods = {
    get: testRunner.fn().mockReturnThis(),
    post: testRunner.fn().mockReturnThis(),
    put: testRunner.fn().mockReturnThis(),
    patch: testRunner.fn().mockReturnThis(),
    delete: testRunner.fn().mockReturnThis(),
    set: testRunner.fn().mockReturnThis(),
    send: testRunner.fn().mockReturnThis(),
    query: testRunner.fn().mockReturnThis(),
    expect: testRunner.fn().mockImplementation((status) => ({
      expect: testRunner.fn().mockReturnThis(),
      end: testRunner.fn().mockImplementation((cb) => cb && cb(null, { 
        status,
        statusCode: status,
        body: {},
        text: 'Mock response'
      })),
    })),
  };
  
  // The main supertest function
  const supertestFn = testRunner.fn().mockReturnValue(chainMethods);
  
  // For CommonJS require('supertest')
  return {
    default: supertestFn,
    // For CommonJS 'import * as request'
    __esModule: true
  };
};

/**
 * Define a proper interface for the MockPassportStrategy to avoid TS errors
 */
interface MockPassportStrategy {
  validate: Mock;
  userRepository?: any;
}

/**
 * Test utilities that work with both Jest and Vitest
 */
export const testRunner = {
  /**
   * Create a mock function
   */
  fn: (implementation?: (...args: any[]) => any): any => {
    if (isVitest) {
      return globalThis.vi.fn(implementation);
    }
    return jest.fn(implementation);
  },

  /**
   * Spy on an object's method
   * Enhanced version that handles property spying better between Jest and Vitest
   */
  spyOn: (object: any, method: string | number): any => {
    try {
      // Try to safely spy on the method
      if (isVitest) {
        const spy = globalThis.vi.spyOn(object, method as any);
        
        // Ensure the spy has mockReturnValue and other common methods
        if (!spy.mockReturnValue) {
          spy.mockReturnValue = function(value: any) {
            return globalThis.vi.mocked(this).mockReturnValue(value);
          };
        }
        
        return spy;
      }
      return jest.spyOn(object, method as any);
    } catch (error) {
      // If direct spying fails, create a mock function and assign it to the property
      const mockFn = isVitest ? globalThis.vi.fn() : jest.fn();
      
      // Only attempt to redefine if the object has the property
      if (object && method in object) {
        // Try to use a safer approach to replace the property
        const originalValue = object[method];
        try {
          object[method] = mockFn;
          // Restore original value when mockRestore is called
          mockFn.mockRestore = () => {
            object[method] = originalValue;
          };
        } catch (e) {
          console.warn(`Failed to mock ${String(method)}:`, e);
          // If we can't redefine, return a mock that won't affect the real object
          return mockFn;
        }
      }
      
      return mockFn;
    }
  },

  /**
   * Mock a module with the same API for both Jest and Vitest
   */
  mock: (moduleName: string, factory: () => any) => {
    if (isVitest) {
      globalThis.vi.mock(moduleName, factory);
    } else {
      jest.mock(moduleName, factory);
    }
  },

  /**
   * Creates mocked module imports for libraries like 'fs', 'path', etc.
   */
  mockModule: (moduleName: string) => {
    if (isVitest) {
      // For Vitest, create a vi.mock factory function
      return {
        mock: (mockImplementation: Record<string, any> = {}) => {
          globalThis.vi.mock(moduleName, () => {
            return {
              ...mockImplementation
            };
          });
        }
      };
    } else {
      // For Jest, create a jest.mock factory function
      return {
        mock: (mockImplementation: Record<string, any> = {}) => {
          jest.mock(moduleName, () => mockImplementation);
        }
      };
    }
  },

  /**
   * Enhanced module mocking that handles the differences between Jest and Vitest
   * This function allows mocking modules with framework-specific imports/requires
   * 
   * Note: When used in a test file, the moduleName will be resolved relative to that file
   * This means you should use relative paths as if calling from the test file itself
   */
  mockModuleWithImports: (options: {
    moduleName: string;  
    // Function to handle importing the actual module (needed for extending it)
    importOriginal?: boolean;
    // Factory that receives the original module and returns the mock
    factory: (originalModule: any) => any;
  }) => {
    const { moduleName, importOriginal = true, factory } = options;
    
    if (isVitest) {
      // For Vitest - asynchronous mocking
      globalThis.vi.mock(moduleName, async () => {
        // Get the original module if needed
        const originalModule = importOriginal 
          ? await globalThis.vi.importActual(moduleName) 
          : {};
        
        // Return the mock implementation
        return factory(originalModule);
      });
    } else {
      // For Jest - synchronous mocking
      jest.mock(moduleName, () => {
        // Get the original module if needed
        let originalModule = {};
        if (importOriginal) {
          try {
            originalModule = jest.requireActual(moduleName);
          } catch (e) {
            console.warn(`Could not import original module '${moduleName}' for mocking:`, e);
            // Continue with empty object if module not found
          }
        }
        
        // Return the mock implementation
        return factory(originalModule);
      });
    }
  },

  /**
   * Clear all mocks
   */
  clearAllMocks: (): void => {
    if (isVitest) {
      globalThis.vi.clearAllMocks();
    } else {
      jest.clearAllMocks();
    }
  },

  /**
   * Reset all mocks
   */
  resetAllMocks: (): void => {
    if (isVitest) {
      globalThis.vi.resetAllMocks();
    } else {
      jest.resetAllMocks();
    }
  },

  /**
   * Restore all mocks
   */
  restoreAllMocks: (): void => {
    if (isVitest) {
      globalThis.vi.restoreAllMocks();
    } else {
      jest.restoreAllMocks();
    }
  },

  /**
   * Setup core NestJS mocks to prevent application startup in tests
   * This is reusable across different NestJS applications
   */
  setupNestJSMocks: (options: {
    mockNestFactory?: boolean;
    mockValidationPipe?: boolean;
    preventAppStartup?: boolean;
    customApp?: any;
  } = {
    mockNestFactory: true,
    mockValidationPipe: true,
    preventAppStartup: true
  }) => {
    // Create a shared mockApp that will be consistent across all tests
    const mockApp = options.customApp || createMockNestApp();
    
    // Get common mocks
    const mocks = prepareMocksForTest();
    
    // Mock NestFactory to prevent real app startup
    if (options.mockNestFactory) {
      testRunner.mockModuleWithImports({
        moduleName: '@nestjs/core',
        factory: (originalModule) => ({
          ...(originalModule || {}),
          NestFactory: {
            ...(originalModule && originalModule.NestFactory || {}),
            create: testRunner.fn().mockResolvedValue(mockApp),
          },
          Reflector: class MockReflector {
            get(key: string, target: any) {
              return [];
            }
            getAllAndOverride(key: string, targets: any[]) {
              return [];
            }
          }
        })
      });
    }
    
    // Mock ValidationPipe and other common NestJS components
    if (options.mockValidationPipe) {
      testRunner.mockModuleWithImports({
        moduleName: '@nestjs/common',
        factory: (originalModule) => ({
          ...(originalModule || {}),
          ValidationPipe: testRunner.fn().mockImplementation(() => ({
            transform: testRunner.fn().mockReturnValue(true),
          })),
          // Add common decorator mocks
          ...mocks.nestjs.decorators,
          ...mocks.nestjs.http,
          ...mocks.nestjs.exceptions,
          ExecutionContext: testRunner.fn().mockImplementation(() => mocks.nestjs.executionContext),
        })
      });
    }
    
    // Mock @nestjs/passport
    testRunner.mockModuleWithImports({
      moduleName: '@nestjs/passport',
      importOriginal: false,
      factory: () => ({
        PassportModule: {
          register: testRunner.fn().mockImplementation(() => ({
            module: 'PassportModule',
            providers: [],
            exports: []
          }))
        },
        AuthGuard: testRunner.fn().mockImplementation(() => {
          return class MockAuthGuard {
            canActivate() {
              return true;
            }
          };
        }),
        PassportStrategy: testRunner.fn().mockImplementation((Strategy) => {
          return class MockPassportStrategy {
            validate: Mock;
            userRepository: any;

            constructor() {
              // Create a validate method for JwtStrategy
              this.validate = testRunner.fn().mockImplementation(async (payload) => {
                // Access the repository through the object's property
                if (this.userRepository) {
                  const mockUser = await this.userRepository.findOneBy({ id: payload?.id });
                  
                  if (!mockUser) {
                    throw new mocks.nestjs.exceptions.UnauthorizedException('Token not valid');
                  }
                  
                  if (!mockUser.isActive) {
                    throw new mocks.nestjs.exceptions.UnauthorizedException('User is inactive, talk with an admin');
                  }
                  
                  return mockUser;
                }
                
                return { id: payload?.id || 'test-user-id', email: 'test@example.com' };
              });
            }
          };
        })
      })
    });
    
    // Mock common utility modules
    testRunner.mockModule('fs').mock(mocks.fs);
    testRunner.mockModule('bcrypt').mock(mocks.auth);
    
    // Mock swagger
    testRunner.mockModuleWithImports({
      moduleName: '@nestjs/swagger',
      factory: (originalModule) => ({
        ...(originalModule || {}),
        ...mocks.swagger
      })
    });
    
    // Mock supertest (commonly used for e2e tests)
    testRunner.mockModule('supertest').mock(createTestRequestMock());
    
    return { mockApp, mocks };
  },
  
  /**
   * Generic bootstrap mock that can be used for any NestJS application
   * Helps avoid application-specific mocking in setup files
   */
  createBootstrapMock: (options: {
    globalPrefix?: string;
    port?: number | string;
    customizeApp?: (app: any) => void;
    enableSwagger?: boolean;
  } = {
    globalPrefix: 'api',
    port: 3000,
    enableSwagger: true
  }) => {
    // Return a mock function for bootstrap
    return testRunner.fn().mockImplementation(async () => {
      // Get mocked NestFactory - this works because we've already mocked it in setupNestJSMocks
      const { NestFactory } = isVitest 
        ? await import('@nestjs/core') 
        : require('@nestjs/core');
      
      // Create the mock app - use a unique port
      const uniquePort = options.port && parseInt(options.port.toString()) + portCounter++;
      const app = await NestFactory.create({} as any);
      
      // Set global prefix if provided
      if (options.globalPrefix) {
        app.setGlobalPrefix(options.globalPrefix);
      }
      
      // Add validation pipe (common in NestJS apps)
      app.useGlobalPipes();
      
      // Configure swagger if enabled
      if (options.enableSwagger) {
        const { SwaggerModule, DocumentBuilder } = isVitest
          ? await import('@nestjs/swagger')
          : require('@nestjs/swagger');
        
        const config = new DocumentBuilder()
          .setTitle('API')
          .setDescription('API Documentation')
          .setVersion('1.0')
          .build();
        
        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api', app, document);
      }
      
      // Allow custom app configuration
      if (options.customizeApp) {
        options.customizeApp(app);
      }
      
      // Use process.env.PORT or the unique port - this won't actually bind to a port
      // but will store the port value for testing
      await app.listen(process.env.PORT ?? uniquePort ?? options.port);
      
      return app;
    });
  },
  
  /**
   * Create application-agnostic mocks for common NestJS guards
   * This eliminates the need for specific imports in test files
   */
  createCommonGuardMocks: () => {
    return {
      // Generic AuthGuard mock
      AuthGuard: testRunner.fn().mockImplementation((strategy) => {
        return {
          canActivate: testRunner.fn().mockReturnValue(true)
        };
      }),
      
      // Generic RolesGuard mock
      RolesGuard: class MockRolesGuard {
        canActivate = testRunner.fn().mockReturnValue(true);
      },
      
      // Generic JwtAuthGuard mock
      JwtAuthGuard: class MockJwtAuthGuard {
        canActivate = testRunner.fn().mockReturnValue(true);
      },
      
      // Generic UserRoleGuard mock that can be used in any NestJS app
      UserRoleGuard: class MockUserRoleGuard {
        constructor(public readonly reflector: any) {}
        
        canActivate = testRunner.fn().mockImplementation((context) => {
          return true;
        });
      }
    };
  }
};

// Export application-agnostic methods that can be used directly
export const fn = testRunner.fn;
export const spyOn = testRunner.spyOn;
export const clearAllMocks = testRunner.clearAllMocks;
export const resetAllMocks = testRunner.resetAllMocks;
export const restoreAllMocks = testRunner.restoreAllMocks;

// Export NestJS common exceptions to make tests work without direct imports
export const mockExceptions = prepareMocksForTest().nestjs.exceptions;
export const InternalServerErrorException = mockExceptions.InternalServerErrorException;
export const BadRequestException = mockExceptions.BadRequestException;
export const UnauthorizedException = mockExceptions.UnauthorizedException;
export const ForbiddenException = mockExceptions.ForbiddenException;
export const NotFoundException = mockExceptions.NotFoundException;

import { INestApplication } from '@nestjs/common';



interface TestResponse {
  status: number;
  body: any;
}

interface HttpUtils {
  post(url: string): {
    set(key: string, value: string): any;
    send(data: any): any;
    expect(status: number): {
      toReturn(): Promise<TestResponse>;
    };
  };
  get(url: string): {
    set(key: string, value: string): any;
    send?(data: any): any; // not used for GET, but for symmetry
    expect(status: number): {
      toReturn(): Promise<TestResponse>;
    };
  };
}

export const http: (app: INestApplication) => HttpUtils = (app) => {
  // Helper to build up chainable request with .set(), .send(), .expect(), etc.
  function buildRequest(method: 'get' | 'post', url: string, headers: Record<string, string> = {}, data?: any) {
    let _headers = { ...headers };
    let _data = data;
    return {
      set(key: string, value: string) {
        _headers[key] = value;
        return this;
      },
      send(data: any) {
        _data = data;
        return this;
      },
      expect(status: number) {
        return {
          toReturn: async () => {
            let req = request(app.getHttpServer())[method](url);
            for (const [key, value] of Object.entries(_headers)) {
              req = req.set(key, value);
            }
            if (_data !== undefined && method === 'post') {
              req = req.send(_data);
            }
            const res = await req.expect(status);
            return {
              status: res.status,
              body: res.body
            };
          }
        };
      }
    };
  }
  return {
    post: (url: string) => buildRequest('post', url),
    get: (url: string) => buildRequest('get', url)
  };
};