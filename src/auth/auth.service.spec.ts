import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { CreateUserDto, LoginUserDto } from './dto';
import * as bcrypt from 'bcrypt';
import { fn, spyOn, clearAllMocks } from '../test-helpers';

// Import directly from @nestjs/common for actual exception types used by the service
import { BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';

// Create application-specific mocks using the framework-agnostic test utility functions
describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: any;
  let jwtService: any;

  beforeEach(async () => {
    // Reset mocks
    clearAllMocks();
    
    // Create custom mocks for this specific test
    userRepository = {
      create: fn(),
      save: fn(),
      findOne: fn(),
      findOneBy: fn()
    };

    jwtService = {
      sign: fn().mockReturnValue('mock-token')
    };

    // Manually instantiate the service with our mocks
    authService = new AuthService(userRepository, jwtService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('should create a user and return user with token', async () => {
    const dto: CreateUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    const user = {
      id: 'uuid',
      email: dto.email,
      password: 'hashed_password',
      fullName: dto.fullName,
      isActive: true,
      roles: ['user'],
    } as User;

    // Setup the mocks
    userRepository.create.mockReturnValue(user);
    userRepository.save.mockResolvedValue(user);
    spyOn(bcrypt, 'hashSync').mockReturnValue('hashed_password');

    const result = await authService.create(dto);

    // Check that the user was created with the correct data
    expect(userRepository.create).toHaveBeenCalledWith({
      ...dto,
      password: 'hashed_password',
    });
    expect(userRepository.save).toHaveBeenCalledWith(user);
    
    // Check the returned result
    expect(result).toEqual({
      user: {
        id: 'uuid',
        email: dto.email,
        fullName: dto.fullName,
        isActive: true,
        roles: ['user'],
      },
      token: 'mock-token',
    });
    
    // Check that the password is not in the returned user
    expect(result.user.password).toBeUndefined();
  });

  it('should throw an error if email already exists', async () => {
    const dto: CreateUserDto = {
      email: 'existing@google.com',
      password: 'Abc123',
      fullName: 'Existing User',
    };

    const user = { ...dto, password: 'hashed_password' } as User;
    userRepository.create.mockReturnValue(user);

    // Mock save to throw a duplicate key error
    userRepository.save.mockRejectedValue({ 
      code: '23505', 
      detail: 'Email already exists' 
    });

    // Check that the service throws the correct error
    await expect(authService.create(dto)).rejects.toThrow('Email already exists');
    try {
      await authService.create(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
    }
  });

  it('should throw an internal server error', async () => {
    const dto: CreateUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    const user = { ...dto, password: 'hashed_password' } as User;
    userRepository.create.mockReturnValue(user);

    // Mock console.log to avoid polluting the test output
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    // Mock save to throw a generic error
    userRepository.save.mockRejectedValue({ 
      code: '9999', 
      detail: 'Unhandled error' 
    });

    // Check that the service throws the correct error
    await expect(authService.create(dto)).rejects.toThrow('Please check server logs');
    try {
      await authService.create(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
    }
    
    // Clean up
    consoleSpy.mockRestore();
  });

  it('should login user and return token', async () => {
    const dto: LoginUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
    };

    const user = {
      id: 'uuid',
      email: dto.email,
      password: 'hashed_password',
      fullName: 'Test User',
      isActive: true,
      roles: ['user'],
    } as User;

    // Setup the mocks
    userRepository.findOne.mockResolvedValue(user);
    spyOn(bcrypt, 'compareSync').mockReturnValue(true);

    const result = await authService.login(dto);

    // Check that the user was found with the correct parameters
    expect(userRepository.findOne).toHaveBeenCalledWith({
      where: { email: dto.email },
      select: { email: true, password: true, id: true, fullName: true, roles: true, isActive: true },
    });
    
    // Check the returned result
    expect(result).toEqual({
      user: {
        id: 'uuid',
        email: dto.email,
        fullName: 'Test User',
        isActive: true,
        roles: ['user'],
      },
      token: 'mock-token',
    });
    
    // Check that the password is not in the returned user
    expect(result.user.password).toBeUndefined();
  });

  it('should throw an UnAuthorized Exception if user does not exist', async () => {
    const dto = { email: 'test@google.com', password: 'Abc123' } as LoginUserDto;

    // Mock findOne to return null (user not found)
    userRepository.findOne.mockResolvedValue(null);

    // Check that the service throws the correct error
    await expect(authService.login(dto)).rejects.toThrow('Credentials are not valid (email)');
    try {
      await authService.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
  });

  it('should throw an UnAuthorized Exception if password is invalid', async () => {
    const dto = { email: 'test@google.com', password: 'Abc123' } as LoginUserDto;

    // Mock findOne to return a user
    userRepository.findOne.mockResolvedValue({
      id: 'uuid',
      email: dto.email,
      password: 'wrong_password',
      fullName: 'Test User',
      isActive: true,
      roles: ['user'],
    } as User);
    
    // Mock bcrypt.compareSync to return false (invalid password)
    spyOn(bcrypt, 'compareSync').mockReturnValue(false);

    // Check that the service throws the correct error
    await expect(authService.login(dto)).rejects.toThrow('Credentials are not valid (password)');
    try {
      await authService.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
  });

  it('should check auth status and return user with new token', async () => {
    const user = {
      id: 'uuid',
      email: 'test@google.com',
      fullName: 'Test User',
      isActive: true,
      roles: ['user'],
    } as User;

    const result = await authService.checkAuthStatus(user);

    // Check that JWT sign was called with the correct payload
    expect(jwtService.sign).toHaveBeenCalledWith({ id: user.id });
    
    // Check the returned result
    expect(result).toEqual({
      user,
      token: 'mock-token',
    });
  });

  it('should handle empty dto properly', async () => {
    const dto = {} as CreateUserDto;
    
    // Mock to simulate error during user creation
    userRepository.create.mockImplementation(() => {
      throw new Error('Cannot convert undefined or null to object');
    });
    
    await expect(authService.create(dto)).rejects.toThrow();
    expect(userRepository.save).not.toHaveBeenCalled();
  });

  it('should handle user inactive case in login', async () => {
    const dto = { email: 'inactive@google.com', password: 'Abc123' } as LoginUserDto;

    // Create a user that is inactive
    const inactiveUser = {
      id: 'uuid',
      email: dto.email,
      password: 'hashed_password',
      fullName: 'Inactive User',
      isActive: false, // User is not active
      roles: ['user'],
    } as User;

    // Mock findOne to return the inactive user
    userRepository.findOne.mockResolvedValue(inactiveUser);
    
    // Password would be correct, but user is inactive
    spyOn(bcrypt, 'compareSync').mockReturnValue(true);

    // Now that we've updated the service to check isActive, we should expect an exception
    await expect(authService.login(dto)).rejects.toThrow('User is inactive, please contact an administrator');
    
    try {
      await authService.login(dto);
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
    }
    
    // bcrypt.compareSync should not be called since we throw before password check
    expect(bcrypt.compareSync).not.toHaveBeenCalled();
  });

  it('should handle database connection errors', async () => {
    const dto: CreateUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    const user = { ...dto, password: 'hashed_password' } as User;
    userRepository.create.mockReturnValue(user);
    userRepository.save.mockRejectedValue(new Error('Database connection failed'));
    
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    await expect(authService.create(dto)).rejects.toThrow('Please check server logs');
    
    consoleSpy.mockRestore();
  });

  it('should handle JWT signing errors', async () => {
    const dto: CreateUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    const user = {
      id: 'uuid',
      email: dto.email,
      password: 'hashed_password',
      fullName: dto.fullName,
      isActive: true,
      roles: ['user'],
    } as User;

    userRepository.create.mockReturnValue(user);
    userRepository.save.mockResolvedValue(user);
    jwtService.sign.mockImplementation(() => {
      throw new Error('JWT signing failed');
    });
    
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    await expect(authService.create(dto)).rejects.toThrow('Please check server logs');
    
    consoleSpy.mockRestore();
  });

  it('should handle bcrypt hashing errors', async () => {
    const dto: CreateUserDto = {
      email: 'test@google.com',
      password: 'Abc123',
      fullName: 'Test User',
    };

    spyOn(bcrypt, 'hashSync').mockImplementation(() => {
      throw new Error('Bcrypt hashing failed');
    });
    
    const consoleSpy = spyOn(console, 'log').mockImplementation(() => {});

    await expect(authService.create(dto)).rejects.toThrow('Please check server logs');
    
    consoleSpy.mockRestore();
  });
});
