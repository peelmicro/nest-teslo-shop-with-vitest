/**
 * Application-specific test helpers that build on the framework-agnostic test-utils
 * This file bridges the generic test utilities and the specific application needs
 */
import { testRunner } from '../test/test-utils';

// Detect which test framework is being used
export const isVitest = typeof globalThis.vi !== 'undefined';

/**
 * Framework-agnostic mock function creator
 */
export function fn(implementation?: (...args: any[]) => any): any {
  return testRunner.fn(implementation);
}

/**
 * Framework-agnostic spy creator
 */
export function spyOn(object: any, method: string): any {
  return testRunner.spyOn(object, method);
}

/**
 * Framework-agnostic mock reset
 */
export function clearAllMocks(): void {
  testRunner.clearAllMocks();
}

/**
 * Framework-agnostic mock module
 */
export function mockModule(moduleName: string, factory: () => any): void {
  if (isVitest) {
    globalThis.vi.mock(moduleName, factory);
  } else {
    jest.mock(moduleName, factory);
  }
}

/**
 * Create application-specific service mocks for auth module
 */
export function createAuthServiceMocks() {
  return {
    create: fn().mockImplementation((dto) => {
      return { 
        user: { 
          id: 'test-id',
          ...dto,
          password: undefined 
        },
        token: 'test-token' 
      };
    }),
    login: fn().mockImplementation((dto) => {
      return { 
        user: {
          id: 'test-id',
          email: dto.email,
          fullName: 'Test User',
          isActive: true,
          roles: ['user'],
        },
        token: 'test-token'
      };
    }),
    checkAuthStatus: fn().mockImplementation((user) => {
      return {
        user,
        token: 'test-token'
      };
    }),
  };
}

/**
 * Create application-specific repository mocks
 */
export function createRepositoryMocks() {
  return {
    create: fn().mockImplementation((dto) => dto),
    save: fn().mockImplementation((entity) => ({ id: 'test-id', ...entity })),
    findOne: fn().mockResolvedValue({ 
      id: 'test-id', 
      email: 'test@example.com',
      isActive: true 
    }),
    findOneBy: fn().mockResolvedValue({ 
      id: 'test-id', 
      email: 'test@example.com',
      isActive: true 
    }),
    find: fn().mockResolvedValue([
      { id: 'test-id-1', name: 'Test 1' },
      { id: 'test-id-2', name: 'Test 2' }
    ]),
    preload: fn().mockImplementation((entity) => ({ id: 'test-id', ...entity })),
    delete: fn().mockResolvedValue({ affected: 1 }),
    count: fn().mockResolvedValue(2),
    createQueryBuilder: fn().mockReturnValue({
      where: fn().mockReturnThis(),
      leftJoinAndSelect: fn().mockReturnThis(),
      take: fn().mockReturnThis(),
      skip: fn().mockReturnThis(),
      getManyAndCount: fn().mockResolvedValue([
        [
          { id: '1', title: 'Product 1', images: ['image1.jpg'] },
          { id: '2', title: 'Product 2', images: ['image2.jpg'] }
        ],
        2
      ])
    })
  };
}

/**
 * Create application-specific JWT service mocks
 */
export function createJwtServiceMocks() {
  return {
    sign: fn().mockReturnValue('test-token'),
    verify: fn().mockReturnValue({ id: 'test-id' }),
  };
}

/**
 * Create application-specific service mocks for all controllers/services
 */
export function createServiceMocks() {
  return {
    create: fn().mockImplementation((dto) => {
      return { id: '1', ...dto };
    }),
    findOne: fn().mockResolvedValue({ id: '1', title: 'Product 1' }),
    findAll: fn().mockResolvedValue([
      { id: '1', title: 'Product 1', images: ['image1.jpg'] },
      { id: '2', title: 'Product 2', images: ['image2.jpg'] }
    ]),
    update: fn().mockImplementation((id, dto) => {
      return { id, ...dto };
    }),
    remove: fn().mockImplementation((id) => {
      return { id };
    }),
    login: fn().mockImplementation((dto) => {
      return { 
        user: {
          email: dto.email,
          fullName: 'Test User',
          isActive: true,
          roles: ['user']
        },
        token: 'mock-jwt-token'
      };
    }),
    checkAuthStatus: fn().mockImplementation((user) => {
      return {
        user,
        token: 'mock-jwt-token'
      };
    }),
    getStaticProductImage: fn().mockReturnValue('/path/to/image.jpg')
  };
}

/**
 * Create controller method mocks for all controllers
 */
export function createControllerMocks() {
  return {
    findProductImage: fn().mockImplementation((res, imageName) => {
      res.sendFile(imageName);
      return { secureUrl: `/files/product/${imageName}` };
    }),
    uploadProductImage: fn().mockImplementation((file) => {
      if (!file) {
        throw new BadRequestException('Make sure that the file is an image');
      }
      return { secureUrl: `/files/product/${file.filename}` };
    }),
    findAll: fn(),
    findOne: fn(),
    create: fn(),
    update: fn(),
    remove: fn(),
    login: fn(),
    register: fn(),
    checkAuthStatus: fn()
  };
}

// Import exceptions from test-utils to make them available
import { 
  BadRequestException, 
  InternalServerErrorException, 
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
} from '../test/test-utils';

// Re-export exceptions for use in tests
export {
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
};

// Utility function to reset environment variables after tests
export function resetEnvVars(originalEnv: NodeJS.ProcessEnv) {
  process.env = { ...originalEnv };
}

// Store original environment for use in tests
export const originalEnv = { ...process.env }; 