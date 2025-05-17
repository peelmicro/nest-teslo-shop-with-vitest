import { INestApplication } from '@nestjs/common';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../test-utils';

describe('FilesModule (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;
  let app: INestApplication;
  let testImagePath: string;

  beforeAll(async () => {
    context = await setupTestApp();
    app = context.app;
    testImagePath = join(__dirname, 'test-image.jpg');
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });

  it('should throw a 400 error if no file selected', async () => {
    const response = await http(app).post('/files/product').expect(400).toReturn();
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Make sure that the file is an image',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('should throw a 400 error if file is not an image', async () => {
    const response = await http(app)
      .post('/files/product')
      .attach('file', Buffer.from('This is a test file'), 'test.txt')
      .expect(400)
      .toReturn();
    expect(response.body).toEqual({
      message: 'Make sure that the file is an image',
      error: 'Bad Request',
      statusCode: 400,
    });
  });

  it('should upload image file successfully', async () => {
    const response = await http(app)
      .post('/files/product')
      .attach('file', testImagePath)
      .expect(201)
      .toReturn();

    const fileName = response.body.fileName;
    expect(response.body).toHaveProperty('secureUrl');
    expect(response.body).toHaveProperty('fileName');
    expect(response.body.secureUrl).toContain('/files/product');

    const filePath = join(__dirname, '../../../static/products', fileName);
    const fileExists = existsSync(filePath);
    expect(fileExists).toBeTruthy();
    // Clean up the uploaded file
    if (fileExists) {
      unlinkSync(filePath);
    }
  });

  it('should throw a 400 error if the requested image does not exist', async () => {
    const response = await http(app)
      .get('/files/product/non-product-image.jpg')
      .expect(400)
      .toReturn();
    expect(response.body).toEqual({
      message: 'No product found with image non-product-image.jpg',
      error: 'Bad Request',
      statusCode: 400,
    });
  });
});
