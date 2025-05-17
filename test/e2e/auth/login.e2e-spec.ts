import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../../test/test-utils';

describe('Auth - Login (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;

  // Generate unique emails for each test
  let testingUser: { email: string; password: string; fullName: string };
  let testingAdminUser: { email: string; password: string; fullName: string };

  beforeEach(async () => {
    const unique = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    testingUser = {
      email: `testing.user+${unique}@google.com`,
      password: 'Abc12345',
      fullName: 'Testing User',
    };
    testingAdminUser = {
      email: `testing.admin+${unique}@google.com`,
      password: 'Abc12345',
      fullName: 'Testing Admin',
    };
    context = await setupTestApp();
    // Clean up only the users created for this test
    await context.userRepository.delete({ email: testingUser.email });
    await context.userRepository.delete({ email: testingAdminUser.email });

    await http(context.app)
      .post('/auth/register')
      .send(testingUser)
      .expect(201)
      .toReturn();

    await http(context.app)
      .post('/auth/register')
      .send(testingAdminUser)
      .expect(201)
      .toReturn();

    // Update admin roles
    await context.userRepository.update(
      { email: testingAdminUser.email },
      { roles: ['admin'] }
    );
  });

  afterEach(async () => {
    // Clean up only the users created for this test
    await context.userRepository.delete({ email: testingUser.email });
    await context.userRepository.delete({ email: testingAdminUser.email });
    await teardownTestApp(context);
  });

  it('/auth/login (POST) - should throw 400 if no body', async () => {
    const response = await http(context.app)
      .post('/auth/login')
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
    ];
    errorMessages.forEach((message) => {
      expect(response.body.message).toContain(message);
    });
  });

  it('/auth/login (POST) - wrong credentials - email', async () => {
    const response = await http(context.app)
      .post('/auth/login')
      .send({
        email: 'testingUser.email@google.com',
        password: testingUser.password,
      })
      .expect(401)
      .toReturn();
    expect(response.body).toEqual({
      message: 'Credentials are not valid (email)',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('/auth/login (POST) - wrong credentials - password', async () => {
    const response = await http(context.app)
      .post('/auth/login')
      .send({ email: testingUser.email, password: 'Abc123456788' })
      .expect(401)
      .toReturn();
    expect(response.body).toEqual({
      message: 'Credentials are not valid (password)',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('/auth/login (POST) - valid credentials', async () => {
    const response = await http(context.app)
      .post('/auth/login')
      .send({ email: testingUser.email, password: testingUser.password })
      .expect(201)
      .toReturn();
    expect(response.body).toMatchObject({
      user: {
        id: expect.any(String),
        email: testingUser.email,
        fullName: 'Testing User',
        isActive: true,
        roles: ['user'],
      },
      token: expect.any(String),
    });
  });
});
