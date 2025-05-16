import { setupTestApp, teardownTestApp } from '../test-setup';
import { http } from '../../../test/test-utils';

describe('Auth Login (e2e)', () => {
  let context: Awaited<ReturnType<typeof setupTestApp>>;
  const testUser = {
    email: 'test@example.com',
    password: 'ValidPassword123!',
    fullName: 'Test User',
    isActive: true
  };

  beforeAll(async () => {
    context = await setupTestApp();
    
    try {
      const response = await http(context.app)
        .post('/auth/register')
        .send(testUser);
      
      console.log('Raw registration response:', response);
    } catch (error) {
      console.error('Registration failed with:', error.response?.body);
      throw error;
    }
  });

  it('should login successfully', async () => {
    const response = await http(context.app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      })
      .expect(201)
      .toReturn();
    
    expect(response.body).toHaveProperty('token');
  });

  afterAll(async () => {
    await teardownTestApp(context);
  });
});
