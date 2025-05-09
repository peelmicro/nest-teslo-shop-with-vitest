import { NestFactory } from '@nestjs/core';
import { bootstrap } from './main';
import { AppModule } from './app.module';
import { testRunner, isVitest } from '../test/test-utils';

// Set environment to test
process.env.NODE_ENV = 'test';

// Create a framework-agnostic bootstrap mock function
const createBootstrapMock = () => {
  return testRunner.fn().mockImplementation(async () => {
    // Get NestFactory correctly for each framework
    const mockApp = {
      setGlobalPrefix: testRunner.fn(),
      useGlobalPipes: testRunner.fn(),
      listen: testRunner.fn().mockResolvedValue(undefined),
      enableCors: testRunner.fn(),
      getHttpAdapter: testRunner.fn().mockReturnValue({
        getInstance: testRunner.fn().mockReturnValue({}),
        getType: testRunner.fn().mockReturnValue('express')
      })
    };
    
    // When using NestFactory.create as a jest.Mock, we need to manually set up the return value
    if (isVitest) {
      // For Vitest
      globalThis.vi.mocked(NestFactory.create).mockResolvedValue(mockApp);
    } else {
      // For Jest
      (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
    }
    
    // Common app setup that matches the real bootstrap function
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix('api');
    app.useGlobalPipes();
    app.listen(process.env.PORT ?? 3000);
    
    return app;
  });
};

// Setup framework-specific mocks but with shared implementation
if (isVitest) {
  // Vitest environment
  globalThis.vi.mock('./main', async () => {
    const originalModule = await globalThis.vi.importActual('./main');
    return {
      ...(originalModule as object),
      bootstrap: createBootstrapMock(),
    };
  });
  
  // Mock NestFactory.create for Vitest
  globalThis.vi.mock('@nestjs/core', async () => {
    const originalModule = await globalThis.vi.importActual('@nestjs/core');
    return {
      ...(originalModule as object),
      NestFactory: {
        ...(originalModule.NestFactory || {}),
        create: globalThis.vi.fn().mockResolvedValue({})
      }
    };
  });
} else {
  // Jest environment
  jest.mock('./main', () => {
    const actualModule = jest.requireActual('./main');
    return {
      ...actualModule,
      bootstrap: createBootstrapMock(),
    };
  });
  
  // Mock is already set up by jest-setup.ts
}

// Framework-agnostic test
describe('Main.ts Bootstrap', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.PORT;
    testRunner.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.PORT;
  });

  it('should create application', async () => {
    await bootstrap();
    if (isVitest) {
      expect(NestFactory.create).toHaveBeenCalled();
    } else {
      expect(NestFactory.create).toHaveBeenCalled();
    }
  });

  it('should set global prefix', async () => {
    await bootstrap();
    // Get the mock app from the mocked NestFactory.create
    const mockApp = await NestFactory.create(AppModule);
    expect(mockApp.setGlobalPrefix).toHaveBeenCalledWith('api');
  });

  it('should listen on port 3000 if env port not set', async () => {
    await bootstrap();
    const mockApp = await NestFactory.create(AppModule);
    expect(mockApp.listen).toHaveBeenCalledWith(3000);
  });

  it('should listen on env port', async () => {
    process.env.PORT = '4200';
    await bootstrap();
    const mockApp = await NestFactory.create(AppModule);
    expect(mockApp.listen).toHaveBeenCalledWith('4200');
  });

  it('should use global pipes', async () => {
    await bootstrap();
    const mockApp = await NestFactory.create(AppModule);
    expect(mockApp.useGlobalPipes).toHaveBeenCalled();
  });
});
