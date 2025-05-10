/**
 * Jest setup file - framework-agnostic configuration
 */
import { testRunner } from './test-utils';

// Ensure reflection metadata is loaded for decorators
import 'reflect-metadata';

// Create mock app with all necessary methods
const createMockApp = () => ({
  useGlobalPipes: jest.fn(),
  setGlobalPrefix: jest.fn(),
  listen: jest.fn().mockResolvedValue(undefined),
  // Add other common app methods as needed
  enableCors: jest.fn(),
  useGlobalFilters: jest.fn(),
  useGlobalInterceptors: jest.fn(),
  useGlobalGuards: jest.fn(),
  getHttpServer: jest.fn().mockReturnValue({}),
  getHttpAdapter: jest.fn().mockReturnValue({
    getInstance: () => ({}),
    getType: () => 'express'
  }),
  close: jest.fn().mockResolvedValue(undefined)
});

// Create a shared mockApp that will be consistent across all tests
const mockApp = createMockApp();

// Create common exceptions that can be used globally
class UnauthorizedException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'UnauthorizedException'; 
  }
}

class BadRequestException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'BadRequestException'; 
  }
}

class InternalServerErrorException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'InternalServerErrorException'; 
  }
}

class ForbiddenException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'ForbiddenException'; 
  }
}

class NotFoundException extends Error {
  constructor(message) { 
    super(message); 
    this.name = 'NotFoundException'; 
  }
}

// Make UnauthorizedException available globally for strategy mocks
global.UnauthorizedException = UnauthorizedException;

// Mock NestJS core to prevent actual app startup
jest.mock('@nestjs/core', () => {
  const originalModule = jest.requireActual('@nestjs/core');
  return {
    ...originalModule,
    NestFactory: {
      ...originalModule.NestFactory,
      create: jest.fn().mockResolvedValue(mockApp),
    },
    Reflector: jest.fn().mockImplementation(() => ({
      get: jest.fn().mockReturnValue([]),
      getAllAndOverride: jest.fn().mockReturnValue([])
    }))
  };
});

// Mock common NestJS decorators and classes
jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    ValidationPipe: jest.fn().mockImplementation(() => ({
      transform: jest.fn().mockReturnValue(true),
    })),
    // Add these for decorator tests
    SetMetadata: jest.fn().mockImplementation((key, value) => {
      return () => ({ key, value });
    }),
    createParamDecorator: jest.fn().mockImplementation((factory) => {
      return (...args) => ({ factory, args });
    }),
    applyDecorators: jest.fn().mockImplementation((...decorators) => {
      return decorators;
    }),
    UseGuards: jest.fn().mockImplementation((...guards) => {
      return () => ({ guards });
    }),
    // Add exception classes
    UnauthorizedException,
    BadRequestException,
    InternalServerErrorException,
    ForbiddenException,
    NotFoundException
  };
});

// Mock for fs - commonly used in file operations
jest.mock('fs', () => {
  return {
    existsSync: jest.fn().mockReturnValue(true),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('mock file content')),
    writeFileSync: jest.fn(),
  };
});

// Mock bcrypt - commonly used in auth tests
jest.mock('bcrypt', () => ({
  hashSync: jest.fn().mockReturnValue('hashed-password'),
  compareSync: jest.fn().mockReturnValue(true),
  genSaltSync: jest.fn().mockReturnValue('salt'),
}));

// Mock @nestjs/swagger for main.ts tests
jest.mock('@nestjs/swagger', () => {
  return {
    SwaggerModule: {
      createDocument: jest.fn().mockReturnValue({}),
      setup: jest.fn(),
    },
    DocumentBuilder: jest.fn().mockReturnValue({
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    }),
    ApiTags: jest.fn().mockImplementation(() => {
      return (target) => target;
    }),
    ApiResponse: jest.fn().mockImplementation(() => {
      return () => ({});
    }),
    ApiProperty: jest.fn().mockImplementation(() => {
      return () => ({});
    }),
  };
});

// Define MockPassportStrategy type to avoid TS errors
class MockPassportStrategy {
  validate;
  userRepository;
  
  constructor() {
    // Create a validate method for JwtStrategy
    this.validate = jest.fn().mockImplementation(async (payload) => {
      // Access the repository through the object's property
      if (this.userRepository) {
        const mockUser = await this.userRepository.findOneBy({ id: payload?.id });
        
        if (!mockUser) {
          throw new UnauthorizedException('Token not valid');
        }
        
        if (!mockUser.isActive) {
          throw new UnauthorizedException('User is inactive, talk with an admin');
        }
        
        return mockUser;
      }
      
      return { id: payload?.id || 'test-user-id', email: 'test@example.com' };
    });
  }
}

// Mock @nestjs/passport
jest.mock('@nestjs/passport', () => ({
  PassportModule: {
    register: jest.fn().mockImplementation(() => ({
      module: 'PassportModule',
      providers: [],
      exports: []
    }))
  },
  AuthGuard: jest.fn().mockImplementation(() => {
    return class MockAuthGuard {
      canActivate() {
        return true;
      }
    };
  }),
  PassportStrategy: jest.fn().mockImplementation((Strategy) => {
    return MockPassportStrategy;
  })
}));

// Mock @nestjs/testing
jest.mock('@nestjs/testing', () => {
  // Import app-specific mocks
  const { createServiceMocks, createControllerMocks, createRepositoryMocks } = jest.requireActual('../src/test-helpers');
  
  // Maps to store providers and controllers
  const providers = new Map();
  const controllers = new Map();
    
  // Create the module reference that will be returned by compile()
  const mockModuleRef = {
    get: jest.fn().mockImplementation((token) => {
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
          validate: jest.fn().mockImplementation(async (payload) => {
            return { id: payload.id, email: 'test@example.com' };
          })
        };
        providers.set(key, strategyMock);
        return strategyMock;
      }
        
      // Generic instance for anything else
      const instance = createServiceMocks();
        
      // Store the instance for future retrievals
      providers.set(key, instance);
      return instance;
    }),
    resolve: jest.fn(),
    select: jest.fn()
  };
    
  // Return mock Test object
  return {
    Test: {
      createTestingModule: jest.fn().mockImplementation((metadata) => {
        // When a module is created, register its providers and controllers
        if (metadata.providers) {
          metadata.providers.forEach(provider => {
            const token = typeof provider === 'function' 
              ? provider.name 
              : (provider.provide ? 
                (typeof provider.provide === 'function' ? provider.provide.name : provider.provide)
                : '');
              
            if (token) {
              providers.set(token, null);
            }
          });
        }
          
        if (metadata.controllers) {
          metadata.controllers.forEach(controller => {
            const token = typeof controller === 'function' ? controller.name : '';
            if (token) {
              controllers.set(token, null);
            }
          });
        }
          
        return {
          overrideProvider: jest.fn().mockReturnThis(),
          overrideGuard: jest.fn().mockReturnThis(),
          useMocker: jest.fn().mockReturnThis(),
          compile: jest.fn().mockResolvedValue(mockModuleRef)
        };
      })
    }
  };
});

// Store original env
const originalEnv = { ...process.env };

// Reset before each test
beforeEach(() => {
  jest.clearAllMocks();
  process.env = { ...originalEnv };
  delete process.env.PORT;
});

// Cleanup after tests
afterEach(() => {
  process.env = originalEnv;
}); 