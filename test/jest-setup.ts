/**
 * Jest setup file - framework-agnostic configuration
 */
import { testRunner } from './test-utils';

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
});

// Create a shared mockApp that will be consistent across all tests
const mockApp = createMockApp();

// Mock NestJS core to prevent actual app startup
jest.mock('@nestjs/core', () => {
  const originalModule = jest.requireActual('@nestjs/core');
  return {
    ...originalModule,
    NestFactory: {
      ...originalModule.NestFactory,
      create: jest.fn().mockResolvedValue(mockApp),
    },
  };
});

// Mock ValidationPipe
jest.mock('@nestjs/common', () => {
  const originalModule = jest.requireActual('@nestjs/common');
  return {
    ...originalModule,
    ValidationPipe: jest.fn().mockImplementation(() => ({
      transform: jest.fn().mockReturnValue(true),
    })),
    // Add these for decorator tests (which might need them)
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