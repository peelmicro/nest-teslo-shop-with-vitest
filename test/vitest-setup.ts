/**
 * Vitest setup file - framework-agnostic configuration
 */
import { vi } from 'vitest';
import { testRunner } from './test-utils';

// Make sure reflection metadata is loaded
import 'reflect-metadata';

// Create global functions that can be used directly
// This ensures framework-agnostic test code works with both Jest and Vitest
(global as any).fn = vi.fn;
(global as any).clearAllMocks = vi.clearAllMocks;
(global as any).spyOn = vi.spyOn; 

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
      },
      NotFoundException: class NotFoundException extends Error {
        constructor(message) { super(message); this.name = 'NotFoundException'; }
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

// Mock the 'fs' module globally for Vitest
vi.mock('fs', () => mocks.fs);

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

// Create mock app with all necessary methods
const createMockApp = () => ({
  useGlobalPipes: vi.fn(),
  setGlobalPrefix: vi.fn(),
  listen: vi.fn().mockResolvedValue(undefined),
  // Add other common app methods as needed
  enableCors: vi.fn(),
  useGlobalFilters: vi.fn(),
  useGlobalInterceptors: vi.fn(),
  useGlobalGuards: vi.fn(),
  getHttpServer: vi.fn().mockReturnValue({}),
});

// Create a shared mockApp that will be consistent across all tests
const mockApp = createMockApp();

// Mock NestJS core to prevent actual app startup
vi.mock('@nestjs/core', async () => {
  const originalModule = await vi.importActual('@nestjs/core');
  return {
    ...(originalModule as object),
    NestFactory: {
      // Handle NestFactory safely
      ...(originalModule && typeof originalModule === 'object' && 
          'NestFactory' in originalModule && 
          typeof originalModule.NestFactory === 'object' ? 
          originalModule.NestFactory : {}),
      create: vi.fn().mockResolvedValue(mockApp),
    },
  };
});

// Mock ValidationPipe
vi.mock('@nestjs/common', async () => {
  const originalModule = await vi.importActual('@nestjs/common');
  return {
    ...(originalModule as object),
    ValidationPipe: vi.fn().mockImplementation(() => ({
      transform: vi.fn().mockReturnValue(true),
    })),
  };
});

// Mock for supertest - using a simpler, more direct approach
// This handles CommonJS-style imports (import * as request from 'supertest')
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
  
  // For CommonJS require('supertest')
  return {
    default: supertestFn,
    // For CommonJS 'import * as request'
    __esModule: true
  };
};

vi.mock('supertest', async () => {
  return createSupertestMock();
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

// Note: We're NOT mocking class-validator decorators since SWC handles them

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

// Mock testing module
vi.mock('@nestjs/testing', async () => {
  // Create a map of providers and controllers
  const providers = new Map();
  const controllers = new Map();
  
  // Use the application-specific service mocks from src/test-helpers.ts
  const { createServiceMocks, createControllerMocks, createRepositoryMocks } = await import('../src/test-helpers');
  
  // Create the module ref that will be returned by compile()
  const mockModuleRef = {
    get: vi.fn().mockImplementation((token) => {
      const key = typeof token === 'function' ? token.name : token;
      
      // If we have the provider in the map, return it
      if (providers.has(key)) {
        return providers.get(key);
      }
      
      // If we have the controller in the map, return it
      if (controllers.has(key)) {
        return controllers.get(key);
      }
      
      // Create appropriate mock based on name convention
      if (key.includes('Service')) {
        const serviceMock = createServiceMocks();
        providers.set(key, serviceMock);
        return serviceMock;
      } else if (key.includes('Controller')) {
        // Create controller methods based on common patterns
        const controllerMock = createControllerMocks();
        controllers.set(key, controllerMock);
        return controllerMock;
      } else if (key.includes('Repository')) {
        const repositoryMock = createRepositoryMocks();
        providers.set(key, repositoryMock);
        return repositoryMock;
      } else if (key.includes('Strategy')) {
        const strategyMock = {
          validate: vi.fn().mockImplementation(async (payload) => {
            return { id: payload.id, email: 'test@example.com' };
          })
        };
        providers.set(key, strategyMock);
        return strategyMock;
      }
      
      // Generic mock for anything else
      const instance = createServiceMocks();
      
      // Store the instance for future retrievals
      providers.set(key, instance);
      return instance;
    }),
    resolve: vi.fn(),
    select: vi.fn(),
    create: vi.fn(),
    createNestApplication: vi.fn().mockImplementation(() => mockApp)
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
              // Set a value in the map for later retrieval,
              // we'll create the mock when it's requested
              providers.set(token, null);
            }
          });
        }
        
        // Handle controllers too
        if (metadata.controllers) {
          metadata.controllers.forEach(controller => {
            const token = typeof controller === 'function' ? controller.name : '';
            if (token) {
              // Set a value in the map for later retrieval,
              // we'll create the mock when it's requested
              controllers.set(token, null);
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