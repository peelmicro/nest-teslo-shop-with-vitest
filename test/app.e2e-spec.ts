import { TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { http } from './test-utils';
import { setupTestApp, teardownTestApp } from './e2e/test-setup';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let testContext: any; // To store the test context

  beforeAll(async () => {
    testContext = await setupTestApp();
    app = testContext.app;
    moduleFixture = testContext.module;
  });

  afterAll(async () => {
    // Clean up all resources
    if (testContext) {
      await teardownTestApp(testContext);
    }
    if (app) {
      await app.close();
    }
    if (moduleFixture) {
      await moduleFixture.close();
    }
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  it('/ (GET) should return 404', async () => {
    const response = await http(app).get('/');
    await response.expect(404).toReturn();
  });
});