import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../../test/test-utils';

// Helper to generate a unique email per test
function uniqueEmail(prefix: string) {
  return `${prefix}+${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;
}


describe('AuthModule Register (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;

  let testUserEmails: string[];


  beforeEach(async () => {
    context = await setupTestApp();
    // Generate unique emails for this test
    testUserEmails = [
      uniqueEmail('testing.user'),
      uniqueEmail('test.register'),
      uniqueEmail('same.email.test'),
    ];
    for (const email of testUserEmails) {
      await context.userRepository.delete({ email });
    }
  });

  afterEach(async () => {
    for (const email of testUserEmails) {
      await context.userRepository.delete({ email });
    }
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
    const testEmail = testUserEmails[2];
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


  });

  it('/auth/register (POST) - unsafe password', async () => {
    const testUser = {
      email: testUserEmails[0],
      password: 'Abc12345',
      fullName: 'Testing user',
    };
    const response = await http(context.app)
      .post('/auth/register')
      .send({
        ...testUser,
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
      email: testUserEmails[1],
      password: 'Test12345',
      fullName: 'Test Register User',
    };
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


  });
});
