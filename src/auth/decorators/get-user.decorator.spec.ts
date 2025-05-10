import { ExecutionContext } from '@nestjs/common';
import { getUser } from './get-user.decorator';
import { testRunner, isVitest, InternalServerErrorException } from '../../../test/test-utils';

// Use our agnostic approach to mocking
testRunner.mockModuleWithImports({
  moduleName: '@nestjs/common',
  factory: (originalModule) => ({
    ...(originalModule || {}),
    createParamDecorator: testRunner.fn(),
    // Use our exported exception instead of trying to import it
    InternalServerErrorException: InternalServerErrorException
  })
});

describe('GetUser Decorator', () => {
  const mockExecutionContext = {
    switchToHttp: testRunner.fn().mockReturnValue({
      getRequest: testRunner.fn().mockReturnValue({
        user: {
          id: '1',
          name: 'John Doe',
        },
      }),
    }),
  } as unknown as ExecutionContext;

  it('should return the user from the request', () => {
    const result = getUser(null, mockExecutionContext);

    expect(result).toEqual({ id: '1', name: 'John Doe' });
  });

  it('should return the user name from the request', () => {
    const result = getUser('name', mockExecutionContext);
    expect(result).toEqual('John Doe');
  });

  it('should throw an internal server error if user not found', () => {
    const mockExecutionContext = {
      switchToHttp: testRunner.fn().mockReturnValue({
        getRequest: testRunner.fn().mockReturnValue({
          user: null,
        }),
      }),
    } as unknown as ExecutionContext;

    try {
      getUser(null, mockExecutionContext);
      // This line should not be reached if the getUser properly throws an error
      expect(true).toBe(false);
    } catch (error) {
      // Compare by name rather than by instanceof for better test stability
      expect(error.name).toBe('InternalServerErrorException');
      expect(error.message).toBe('User not found (request)');
    }
  });
});
