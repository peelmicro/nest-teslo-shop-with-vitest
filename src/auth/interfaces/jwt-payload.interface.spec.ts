import { JwtPayload } from './jwt-payload.interface';

describe('JwtPayload interface', () => {
  it('should return true for a valid payload', () => {
    const validPayload: JwtPayload = { id: 'Abc123' };

    expect(validPayload.id).toBe('Abc123');
  });
});
