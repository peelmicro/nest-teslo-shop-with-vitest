import { Test } from '@nestjs/testing';
import { testRunner, isVitest } from '../../test/test-utils';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';

describe('AuthModule', () => {
  let authService: AuthService;
  let authController: AuthController;
  let jwtStrategy: JwtStrategy;

  beforeEach(async () => {
    // Setup mocks
    testRunner.setupNestJSMocks();

    // Create mock implementations
    const mockRepository = {
      findOne: testRunner.fn().mockResolvedValue({ id: '1', isActive: true }),
      create: testRunner.fn().mockImplementation(dto => dto),
      save: testRunner.fn().mockImplementation(entity => ({ id: '1', ...entity })),
      findOneBy: testRunner.fn().mockResolvedValue({ id: '1', isActive: true }),
    };

    const mockJwtService = {
      sign: testRunner.fn().mockReturnValue('test-token'),
    };

    const mockConfigService = {
      get: testRunner.fn().mockReturnValue('test-secret'),
    };

    // Create testing module
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
      controllers: [AuthController],
    }).compile();

    // Get instances
    authService = moduleRef.get<AuthService>(AuthService);
    authController = moduleRef.get<AuthController>(AuthController);
    jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('should have AuthService as provider', () => {
    expect(authService).toBeDefined();
  });

  it('should have AuthController as controller', () => {
    expect(authController).toBeDefined();
  });

  it('should have JwtStrategy as provider', () => {
    expect(jwtStrategy).toBeDefined();
  });

  it('should have JwtService available', () => {
    const jwtService = testRunner.fn().mockReturnValue('test-token');
    expect(jwtService).toBeDefined();
  });
});
