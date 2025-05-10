import { createParamDecorator } from '@nestjs/common';
import { getRawHeaders } from './raw-headers.decorator';
import { testRunner } from '../../../test/test-utils';

describe('RawHeader Decorator', () => {
  // Setup test mocks
  const mockRequest = {
    rawHeaders: ['Host', 'localhost:3000', 'Content-Type', 'application/json'],
  };

  const mockExecutionContext = {
    switchToHttp: testRunner.fn().mockReturnValue({
      getRequest: testRunner.fn().mockReturnValue(mockRequest),
    }),
  };

  it('should return the raw headers from the request', () => {
    // Call the factory function directly
    const result = getRawHeaders(null, mockExecutionContext as any);

    // Verify the execution context methods were called
    expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
    expect(mockExecutionContext.switchToHttp().getRequest).toHaveBeenCalled();

    // Verify the result is the raw headers
    expect(result).toEqual(mockRequest.rawHeaders);
  });

  it('should be a valid decorator function', () => {
    // Simply check that the import works and the function is defined
    expect(typeof getRawHeaders).toBe('function');
  });
});
