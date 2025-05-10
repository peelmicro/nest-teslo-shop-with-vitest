/**
 * Test for the RoleProtected decorator
 * Works with both Jest and Vitest
 */
import { testRunner } from '../../../test/test-utils';
import { ValidRoles } from '../interfaces';
import { META_ROLES, RoleProtected } from './role-protected.decorator';

describe('RoleProtected Decorator', () => {
  it('should set the correct metadata on a class', () => {
    const roles = [ValidRoles.admin, ValidRoles.user];
    
    // Create a class with the decorator
    @RoleProtected(...roles)
    class TestClass {}
    
    // Mock the Reflect.getMetadata function and capture the result
    const getMetadataSpy = testRunner.spyOn(Reflect, 'getMetadata').mockReturnValue(roles);
    
    // Try to retrieve the metadata from the class
    const metadataValue = Reflect.getMetadata(META_ROLES, TestClass);
    
    // Verify Reflect.getMetadata was called with the right key
    expect(getMetadataSpy).toHaveBeenCalledWith(META_ROLES, TestClass);
    
    // The mock should return the roles we set
    expect(metadataValue).toEqual(roles);
  });
});
