import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../../test/test-utils';

const testingUser = {
  email: 'testing.user@google.com',
  password: 'Abc12345',
  fullName: 'Testing user',
};

describe('AuthModule Register (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;

  beforeAll(async () => {
    context = await setupTestApp();
  });

  afterAll(async () => {
    await context.userRepository.delete({ email: testingUser.email });
    await teardownTestApp(context);
  });

  it('/auth/register (POST) - no body', async () => {
    const response = await http(context.app)
      .post('/auth/register')
      .send({})
      .expect(400)
      .toReturn();

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
    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/register (POST) - same email', async () => {
    const testEmail = 'same.email.test@example.com';
    // Clean up before
    await context.userRepository.delete({ email: testEmail });

    // Register the user for the first time
    await http(context.app)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'Test12345$',
        fullName: 'Same Email Test User',
      })
      .expect(201)
      .toReturn();

    // Try to register with the same email again
    const response = await http(context.app)
      .post('/auth/register')
      .send({
        email: testEmail,
        password: 'Test12345$',
        fullName: 'Same Email Test User',
      })
      .expect(400)
      .toReturn();

    expect(response.body).toMatchObject({
      message: expect.stringContaining('already exists'),
      error: 'Bad Request',
      statusCode: 400,
    });

    // Clean up after the test
    await context.userRepository.delete({ email: testEmail });
  });

  it('/auth/register (POST) - unsafe password', async () => {
    const response = await http(context.app)
      .post('/auth/register')
      .send({
        ...testingUser,
        password: 'abc123',
      })
      .expect(400)
      .toReturn();

    const errorMessages = [
      'The password must have a Uppercase, lowercase letter and a number',
    ];
    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/register (POST) - valid credentials', async () => {
    const testUser = {
      email: 'test.register@example.com',
      password: 'Test12345',
      fullName: 'Test Register User',
    };

    // Clean up before
    await context.userRepository.delete({ email: testUser.email });

    const response = await http(context.app)
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .toReturn();

    expect(response.body).toMatchObject({
      user: {
        email: testUser.email,
        fullName: testUser.fullName,
        id: expect.any(String),
        isActive: true,
        roles: ['user'],
      },
      token: expect.any(String),
    });

    // Clean up
    await context.userRepository.delete({ email: testUser.email });
  });
});
