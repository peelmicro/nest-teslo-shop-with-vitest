import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../../test/test-utils';
import { validate } from 'uuid';

const testingUser = {
  email: 'testing.user@google.com',
  password: 'Abc12345',
  fullName: 'Testing user',
};

const testingAdminUser = {
  email: 'testing.admin@google.com',
  password: 'Abc12345',
  fullName: 'Testing admin',
};

describe('AuthModule Private (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;
  let token: string;
  let adminToken: string;

  beforeAll(async () => {
    context = await setupTestApp();
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
      { roles: ['admin', 'super-user'] }
    );

    // Login to get tokens
    const responseUser = await http(context.app)
      .post('/auth/login')
      .send({ email: testingUser.email, password: testingUser.password })
      .expect(201)
      .toReturn();
    token = responseUser.body.token;

    const responseAdmin = await http(context.app)
      .post('/auth/login')
      .send({ email: testingAdminUser.email, password: testingAdminUser.password })
      .expect(201)
      .toReturn();
    adminToken = responseAdmin.body.token;
  });

  afterAll(async () => {
    await context.userRepository.delete({ email: testingUser.email });
    await context.userRepository.delete({ email: testingAdminUser.email });
    await teardownTestApp(context);
  });

  it('should return 401 if no token is provided', async () => {
    const response = await http(context.app)
      .get('/auth/private')
      .expect(401)
      .toReturn();
  });

  it('should return new token and user if token is provided', async () => {
    // Register and login to get a valid token for this test
    const testUser = {
      email: 'test.token@example.com',
      password: 'Test12345',
      fullName: 'Test Token User',
    };
    await context.userRepository.delete({ email: testUser.email });
    await http(context.app)
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .toReturn();
    const loginResponse = await http(context.app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201)
      .toReturn();
    const originalToken = loginResponse.body.token;
    // Add a delay to ensure the new token has a different iat
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await http(context.app)
      .get('/auth/check-status')
      .set('Authorization', `Bearer ${originalToken}`)
      .expect(200)
      .toReturn();
    expect(response.body.token).not.toBe(originalToken);
    // Clean up
    await context.userRepository.delete({ email: testUser.email });
  });

  it('should return custom object if token is valid', async () => {
    const testUser = {
      email: 'test.private@example.com',
      password: 'Test12345',
      fullName: 'Test Private User',
    };
    await context.userRepository.delete({ email: testUser.email });
    await http(context.app)
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .toReturn();
    const loginResponse = await http(context.app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201)
      .toReturn();
    const userToken = loginResponse.body.token;
    const response = await http(context.app)
      .get('/auth/private')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .toReturn();
    expect(response.body).toMatchObject({
      ok: true,
      message: 'Hola Mundo Private',
      user: {
        id: expect.any(String),
        email: testUser.email,
        fullName: testUser.fullName,
        isActive: true,
        roles: ['user'],
      },
      userEmail: testUser.email,
    });
    // Clean up
    await context.userRepository.delete({ email: testUser.email });
  });

  it('should return 403 if non-admin user accesses admin route', async () => {
    const testUser = {
      email: 'test.nonadmin@example.com',
      password: 'Test12345',
      fullName: 'Test Non-Admin User',
    };
    await context.userRepository.delete({ email: testUser.email });
    await http(context.app)
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .toReturn();
    const loginResponse = await http(context.app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201)
      .toReturn();
    const userToken = loginResponse.body.token;
    const response = await http(context.app)
      .get('/auth/private3')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403)
      .toReturn();
    expect(response.body).toMatchObject({
      message: expect.stringContaining('need a valid role: [admin]'),
      error: 'Forbidden',
      statusCode: 403,
    });
    // Clean up
    await context.userRepository.delete({ email: testUser.email });
  });

    it('should return user if admin token is provided', async () => {
    const testUser = {
      email: 'test.admin@example.com',
      password: 'Test12345',
      fullName: 'Test Admin User',
    };
    await context.userRepository.delete({ email: testUser.email });
    await http(context.app)
      .post('/auth/register')
      .send(testUser)
      .expect(201)
      .toReturn();
    // Update user to have admin role
    await context.userRepository.update(
      { email: testUser.email },
      { roles: ['admin', 'super-user'] }
    );
    const loginResponse = await http(context.app)
      .post('/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(201)
      .toReturn();
    const adminToken = loginResponse.body.token;
    const response = await http(context.app)
      .get('/auth/private3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .toReturn();
    const userId = response.body.user.id;
    expect(validate(userId)).toBe(true);
    expect(response.body).toMatchObject({
      ok: true,
      user: {
        id: expect.any(String),
        email: testUser.email,
        fullName: testUser.fullName,
        isActive: true,
        roles: expect.arrayContaining(['admin', 'super-user']),
      },
    });
    // Clean up
    await context.userRepository.delete({ email: testUser.email });
  });
});
