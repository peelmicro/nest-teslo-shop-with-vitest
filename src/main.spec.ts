import { Test } from '@nestjs/testing';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppModule } from './app.module';
import { bootstrap } from './main';
import { testRunner, createMockNestApp } from '../test/test-utils';

// Use a unique port for each test run to avoid conflicts
let testPortCounter = 4300;

describe('Main.ts Bootstrap', () => {
  let mockApp;
  let mockLogger;
  let mockDocumentBuilder;
  let mockSwaggerModule;
  let mockValidationPipe;
  let mockNestFactory;
  let mockConfigModule;
  let mockTypeOrmModule;
  let mockServeStaticModule;

  beforeEach(() => {
    // Setup NestJS mocks
    testRunner.setupNestJSMocks();
    
    // Create a mock app
    mockApp = createMockNestApp();
    
    // Mock NestFactory
    mockNestFactory = {
      create: testRunner.fn().mockResolvedValue(mockApp),
    };
    testRunner.spyOn(NestFactory, 'create').mockImplementation(mockNestFactory.create);
    
    // Mock the Logger
    mockLogger = {
      log: testRunner.fn(),
      error: testRunner.fn(),
    };
    testRunner.spyOn(Logger.prototype, 'log').mockImplementation(mockLogger.log);
    testRunner.spyOn(Logger.prototype, 'error').mockImplementation(mockLogger.error);
    
    // Mock DocumentBuilder
    mockDocumentBuilder = {
      setTitle: testRunner.fn().mockReturnThis(),
      setDescription: testRunner.fn().mockReturnThis(),
      setVersion: testRunner.fn().mockReturnThis(),
      build: testRunner.fn().mockReturnValue({}),
    };
    testRunner.spyOn(DocumentBuilder.prototype, 'setTitle').mockImplementation(mockDocumentBuilder.setTitle);
    testRunner.spyOn(DocumentBuilder.prototype, 'setDescription').mockImplementation(mockDocumentBuilder.setDescription);
    testRunner.spyOn(DocumentBuilder.prototype, 'setVersion').mockImplementation(mockDocumentBuilder.setVersion);
    testRunner.spyOn(DocumentBuilder.prototype, 'build').mockImplementation(mockDocumentBuilder.build);
    
    // Mock SwaggerModule
    mockSwaggerModule = {
      createDocument: testRunner.fn().mockReturnValue({}),
      setup: testRunner.fn(),
    };
    testRunner.spyOn(SwaggerModule, 'createDocument').mockImplementation(mockSwaggerModule.createDocument);
    testRunner.spyOn(SwaggerModule, 'setup').mockImplementation(mockSwaggerModule.setup);

    // Mock ValidationPipe
    mockValidationPipe = {
      transform: testRunner.fn().mockReturnValue(true),
    };
    testRunner.spyOn(ValidationPipe.prototype, 'transform').mockImplementation(mockValidationPipe.transform);

    // Mock ConfigModule
    mockConfigModule = {
      forRoot: testRunner.fn().mockReturnValue({}),
    };
    testRunner.spyOn(ConfigModule, 'forRoot').mockImplementation(mockConfigModule.forRoot);

    // Mock TypeOrmModule
    mockTypeOrmModule = {
      forRoot: testRunner.fn().mockReturnValue({}),
      forFeature: testRunner.fn().mockReturnValue({}),
    };
    testRunner.spyOn(TypeOrmModule, 'forRoot').mockImplementation(mockTypeOrmModule.forRoot);
    testRunner.spyOn(TypeOrmModule, 'forFeature').mockImplementation(mockTypeOrmModule.forFeature);

    // Mock ServeStaticModule
    mockServeStaticModule = {
      forRoot: testRunner.fn().mockReturnValue({}),
    };
    testRunner.spyOn(ServeStaticModule, 'forRoot').mockImplementation(mockServeStaticModule.forRoot);
    
    // Set a fresh unique port for each test
    const uniqueTestPort = (testPortCounter++).toString();
    process.env.PORT = uniqueTestPort;
  });
  
  afterEach(() => {
    // Reset environment variables
    delete process.env.PORT;
    delete process.env.NODE_ENV;
    delete process.env.ENABLE_SWAGGER_IN_TEST;
  });

  it('should create application', async () => {
    await bootstrap();
    expect(mockNestFactory.create).toHaveBeenCalledWith(AppModule);
  });

  it('should set global prefix', async () => {
    await bootstrap();
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api');
  });

  it('should listen on port 3000 if env port not set', async () => {
    // Delete the PORT env variable to test default
    delete process.env.PORT;
    await bootstrap();
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });

  it('should listen on env port', async () => {
    // The unique port has already been set in beforeEach
    const port = process.env.PORT;
    await bootstrap();
    expect(mockApp.listen).toHaveBeenCalledWith(port);
  });

  it('should use global pipes', async () => {
    await bootstrap();
    
    // Just verify that useGlobalPipes was called
    expect(mockApp.useGlobalPipes).toHaveBeenCalled();
    
    // Check that it was called with an object (we don't care about the specific details)
    const pipeArgument = mockApp.useGlobalPipes.mock.calls[0][0];
    expect(typeof pipeArgument).toBe('object');
    expect(pipeArgument).not.toBeNull();
  });

  it('should not setup Swagger in test environment', async () => {
    process.env.NODE_ENV = 'test';
    await bootstrap();
    expect(mockDocumentBuilder.setTitle).not.toHaveBeenCalled();
    expect(mockSwaggerModule.createDocument).not.toHaveBeenCalled();
    expect(mockSwaggerModule.setup).not.toHaveBeenCalled();
  });

  it('should setup Swagger if explicitly enabled in test', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_SWAGGER_IN_TEST = 'true';
    await bootstrap();
    expect(mockDocumentBuilder.setTitle).toHaveBeenCalledWith('Teslo RESTFul API');
    expect(mockDocumentBuilder.setDescription).toHaveBeenCalledWith('Teslo shop endpoints');
    expect(mockDocumentBuilder.setVersion).toHaveBeenCalledWith('1.0');
    expect(mockDocumentBuilder.build).toHaveBeenCalled();
    expect(mockSwaggerModule.createDocument).toHaveBeenCalled();
    expect(mockSwaggerModule.setup).toHaveBeenCalledWith('api', mockApp, {});
  });

  it('should setup Swagger in non-test environment', async () => {
    process.env.NODE_ENV = 'development';
    await bootstrap();
    expect(mockDocumentBuilder.setTitle).toHaveBeenCalledWith('Teslo RESTFul API');
    expect(mockDocumentBuilder.setDescription).toHaveBeenCalledWith('Teslo shop endpoints');
    expect(mockDocumentBuilder.setVersion).toHaveBeenCalledWith('1.0');
    expect(mockDocumentBuilder.build).toHaveBeenCalled();
    expect(mockSwaggerModule.createDocument).toHaveBeenCalled();
    expect(mockSwaggerModule.setup).toHaveBeenCalledWith('api', mockApp, {});
  });

  it('should log error but continue if Swagger setup fails in test', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ENABLE_SWAGGER_IN_TEST = 'true';
    const error = new Error('Swagger setup failed');
    mockSwaggerModule.createDocument.mockImplementation(() => {
      throw error;
    });
    await bootstrap();
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to setup Swagger: ' + error.message);
    expect(mockApp.listen).toHaveBeenCalled();
  });

  it('should throw error if Swagger setup fails in non-test environment', async () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Swagger setup failed');
    mockSwaggerModule.createDocument.mockImplementation(() => {
      throw error;
    });
    await expect(bootstrap()).rejects.toThrow(error);
  });
});
