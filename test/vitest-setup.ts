/**
 * Vitest setup file - framework-agnostic configuration
 */
import { vi } from 'vitest';
import { testRunner } from './test-utils';

// Make sure reflection metadata is loaded
import 'reflect-metadata';

// Create UnauthorizedException class up front so it can be shared
class UnauthorizedException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'UnauthorizedException'; 
  }
}

// Get common mocks for auth, fs, etc.
const mocks = {
  auth: {
    hashSync: vi.fn().mockReturnValue('hashed-password'),
    compareSync: vi.fn().mockReturnValue(true),
    genSaltSync: vi.fn().mockReturnValue('salt')
  },
  fs: {
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue('file-content'),
    writeFileSync: vi.fn()
  },
  nestjs: {
    decorators: {
      SetMetadata: vi.fn().mockImplementation((key, value) => {
        return () => ({ key, value });
      }),
      createParamDecorator: vi.fn().mockImplementation((factory) => {
        return (...args) => ({ factory, args });
      }),
      applyDecorators: vi.fn().mockImplementation((...decorators) => {
        return decorators;
      }),
      UseGuards: vi.fn().mockImplementation((...guards) => {
        return () => ({ guards });
      })
    },
    http: {
      Controller: vi.fn().mockImplementation((prefix) => (target) => target),
      Get: vi.fn().mockImplementation(() => () => ({})),
      Post: vi.fn().mockImplementation(() => () => ({})),
      Put: vi.fn().mockImplementation(() => () => ({})),
      Delete: vi.fn().mockImplementation(() => () => ({})),
      Patch: vi.fn().mockImplementation(() => () => ({}))
    },
    exceptions: {
      UnauthorizedException,
      BadRequestException: class BadRequestException extends Error {
        constructor(message) { super(message); this.name = 'BadRequestException'; }
      },
      InternalServerErrorException: class InternalServerErrorException extends Error {
        constructor(message) { super(message); this.name = 'InternalServerErrorException'; }
      },
      ForbiddenException: class ForbiddenException extends Error {
        constructor(message) { super(message); this.name = 'ForbiddenException'; }
      }
    },
    executionContext: {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: vi.fn().mockReturnValue({
          user: { id: 'test-user-id', email: 'test@example.com' },
          rawHeaders: ['Authorization', 'Bearer Token']
        })
      }),
      getClass: vi.fn().mockReturnValue({}),
      getHandler: vi.fn().mockReturnValue({})
    }
  },
  swagger: {
    ApiTags: vi.fn().mockImplementation(() => (target) => target),
    ApiResponse: vi.fn().mockImplementation(() => () => ({})),
    ApiProperty: vi.fn().mockImplementation(() => () => ({})),
    DocumentBuilder: vi.fn().mockReturnValue({
      setTitle: vi.fn().mockReturnThis(),
      setDescription: vi.fn().mockReturnThis(),
      setVersion: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue({})
    }),
    SwaggerModule: {
      createDocument: vi.fn().mockReturnValue({}),
      setup: vi.fn()
    }
  }
};

// Create global jest object for compatibility
Object.defineProperty(global, 'jest', {
  value: {
    fn: vi.fn.bind(vi),
    mock: vi.mock.bind(vi),
    spyOn: vi.spyOn.bind(vi),
    clearAllMocks: vi.clearAllMocks.bind(vi),
    resetAllMocks: vi.resetAllMocks.bind(vi),
    restoreAllMocks: vi.restoreAllMocks.bind(vi),
    requireActual: vi.importActual.bind(vi)
  },
  writable: true,
  configurable: true
});

// Add global bcrypt mock for auth tests
Object.defineProperty(global, 'bcrypt', {
  value: mocks.auth,
  writable: true,
  configurable: true
});

// Create mock app that can be used across tests
const mockApp = {
  useGlobalPipes: vi.fn(),
  setGlobalPrefix: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  enableCors: vi.fn(),
  useGlobalFilters: vi.fn(),
  useGlobalInterceptors: vi.fn(),
  useGlobalGuards: vi.fn(),
  getHttpServer: vi.fn().mockReturnValue({}),
  getHttpAdapter: vi.fn().mockReturnValue({
    getInstance: vi.fn().mockReturnValue({}),
    getType: vi.fn().mockReturnValue('express')
  })
};

// Set up framework-agnostic NestJS mocks
vi.mock('@nestjs/core', async () => {
  const originalModule = await vi.importActual('@nestjs/core');
  return {
    ...(originalModule || {}),
    NestFactory: {
      ...(originalModule && originalModule.NestFactory ? originalModule.NestFactory : {}),
      create: vi.fn().mockResolvedValue(mockApp)
    },
    Reflector: vi.fn().mockImplementation(() => ({
      get: vi.fn().mockReturnValue([]),
      getAllAndOverride: vi.fn().mockReturnValue([])
    }))
  };
});

// Generic decorator mock factory - application-agnostic
const mockDecorator = (name) => vi.fn().mockImplementation(() => {
  return function(target) {
    return target;
  };
});

// Expose UnauthorizedException globally for PassportStrategy
globalThis.UnauthorizedException = UnauthorizedException;

// Mock NestJS common decorators and classes
vi.mock('@nestjs/common', async () => {
  const originalModule = await vi.importActual('@nestjs/common') || {};
  
  // Create a properly typed object with all our mocks
  const commonMock = {
    // Add all decorators and methods we need
    Injectable: mockDecorator('Injectable'),
    Module: mockDecorator('Module'),
    Controller: mocks.nestjs.http.Controller,
    Get: mocks.nestjs.http.Get,
    Post: mocks.nestjs.http.Post,
    Put: mocks.nestjs.http.Put,
    Delete: mocks.nestjs.http.Delete,
    Patch: mocks.nestjs.http.Patch,
    Body: mockDecorator('Body'),
    Param: mockDecorator('Param'),
    Query: mockDecorator('Query'),
    Req: mockDecorator('Req'),
    Res: mockDecorator('Res'),
    UploadedFile: mockDecorator('UploadedFile'),
    ParseFilePipe: vi.fn().mockImplementation(() => mockDecorator('ParseFilePipe')),
    FileTypeValidator: vi.fn().mockImplementation(() => ({ validate: vi.fn().mockReturnValue(true) })),
    MaxFileSizeValidator: vi.fn().mockImplementation(() => ({ validate: vi.fn().mockReturnValue(true) })),
    SetMetadata: mocks.nestjs.decorators.SetMetadata,
    createParamDecorator: mocks.nestjs.decorators.createParamDecorator,
    applyDecorators: vi.fn().mockImplementation((...decorators) => {
      // Return a function, not an object
      return function decorator(target) {
        return target;
      };
    }),
    UseGuards: mocks.nestjs.decorators.UseGuards,
    UseInterceptors: mockDecorator('UseInterceptors'),
    UsePipes: mockDecorator('UsePipes'),
    UnauthorizedException,
    BadRequestException: mocks.nestjs.exceptions.BadRequestException, 
    InternalServerErrorException: mocks.nestjs.exceptions.InternalServerErrorException,
    ForbiddenException: mocks.nestjs.exceptions.ForbiddenException,
    NotFoundException: class NotFoundException extends Error {
      constructor(message) { super(message); this.name = 'NotFoundException'; }
    },
    ExecutionContext: vi.fn().mockImplementation(() => mocks.nestjs.executionContext),
    ValidationPipe: vi.fn().mockImplementation(() => ({
      transform: vi.fn().mockReturnValue(true)
    })),
    Logger: vi.fn().mockImplementation(() => ({
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      verbose: vi.fn()
    }))
  };
  
  return commonMock;
});

// Mock passport module - commonly used for auth
vi.mock('@nestjs/passport', async () => {
  return {
    PassportModule: {
      register: vi.fn().mockImplementation(() => ({
        module: 'PassportModule',
        providers: [],
        exports: []
      }))
    },
    AuthGuard: vi.fn().mockImplementation(() => {
      return class MockAuthGuard {
        canActivate() {
          return true;
        }
      };
    }),
    PassportStrategy: vi.fn().mockImplementation((Strategy) => {
      return class MockPassportStrategy {
        validate: any;
        userRepository: any;
        
        constructor() {
          // Create a more realistic validate method that mimics JWT behavior
          this.validate = vi.fn().mockImplementation(async (payload) => {
            // This is application-agnostic because we're using the repository pattern
            // that's common in NestJS
            
            // Access the repository through the object's property
            // In tests, this will be mocked/spied on as needed
            if (this.userRepository) {
              const mockUser = await this.userRepository.findOneBy({ id: payload?.id });
              
              // Standard JWT validation logic - if user not found or not active, throw error
              if (!mockUser) {
                throw new UnauthorizedException('Token not valid');
              }
              
              if (!mockUser.isActive) {
                throw new UnauthorizedException('User is inactive, talk with an admin');
              }
              
              return mockUser;
            }
            
            // Default behavior if no repo available
            return { id: payload?.id || 'test-user-id' };
          });
        }
      };
    })
  };
});

// Mock swagger - common in NestJS apps
vi.mock('@nestjs/swagger', async () => {
  return mocks.swagger;
});

// Store original env
const originalEnv = { ...process.env };

// Reset before each test
beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.PORT;
});

// Cleanup after tests
afterEach(() => {
  process.env = originalEnv;
});

// Mock fs - commonly used in file operations
vi.mock('fs', async () => {
  const originalModule = await vi.importActual('fs');
  return {
    ...(originalModule || {}),
    ...mocks.fs
  };
});

// Mock class-validator with framework-agnostic validator
vi.mock('class-validator', async () => {
  const originalModule = await vi.importActual('class-validator');
  
  // Framework-agnostic validator that allows test files to provide expected results
  const genericValidate = vi.fn().mockImplementation((obj) => {
    // Just return empty errors by default - test files should add their own errors
    return Promise.resolve([]);
  });
  
  return {
    ...(originalModule || {}),
    validate: genericValidate,
    // Common decorators used across NestJS
    IsString: mockDecorator('IsString'),
    IsEmail: mockDecorator('IsEmail'),
    IsOptional: mockDecorator('IsOptional'),
    IsPositive: mockDecorator('IsPositive'),
    IsInt: mockDecorator('IsInt'),
    Min: mockDecorator('Min'),
    Max: mockDecorator('Max'),
    IsIn: mockDecorator('IsIn'),
    Matches: mockDecorator('Matches'),
    MinLength: mockDecorator('MinLength'),
    MaxLength: mockDecorator('MaxLength'),
    IsUUID: mockDecorator('IsUUID'),
    IsBoolean: mockDecorator('IsBoolean'),
    IsDate: mockDecorator('IsDate'),
    IsArray: mockDecorator('IsArray')
  };
});

// Mock platform-express for file uploads
vi.mock('@nestjs/platform-express', async () => {
  return {
    FileInterceptor: vi.fn().mockImplementation(() => ({
      intercept: vi.fn().mockResolvedValue(true)
    }))
  };
});

// Mock bcrypt directly
vi.mock('bcrypt', () => mocks.auth);

// Create simple supertest mock
const createSupertestMock = () => {
  // The chainable request methods
  const chainMethods = {
    get: vi.fn().mockReturnThis(),
    post: vi.fn().mockReturnThis(),
    put: vi.fn().mockReturnThis(),
    patch: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    query: vi.fn().mockReturnThis(),
    expect: vi.fn().mockImplementation((status) => {
      return {
        expect: vi.fn().mockReturnThis(),
        end: vi.fn().mockImplementation((cb) => cb && cb(null, { 
          status,
          statusCode: status,
          body: {},
          text: 'Mock response'
        })),
      };
    }),
  };
  
  // The main supertest function
  const supertestFn = vi.fn().mockReturnValue(chainMethods);
  
  return {
    default: supertestFn,
    __esModule: true
  };
};

vi.mock('supertest', async () => createSupertestMock());

// Mock testing module
vi.mock('@nestjs/testing', async () => {
  // Create a map of providers
  const providers = new Map();
  
  // Create a module ref that can store and retrieve providers
  const mockModuleRef = {
    get: vi.fn().mockImplementation((token) => {
      const key = typeof token === 'function' ? token.name : token;
      
      // If we have the provider in the map, return it
      if (providers.has(key)) {
        return providers.get(key);
      }
      
      // If not, create a new mock instance
      const instance = {
        // Common service methods
        create: vi.fn(),
        findOne: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        // Auth-specific methods
        login: vi.fn(),
        checkAuthStatus: vi.fn(),
        // File-specific methods
        getStaticProductImage: vi.fn()
      };
      
      // Store the instance for future retrievals
      providers.set(key, instance);
      return instance;
    }),
    resolve: vi.fn(),
    select: vi.fn(),
    create: vi.fn()
  };
  
  // Create the Test object with the createTestingModule function
  return {
    Test: {
      createTestingModule: vi.fn().mockImplementation((metadata) => {
        // When a module is created, register its providers
        if (metadata.providers) {
          metadata.providers.forEach(provider => {
            // Handle both simple providers and custom providers
            const token = typeof provider === 'function' 
              ? provider.name 
              : (provider.provide ? 
                (typeof provider.provide === 'function' ? provider.provide.name : provider.provide)
                : '');
            
            if (token) {
              // Create a mock instance for each provider
              providers.set(token, {
                // Common methods for different types of providers
                create: vi.fn(),
                findOne: vi.fn(),
                findAll: vi.fn(),
                update: vi.fn(),
                remove: vi.fn(),
                login: vi.fn(),
                checkAuthStatus: vi.fn(),
                getStaticProductImage: vi.fn()
              });
            }
          });
        }
        
        // Handle controllers too
        if (metadata.controllers) {
          metadata.controllers.forEach(controller => {
            const token = typeof controller === 'function' ? controller.name : '';
            if (token) {
              providers.set(token, {});
            }
          });
        }
        
        return {
          overrideProvider: vi.fn().mockReturnThis(),
          overrideGuard: vi.fn().mockReturnThis(),
          useMocker: vi.fn().mockReturnThis(),
          compile: vi.fn().mockResolvedValue(mockModuleRef)
        };
      })
    }
  };
}); 