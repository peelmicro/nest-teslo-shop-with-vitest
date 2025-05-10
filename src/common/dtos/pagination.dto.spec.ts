import { plainToClass } from 'class-transformer';
import { PaginationDto } from './pagination.dto';
import { validate } from 'class-validator';

describe('PaginationDto', () => {
  it('should work with default parameters', async () => {
    const dto = plainToClass(PaginationDto, {});

    const errors = await validate(dto);

    expect(dto).toBeDefined();
    expect(errors.length).toBe(0);
  });

  it('should validate limit as a positive number', async () => {
    const dto = plainToClass(PaginationDto, { limit: -1 });

    const errors = await validate(dto);
    
    expect(errors.length).toBeGreaterThan(0);
    const limitError = errors.find((error) => error.property === 'limit');
    expect(limitError).toBeDefined();
    expect(limitError.constraints.isPositive).toBeDefined();
  });

  it('should validate offset as a non-negative number', async () => {
    const dto = plainToClass(PaginationDto, { offset: -1 });

    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    const offsetError = errors.find((error) => error.property === 'offset');
    expect(offsetError).toBeDefined();
    expect(offsetError.constraints.min).toBeDefined();
  });

  it('should allow optional gender field with valid values', async () => {
    const validValues = ['men', 'women', 'unisex', 'kid'];

    // Test each valid gender value
    for (const gender of validValues) {
      const dto = plainToClass(PaginationDto, { gender });
      const errors = await validate(dto);
      expect(errors.length).toBe(0);
    }
  });

  it('should validate gender with invalid values', async () => {
    const invalidValues = ['invalid', 'test', 'other'];

    // Test each invalid gender value
    for (const gender of invalidValues) {
      const dto = plainToClass(PaginationDto, { gender });
      const errors = await validate(dto);
      
      expect(errors.length).toBeGreaterThan(0);
      const genderError = errors.find((error) => error.property === 'gender');
      expect(genderError).toBeDefined();
      expect(genderError.constraints.isIn).toBeDefined();
    }
  });
});
