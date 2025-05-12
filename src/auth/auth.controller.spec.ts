import { AuthController } from './auth.controller';
import { User } from './entities/user.entity';
import { fn } from '../test-helpers';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: any;

  beforeEach(() => {
    // Create custom mocks for this specific test
    authService = {
      create: fn().mockImplementation((dto: { email: any; fullName: any; }) => {
        return {
          user: {
            id: 'test-id',
            email: dto.email,
            fullName: dto.fullName,
            isActive: true,
            roles: ['user']
          },
          token: 'test-token'
        };
      }),
      login: fn().mockImplementation((dto: { email: any; }) => {
        return {
          user: {
            id: 'test-id',
            email: dto.email,
            fullName: 'Test User',
            isActive: true,
            roles: ['user']
          },
          token: 'test-token'
        };
      }),
      checkAuthStatus: fn().mockImplementation((user: any) => {
        return {
          user,
          token: 'test-token'
        };
      })
    };

    // Manually instantiate the controller with our mocks
    authController = new AuthController(authService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  it('should create user with the proper DTO', async () => {
    const dto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    const result = await authController.createUser(dto);

    expect(authService.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      user: {
        id: 'test-id',
        email: dto.email,
        fullName: dto.fullName,
        isActive: true,
        roles: ['user']
      },
      token: 'test-token'
    });
  });

  it('should loginUser with the proper DTO', async () => {
    const dto = {
      email: 'test@google.com',
      password: 'Abc123',
    };

    const result = await authController.loginUser(dto);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({
      user: {
        id: 'test-id',
        email: dto.email,
        fullName: 'Test User',
        isActive: true,
        roles: ['user']
      },
      token: 'test-token'
    });
  });

  it('should check-user status with the proper DTO', async () => {
    const user = {
      id: 'test-id',
      email: 'test@google.com',
      fullName: 'Test User',
      isActive: true,
      roles: ['user']
    } as User;

    const result = await authController.checkAuthStatus(user);

    expect(authService.checkAuthStatus).toHaveBeenCalledWith(user);
    expect(result).toEqual({
      user,
      token: 'test-token'
    });
  });

  it('should return private route data', () => {
    const user = {
      id: 'test-id',
      email: 'test@google.com',
      fullName: 'Test User',
    } as User;

    const request = {
      headers: { header1: 'value1', header2: 'value2' }
    } as any;

    const rawHeaders = ['header1: value1', 'header2: value2'];
    const headers = { header1: 'value1', header2: 'value2' };

    const result = authController.testingPrivateRoute(
      request,
      user,
      user.email,
      rawHeaders,
      headers
    );

    expect(result).toEqual({
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail: user.email,
      rawHeaders,
      headers
    });
  });

  it('should handle create user service errors', async () => {
    const dto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    authService.create = fn().mockRejectedValue(new BadRequestException('Email already exists'));

    await expect(authController.createUser(dto)).rejects.toThrow(BadRequestException);
    await expect(authController.createUser(dto)).rejects.toThrow('Email already exists');
  });

  it('should handle login service errors', async () => {
    const dto = {
      email: 'test@google.com',
      password: 'Abc123',
    };

    authService.login = fn().mockRejectedValue(new UnauthorizedException('Credentials are not valid'));

    await expect(authController.loginUser(dto)).rejects.toThrow(UnauthorizedException);
    await expect(authController.loginUser(dto)).rejects.toThrow('Credentials are not valid');
  });

  it('should handle check auth status service errors', async () => {
    const user = {
      id: 'test-id',
      email: 'test@google.com',
      fullName: 'Test User',
    } as User;

    authService.checkAuthStatus = fn().mockRejectedValue(new UnauthorizedException('Token not valid'));

    await expect(authController.checkAuthStatus(user)).rejects.toThrow(UnauthorizedException);
    await expect(authController.checkAuthStatus(user)).rejects.toThrow('Token not valid');
  });

  it('should handle missing user in private route', () => {
    const request = {
      headers: { header1: 'value1' }
    } as any;

    const rawHeaders = ['header1: value1'];
    const headers = { header1: 'value1' };

    const result = authController.testingPrivateRoute(
      request,
      null,
      null,
      rawHeaders,
      headers
    );

    expect(result).toEqual({
      ok: true,
      message: 'Hola Mundo Private',
      user: null,
      userEmail: null,
      rawHeaders,
      headers
    });
  });

  it('should handle empty headers in private route', () => {
    const user = {
      id: 'test-id',
      email: 'test@google.com',
      fullName: 'Test User',
    } as User;

    const request = {} as any;
    const rawHeaders: string[] = [];
    const headers = {};

    const result = authController.testingPrivateRoute(
      request,
      user,
      user.email,
      rawHeaders,
      headers
    );

    expect(result).toEqual({
      ok: true,
      message: 'Hola Mundo Private',
      user,
      userEmail: user.email,
      rawHeaders,
      headers
    });
  });
});
