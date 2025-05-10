import { ValidRoles } from '../interfaces';
import { Auth } from './auth.decorator';
import { testRunner } from '../../../test/test-utils';

// Mock dependencies directly without using mockModuleWithImports
// This avoids path resolution issues
jest.mock ? jest.mock('@nestjs/common', () => ({
  applyDecorators: jest.fn(),
  UseGuards: jest.fn()
})) : globalThis.vi.mock('@nestjs/common', () => ({
  applyDecorators: globalThis.vi.fn(),
  UseGuards: globalThis.vi.fn()
}));

jest.mock ? jest.mock('@nestjs/passport', () => ({
  AuthGuard: jest.fn(() => 'MockAuthGuard')
})) : globalThis.vi.mock('@nestjs/passport', () => ({
  AuthGuard: globalThis.vi.fn(() => 'MockAuthGuard')
}));

// Create a local mock for UserRoleGuard
const userRoleGuardMock = class MockUserRoleGuard {
  canActivate = testRunner.fn().mockReturnValue(true);
};

// Mock using direct path
jest.mock ? 
  jest.mock('../guards/user-role.guard', () => ({
    UserRoleGuard: userRoleGuardMock
  })) : 
  globalThis.vi.mock('../guards/user-role.guard', () => ({
    UserRoleGuard: userRoleGuardMock
  }));

// Mock directly for RoleProtected
jest.mock ? 
  jest.mock('./role-protected.decorator', () => ({
    RoleProtected: jest.fn((...args) => args)
  })) : 
  globalThis.vi.mock('./role-protected.decorator', () => ({
    RoleProtected: globalThis.vi.fn((...args) => args)
  }));

describe('Auth Decorator', () => {
  it('should export a function that combines multiple decorators', () => {
    // Ensure Auth is a function that can be called
    const roles = [ValidRoles.admin, ValidRoles.user];
    const result = Auth(...roles);
    
    // The result should be a function (decorator)
    expect(typeof result).toBe('function');
  });
});
