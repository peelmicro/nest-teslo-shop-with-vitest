import { User } from './user.entity';

describe('UserEntity', () => {
  it('should create and User Instance', () => {
    const user = new User();

    expect(user).toBeInstanceOf(User);
  });

  it('should clear email before save', () => {
    const user = new User();
    user.email = ' Test@Gmail.com   ';
    user.checkFieldsBeforeInsert();

    expect(user.email).toBe('test@gmail.com');
  });

  it('should clear email before update', () => {
    const user = new User();
    user.email = ' teSt@gMail.com   ';
    user.checkFieldsBeforeUpdate();

    expect(user.email).toBe('test@gmail.com');
  });
});
