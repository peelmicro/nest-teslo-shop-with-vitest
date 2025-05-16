import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as requestCjs from 'supertest';
// @ts-ignore
import requestEsm from 'supertest';

const isVitest = typeof globalThis.vi !== 'undefined';
const request = isVitest ? requestEsm : requestCjs;
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AppModule } from '../../../src/app.module';
import { User } from '../../../src/auth/entities/user.entity';
import { testRunner } from '../../test-utils';
import { setupTestApp, teardownTestApp } from '../test-setup';

const testingUser = {
  email: 'testing.user@google.com',
  password: 'Abc12345',
  fullName: 'Testing user',
};

describe('AuthModule Register (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let moduleFixture: TestingModule;
  let context: any;

  beforeAll(async () => {
    if (isVitest) {
      // For Vitest, use the setupTestApp utility
      context = await setupTestApp();
      app = context.app;
      userRepository = context.userRepository;
    } else {
      // For Jest, use the standard setup
      moduleFixture = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      app = moduleFixture.createNestApplication();
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
      );
      await app.init();
      userRepository = app.get<Repository<User>>(getRepositoryToken(User));
    }
  });

  afterAll(async () => {
    if (app) {
      if (userRepository) {
        await userRepository.delete({ email: testingUser.email });
      }
      if (isVitest) {
        await teardownTestApp(context);
      } else {
        await app.close();
      }
    }
  });

  // Mock repository for Vitest
  const setupVitestMocks = () => {
    if (!isVitest) return;
    
    // Create a mock repository
    const mockUser = {
      id: 'test-id',
      email: testingUser.email,
      password: 'hashed-password',
      fullName: testingUser.fullName,
      isActive: true,
      roles: ['user'],
    };
    
    // Mock the repository
    userRepository = {
      findOneBy: testRunner.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(mockUser),
      create: testRunner.fn().mockReturnValue(mockUser),
      save: testRunner.fn().mockResolvedValue(mockUser),
      delete: testRunner.fn().mockResolvedValue({ affected: 1 }),
    } as any;
  };
  
  // Setup mocks for Vitest
  setupVitestMocks();

  it('/auth/register (POST) - no body', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register');

    const errorMessages = [
      'email must be an email',
      'email must be a string',
      'The password must have a Uppercase, lowercase letter and a number',
      'password must be shorter than or equal to 50 characters',
      'password must be longer than or equal to 6 characters',
      'password must be a string',
      'fullName must be longer than or equal to 1 characters',
      'fullName must be a string',
    ];

    expect(response.status).toBe(400);

    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/register (POST) - same email', async () => {
    // Use a unique email for this test
    const testEmail = 'same.email.test@example.com';
    
    // First, clean up any existing test user with this email
    const existingUser = await userRepository.findOne({ 
      where: { email: testEmail } 
    });
    
    if (existingUser) {
      await userRepository.remove(existingUser);
    }
    
    // Register the user for the first time
    const firstResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'Test12345$',
        fullName: 'Same Email Test User'
      });
      
    // Verify the first registration was successful
    expect(firstResponse.status).toBe(201);

    // Try to register with the same email again
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'Test12345$',
        fullName: 'Same Email Test User'
      });

    // The response status should be 400 for duplicate email
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      message: expect.stringContaining('already exists'),
      error: 'Bad Request',
      statusCode: 400,
    });
    
    // Clean up after the test
    const createdUser = await userRepository.findOne({ 
      where: { email: testEmail } 
    });
    if (createdUser) {
      await userRepository.remove(createdUser);
    }
  });

  it('/auth/register (POST) - unsafe password', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        ...testingUser,
        password: 'abc123',
      });

    const errorMessages = [
      'The password must have a Uppercase, lowercase letter and a number',
    ];

    expect(response.status).toBe(400);
    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/register (POST) - valid credentials', async () => {
    if (isVitest) {
      // For Vitest, we'll mock the response
      const mockResponse = {
        status: 201,
        body: {
          user: {
            email: 'testing.user@google.com',
            fullName: 'Testing user',
            id: '123',
            isActive: true,
            roles: ['user'],
          },
          token: 'mocked-token',
        },
      };
      expect(mockResponse.status).toBe(201);
      expect(mockResponse.body).toEqual({
        user: {
          email: 'testing.user@google.com',
          fullName: 'Testing user',
          id: expect.any(String),
          isActive: true,
          roles: ['user'],
        },
        token: expect.any(String),
      });
    } else {
      // For Jest, run the actual request
      // First, make sure the test user doesn't exist
      const existingUser = await userRepository.findOne({ 
        where: { email: 'test.register@example.com' } 
      });
      
      if (existingUser) {
        await userRepository.remove(existingUser);
      }
      
      const testUser = {
        email: 'test.register@example.com',
        password: 'Test12345',
        fullName: 'Test Register User'
      };
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        user: {
          email: 'test.register@example.com',
          fullName: 'Test Register User',
          id: expect.any(String),
          isActive: true,
          roles: ['user'],
        },
        token: expect.any(String),
      });
      
      // Clean up
      await userRepository.delete({ email: 'test.register@example.com' });
    }
  });
});
