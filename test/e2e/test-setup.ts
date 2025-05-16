import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../src/auth/entities/user.entity';
import { AppModule } from '../../src/app.module';
import { testRunner } from '../test-utils';

// Define test context interface
export interface TestContext {
  app: INestApplication;
  userRepository: Repository<User>;
  moduleFixture: TestingModule;
}

// Initialize test runner mocks before any tests run
testRunner.setupNestJSMocks({
  mockNestFactory: true,
  mockValidationPipe: true,
  preventAppStartup: true
});

// Mock bcrypt
testRunner.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: testRunner.fn().mockImplementation((data) => Promise.resolve(`hashed-${data}`)),
    compare: testRunner.fn().mockResolvedValue(true),
    hashSync: testRunner.fn().mockImplementation((data) => `hashed-${data}`),
    compareSync: testRunner.fn().mockReturnValue(true),
  },
  hash: testRunner.fn().mockImplementation((data) => Promise.resolve(`hashed-${data}`)),
  compare: testRunner.fn().mockResolvedValue(true),
  hashSync: testRunner.fn().mockImplementation((data) => `hashed-${data}`),
  compareSync: testRunner.fn().mockReturnValue(true),
}));

/**
 * Creates a test application with the necessary configuration
 */
export async function setupTestApp(): Promise<TestContext> {
  // Initialize the testing module
  const moduleFixture = await Test.createTestingModule({
    imports: [
      AppModule,
      TypeOrmModule.forFeature([User]),
    ],
  }).compile();

  // Create the application
  const app = moduleFixture.createNestApplication();
  await app.init();

  // Get the user repository
  const userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

  return {
    app,
    userRepository,
    moduleFixture,
  };
}

/**
 * Tears down the test application
 */
export async function teardownTestApp(context: TestContext): Promise<void> {
  const { app, moduleFixture } = context;
  
  // Clean up resources
  await app.close();
  await moduleFixture.close();
}

/**
 * Test utilities for common operations
 */
export const testUtils = {
  /**
   * Creates a test user in the database
   */
  async createTestUser(
    userRepository: Repository<User>,
    userData: Partial<User> = {}
  ): Promise<User> {
    const user = userRepository.create({
      email: userData.email || `test-${Date.now()}@example.com`,
      password: 'Test1234$',
      fullName: userData.fullName || 'Test User',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      roles: userData.roles || ['user'],
      ...userData,
    });

    return userRepository.save(user);
  },

  /**
   * Deletes a test user from the database
   */
  async deleteTestUser(
    userRepository: Repository<User>,
    email: string
  ): Promise<void> {
    await userRepository.delete({ email });
  },

  /**
   * Cleans up all test data
   */
  async cleanupTestData(userRepository: Repository<User>): Promise<void> {
    await userRepository.delete({});
  },
};
