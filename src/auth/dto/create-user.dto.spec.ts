import { validate } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

describe('CreateUserDTO', () => {
  it('should have the correct properties', async () => {
    const dto = new CreateUserDto();

    dto.email = 'test1@google.com';
    dto.password = 'Abc123';
    dto.fullName = 'Fernando Herrera';

    const errors = await validate(dto);

    expect(errors.length).toBe(0);
  });

  it('should throw errors if password is not valid', async () => {
    const dto = new CreateUserDto();

    dto.email = 'test1@google.com';
    dto.password = 'abc123';
    dto.fullName = 'Fernando Herrera';

    const errors = await validate(dto);

    const passwordError = errors.find((error) => error.property === 'password');

    expect(passwordError).toBeDefined();
    expect(passwordError.constraints).toBeDefined();
    expect(passwordError.constraints.matches).toBe(
      'The password must have a Uppercase, lowercase letter and a number',
    );
  });
});
