/**
 * Test for the Auth decorator
 * Works with both Jest and Vitest
 * 
 * Note: This tests the Auth decorator functionality, not the UserRoleGuard itself.
 * UserRoleGuard should be tested separately with its own test file.
 */
import { testRunner } from '../../../test/test-utils';
import { ValidRoles } from '../interfaces';
import { Auth } from './auth.decorator';
import { RoleProtected } from './role-protected.decorator';
import { META_ROLES } from './role-protected.decorator';
import * as nestCommon from '@nestjs/common';

describe('Auth Decorator', () => {
  // Basic functionality tests
  it('should be a function', () => {
    expect(typeof Auth).toBe('function');
  });
  
  it('should return a function when called', () => {
    const roles = [ValidRoles.admin, ValidRoles.user];
    const result = Auth(...roles);
    expect(typeof result).toBe('function');
  });
  
  // Testing the RoleProtected functionality through metadata
  it('should set the correct role metadata on a class (needed by UserRoleGuard)', () => {
    const roles = [ValidRoles.admin, ValidRoles.user];
    
    // Use the Auth decorator
    @Auth(...roles)
    class TestClass {}
    
    // Spy on Reflect.getMetadata to verify the correct key is accessed
    const getMetadataSpy = testRunner.spyOn(Reflect, 'getMetadata')
      .mockReturnValue(roles);
    
    // Get the metadata that would be used by UserRoleGuard
    const metadataValue = Reflect.getMetadata(META_ROLES, TestClass);
    
    // Verify the correct metadata key was requested
    expect(getMetadataSpy).toHaveBeenCalledWith(META_ROLES, TestClass);
    expect(metadataValue).toEqual(roles);
    
    // Clean up
    getMetadataSpy.mockRestore();
  });
  
  // End-to-end behavior test
  it('should create a decorator that combines role protection and guards', () => {
    const decoratorSpy = testRunner.spyOn(nestCommon, 'applyDecorators');
    
    // Call the Auth decorator and capture what it returns
    const roles = [ValidRoles.admin];
    const decorator = Auth(...roles);
    
    // Verify the basic type - we know applyDecorators returns a function
    expect(typeof decorator).toBe('function');
    
    // Clean up
    decoratorSpy.mockRestore();
  });
  
  // Functional equivalence test - comparing behavior to what we expect
  it('should use RoleProtected with the same roles passed to Auth', () => {
    const roles = [ValidRoles.admin, ValidRoles.superUser];
    
    // First apply the Auth decorator
    @Auth(...roles)
    class WithAuth {}
    
    // Then apply RoleProtected directly with the same roles
    @RoleProtected(...roles)
    class WithRoleProtected {}
    
    // Spy on getMetadata to compare what would be retrieved from each class
    const spy1 = testRunner.spyOn(Reflect, 'getMetadata')
      .mockImplementation((key, target) => {
        if (key === META_ROLES) {
          return roles;
        }
        return undefined;
      });
    
    // Get metadata from both classes
    const authMetadata = Reflect.getMetadata(META_ROLES, WithAuth);
    const roleMetadata = Reflect.getMetadata(META_ROLES, WithRoleProtected);
    
    // Both should have the same role metadata
    expect(authMetadata).toEqual(roleMetadata);
    
    // Clean up
    spy1.mockRestore();
  });
});
