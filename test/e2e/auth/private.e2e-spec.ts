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
      { roles: ['admin', 'super-user'] },
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
      .send({
        email: testingAdminUser.email,
        password: testingAdminUser.password,
      })
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
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const response = await http(context.app)
      .get('/auth/check-status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .toReturn();
    expect(response.body.token).not.toBe(token);
  });

  it('should return custom object if token is valid', async () => {
    // Use shared testingUser and token
    const response = await http(context.app)
      .get('/auth/private')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .toReturn();
    expect(response.body).toMatchObject({
      ok: true,
      message: 'Hola Mundo Private',
      user: {
        id: expect.any(String),
        email: testingUser.email,
        fullName: testingUser.fullName,
        isActive: true,
        roles: ['user'],
      },
      userEmail: testingUser.email,
    });
  });

  it('should return 403 if non-admin user accesses admin route', async () => {
    // Use shared testingUser and token
    const response = await http(context.app)
      .get('/auth/private3')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .toReturn();
    expect(response.body).toMatchObject({
      message: expect.stringContaining('need a valid role: [admin]'),
      error: 'Forbidden',
      statusCode: 403,
    });
  });

  it('should return 403 if admin token is provided', async () => {
    // Non-admin user should get 403 on /auth/private3
    const response = await http(context.app)
      .get('/auth/private3')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
      .toReturn();
    expect(response.body.statusCode).toBe(403);
    expect(response.body.error).toBe('Forbidden');
    expect(response.body.message).toContain('need a valid role: [admin]');
  });

  it('should return user if admin token is provided', async () => {
    // Use shared adminToken and static admin user
    const response = await http(context.app)
      .get('/auth/private3')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .toReturn();
    const userId = response.body.user.id;
    expect(validate(userId)).toBe(true);
    expect(response.body).toEqual({
      ok: true,
      user: {
        id: expect.any(String),
        email: testingAdminUser.email,
        fullName: testingAdminUser.fullName,
        isActive: true,
        roles: ['admin', 'super-user'],
      },
    });
  });
});
