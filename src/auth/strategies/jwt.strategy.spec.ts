import { JwtStrategy } from './jwt.strategy';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../interfaces';
import { UnauthorizedException } from '@nestjs/common';
import { fn, spyOn } from '../../test-helpers';

describe('JwtStrategy.ts', () => {
  let strategy: JwtStrategy;
  let userRepository: any;
  let configService: any;

  beforeEach(() => {
    // Create repository mock
    userRepository = {
      findOneBy: fn()
    };

    // Create config service mock
    configService = {
      get: fn().mockReturnValue('test-secret')
    };

    // Directly instantiate the strategy with our mocks
    strategy = new JwtStrategy(userRepository, configService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should validate and return user if user exists and is active', async () => {
    const payload: JwtPayload = { id: '123' };
    const mockUser = { id: '123', isActive: true } as User;

    userRepository.findOneBy.mockResolvedValue(mockUser);

    const result = await strategy.validate(payload);

    expect(result).toEqual(mockUser);
    expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: '123' });
  });

  it('should throw Unauthorized Exception if user does not exits', async () => {
    const payload: JwtPayload = { id: '123' };

    userRepository.findOneBy.mockResolvedValue(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(strategy.validate(payload)).rejects.toThrow('Token not valid');
  });

  it('should thrown Unauthorized exception if user is not active', async () => {
    const payload: JwtPayload = { id: '123' };
    const mockUser = { id: '123', isActive: false } as User;

    userRepository.findOneBy.mockResolvedValue(mockUser);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      'User is inactive, talk with an admin',
    );
  });
});
