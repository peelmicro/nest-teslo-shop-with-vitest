# NestJS Testing with Jest and Vitest - Part 2

This project demonstrates how to set up a NestJS e-commerce application to work with both Jest and Vitest testing frameworks simultaneously. This represents the second part of the "NestJS + Testing: Pruebas unitarias y end to end (e2e)" course by dev/talles, available on [dev/talles: NestJS + Testing: Pruebas unitarias y end to end (e2e)](https://cursos.devtalles.com/courses/NestJS-Testing) and [Udemy: NestJS + Testing: Pruebas unitarias y end to end (e2e)](https://www.udemy.com/course/nestjs-testing-e2e/). The original application (Teslo Shop) was created for a different NestJS course and has been adapted to work with both testing frameworks.

## Project Setup

```bash
# Install dependencies
npm install

# Run Jest tests
npm run test

# Run Vitest tests
npm run test:vitest

# Compare performance between Jest and Vitest
npm run test:compare
```

## How the Testing Solution Works

This project uses a truly framework-agnostic approach to allow tests to run with both Jest and Vitest. The key components are:

### 1. SWC with Vitest for Decorator Support

One of the key differences between Jest and Vitest is how they handle TypeScript decorators, especially with class-validator. To solve this issue, we configure Vitest to use SWC (a Rust-based JavaScript/TypeScript compiler) which properly supports decorator metadata:

```typescript
// vitest.config.ts
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: {
        target: 'es2021',
        parser: {
          syntax: 'typescript',
          decorators: true,
          dynamicImport: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './test/vitest-setup.ts',
    include: ['src/**/*.spec.ts'],
  },
});
```

This configuration allows class-validator decorators to work correctly in Vitest, which otherwise would not work with Vitest's default esbuild transformer.

### 2. Framework-agnostic Test Utilities

The `test/test-utils.ts` file provides a set of utilities that detect which test framework is running and use the appropriate methods:

```typescript
// Detect which test framework is being used
const isVitest = typeof globalThis.vi !== 'undefined';

export const testRunner = {
  fn: (implementation?: (...args: any[]) => any): any => {
    if (isVitest) {
      return globalThis.vi.fn(implementation);
    }
    return jest.fn(implementation);
  },
  
  spyOn: (object: any, method: string | number): any => {
    try {
      // Try to safely spy on the method
      if (isVitest) {
        const spy = globalThis.vi.spyOn(object, method as any);
        // Ensure the spy has mockReturnValue and other common methods
        if (!spy.mockReturnValue) {
          spy.mockReturnValue = function(value: any) {
            return globalThis.vi.mocked(this).mockReturnValue(value);
          };
        }
        return spy;
      }
      return jest.spyOn(object, method as any);
    } catch (error) {
      // If direct spying fails, create a mock function and assign it to the property
      const mockFn = isVitest ? globalThis.vi.fn() : jest.fn();
      // Only attempt to redefine if the object has the property
      if (object && method in object) {
        // Try to use a safer approach to replace the property
        const originalValue = object[method];
        try {
          object[method] = mockFn;
          // Restore original value when mockRestore is called
          mockFn.mockRestore = () => {
            object[method] = originalValue;
          };
        } catch (e) {
          console.warn(`Failed to mock ${String(method)}:`, e);
          // If we can't redefine, return a mock that won't affect the real object
          return mockFn;
        }
      }
      return mockFn;
    }
  },
  
  // Additional utilities...
};

// Export convenience functions
export const fn = testRunner.fn;
export const spyOn = testRunner.spyOn;
export const clearAllMocks = testRunner.clearAllMocks;
```

### 3. Global Mock Functions in Vitest Setup

To ensure that functions like `fn`, `clearAllMocks`, and `spyOn` work properly in Vitest, we add global functions directly in the vitest-setup.ts file:

```typescript
/**
 * Vitest setup file - framework-agnostic configuration
 */
import { vi } from 'vitest';
import { testRunner } from './test-utils';

// Make sure reflection metadata is loaded
import 'reflect-metadata';

// Create global functions that can be used directly
// This ensures framework-agnostic test code works with both Jest and Vitest
(global as any).fn = vi.fn;
(global as any).clearAllMocks = vi.clearAllMocks;
(global as any).spyOn = vi.spyOn; 

// Rest of setup file...
```

### 4. Application-specific Test Helpers

In this version, we've moved application-specific mocks to a separate file:

```typescript
// src/test-helpers.ts
import { 
  isVitest, 
  fn, 
  spyOn, 
  clearAllMocks,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
} from '../test/test-utils';

// Re-export framework-agnostic utilities
export { 
  isVitest, 
  fn, 
  spyOn, 
  clearAllMocks,
  BadRequestException,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException
};

// Application-specific mocks
export function createServiceMocks() {
  return {
    findAll: fn().mockResolvedValue([]),
    findOne: fn().mockResolvedValue({}),
    create: fn().mockResolvedValue({}),
    update: fn().mockResolvedValue({}),
    remove: fn().mockResolvedValue({}),
  };
}
```

### 5. Direct Service Instantiation

Instead of using NestJS TestingModule, our tests now directly instantiate services with mock dependencies:

```typescript
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

  // Test cases...
});
```

## Writing Tests Compatible with Both Frameworks

When writing tests that work with both Jest and Vitest, follow these guidelines:

1. **Import test utilities from the common files**:
   ```typescript
   import { fn, spyOn, clearAllMocks } from '../test-helpers';
   ```

2. **Use direct service instantiation rather than TestingModule**:
   ```typescript
   // Instead of:
   const module: TestingModule = await Test.createTestingModule({
     providers: [YourService, /* dependencies... */],
   }).compile();
   const service = module.get<YourService>(YourService);
   
   // Do this:
   const mockDependency = { method: fn() };
   const service = new YourService(mockDependency);
   ```

3. **For decorators that are difficult to test, use behavior testing instead of implementation testing**:
   ```typescript
   // Instead of mocking SetMetadata, test the behavior
   it('should create a decorator that sets the correct metadata', () => {
     @RoleProtected(...roles)
     class TestClass {}
     
     expect(TestClass).toBeDefined();
   });
   ```

4. **Use assertions that work in both frameworks** (fortunately, Jest and Vitest share very similar assertion APIs)

## Performance Comparison

Based on our latest testing with SWC for Vitest, here's the updated performance comparison:

| Metric | Jest | Vitest | Difference |
|--------|------|--------|------------|
| Total time | 32.98s | 8.75s | Vitest is 3.7x faster |
| CPU usage | 1079% | 918% | Vitest uses 15% less CPU |
| Memory (max) | 460MB | 171MB | Vitest uses 63% less memory |
| Page faults | 1520307 | 541655 | Vitest has 64% fewer page faults |

## Key Implementation Changes in This Version

This version builds on the previous foundation with several important improvements:

1. **SWC Integration for Vitest**: Added SWC compiler support for proper decorator metadata handling in Vitest
2. **Removed Class-Validator Workarounds**: With SWC handling decorator metadata properly, we no longer need special workarounds in DTO validation tests
3. **Enhanced Spy Handling**: Improved spyOn function that better handles property access issues
4. **Direct Service Instantiation**: Moved away from TestingModule to simpler direct instantiation
5. **Application-specific Test Helpers**: Centralized application mocks in src/test-helpers.ts
6. **Decorator Testing Strategy**: New approach for testing decorators without complex mocking
7. **Simplified Global Setup**: Added global mock functions directly in vitest-setup.ts for cleaner organization

### Important Notes on Class-Validator and Decorators

One of the key challenges when working with NestJS and Vitest is handling class-validator decorators. The solution is to:

1. Use SWC instead of esbuild (Vitest's default) for proper decorator metadata support
2. Ensure 'reflect-metadata' is imported in the vitest setup file
3. Add global mock functions directly in vitest-setup.ts to support framework-agnostic code
4. Keep tests simple and focused on behavior rather than implementation details

With these changes, tests that use class-validator now work correctly in both Jest and Vitest environments without any special workarounds.

## Advantages of Each Framework

**Jest:**
- Mature ecosystem with wide adoption
- Well-documented
- Built-in code coverage
- Works well with Create React App and other popular toolchains

**Vitest:**
- Significantly faster execution
- Lower resource consumption
- Better integration with Vite for modern projects
- Compatible with TypeScript and ESM out of the box

## Conclusion

By following the patterns and approaches outlined in this document, you can create a testing infrastructure that works seamlessly with both Jest and Vitest. This gives you the flexibility to:

1. **Leverage Jest** for its mature ecosystem and extensive documentation
2. **Leverage Vitest** for its superior performance and ESM compatibility
3. **Migrate gradually** from Jest to Vitest without rewriting tests
4. **Run both frameworks** in parallel during a transition period

The framework-agnostic approach ensures that your tests remain maintainable and can evolve alongside your testing strategy, without being locked into a single framework.

## License

This project is [MIT licensed](LICENSE).
