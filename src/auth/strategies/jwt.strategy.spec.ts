import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../interfaces';
import { UnauthorizedException } from '@nestjs/common';
import { fn, spyOn } from '../../test-helpers';

describe('JwtStrategy.ts', () => {
  let strategy: JwtStrategy;
  let mockUserRepository: any;
  let mockConfigService: any;

  beforeEach(() => {
    // Create repository mock
    mockUserRepository = {
      findOneBy: fn()
    };

    // Create config service mock
    mockConfigService = {
      get: fn().mockReturnValue('test-secret')
    };

    // Directly instantiate the strategy with our mocks
    strategy = new JwtStrategy(mockUserRepository, mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user if user exists and is active', async () => {
    const payload: JwtPayload = { id: '123' };
    const mockUser = { id: '123', isActive: true } as User;

    mockUserRepository.findOneBy.mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);

    expect(result).toEqual(mockUser);
    expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({ id: '123' });
  });

  it('should throw Unauthorized Exception if user does not exits', async () => {
    const payload: JwtPayload = { id: '123' };

    mockUserRepository.findOneBy.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(strategy.validate(payload)).rejects.toThrow('Token not valid');
  });

  it('should thrown Unauthorized exception if user is not active', async () => {
    const payload: JwtPayload = { id: '123' };
    const mockUser = { id: '123', isActive: false } as User;

    mockUserRepository.findOneBy.mockResolvedValue(mockUser);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      'User is inactive, talk with an admin',
    );
  });
});
