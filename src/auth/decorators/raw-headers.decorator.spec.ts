import { ExecutionContext } from '@nestjs/common';
import { testRunner, isVitest } from '../../../test/test-utils';

// TypeScript declarations for test globals
declare const vi: any;
declare const jest: any;

// Define the augmented decorator type that includes factory property for Vitest
interface AugmentedDecorator {
  (...args: any[]): any;
  factory: (data: any, ctx: ExecutionContext) => any;
}

// Handle mocking differently for Jest and Vitest
if (isVitest) {
  vi.mock('@nestjs/common', async () => {
    const actual = await vi.importActual('@nestjs/common');
    return {
      ...actual,
      createParamDecorator: vi.fn((factory) => {
        // Return a decorated function that maintains a reference to the factory
        const decorator = (...args: any[]) => ({ factory, args });
        decorator.factory = factory;
        return decorator as AugmentedDecorator;
      })
    };
  });
} else {
  jest.mock('@nestjs/common', () => {
    const actual = jest.requireActual('@nestjs/common');
    return {
      ...actual,
      createParamDecorator: jest.fn()
    };
  });
}

// Import after mocking
import { createParamDecorator } from '@nestjs/common';
import { getRawHeaders, RawHeaders } from './raw-headers.decorator';

describe('RawHeader Decorator', () => {
  const mockRequest = {
    rawHeaders: ['Authorization', 'Bearer Token', 'User-Agent', 'NestJS'],
  };

  const mockExecutionContext = {
    switchToHttp: testRunner.fn().mockReturnValue({
      getRequest: testRunner.fn().mockReturnValue(mockRequest),
    }),
  } as unknown as ExecutionContext;

  it('should return the raw headers from the request', () => {
    const result = getRawHeaders(null, mockExecutionContext);

    expect(mockExecutionContext.switchToHttp).toHaveBeenCalled();
    expect(mockExecutionContext.switchToHttp().getRequest).toHaveBeenCalled();
    expect(result).toEqual(mockRequest.rawHeaders);
  });

  it('should call createParamDecorator with getRawHeaders', () => {
    if (isVitest) {
      // For Vitest - verify that RawHeaders was created with getRawHeaders
      // If RawHeaders.factory equals getRawHeaders, the only way that can be true
      // is that createParamDecorator was invoked with getRawHeaders.
      // So the assertion provides the same guarantee that the Jest spy gives, without
      // relying on a late-registered spy that Vitest cannot attach.
      expect((RawHeaders as unknown as AugmentedDecorator).factory).toBe(getRawHeaders);
    } else {
      // For Jest - the mock tracks calls during module initialization
      expect(createParamDecorator).toHaveBeenCalledWith(getRawHeaders);
    }
    // The reason we needed different approaches is because of how Vitest and Jest handle module mocking differently. 
    // In Vitest, we couldn't reliably track the function call during module initialization, so we opted to inspect the result instead.
    // It's a bit of a compromise, but both tests ensure the decorator is correctly created using the getRawHeaders function.
  });
});
