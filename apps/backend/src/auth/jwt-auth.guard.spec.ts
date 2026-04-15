import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtPayload } from '@org/types';

const VALID_PAYLOAD: JwtPayload = { sub: 1, email: 'user@example.com' };

function makeContext(authHeader?: string): ExecutionContext {
  const request = { headers: { authorization: authHeader } };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(() => {
    jwtService = { verify: jest.fn().mockReturnValue(VALID_PAYLOAD) } as unknown as jest.Mocked<JwtService>;
    guard = new JwtAuthGuard(jwtService);
  });

  it('returns true and attaches user for a valid token', () => {
    const ctx = makeContext('Bearer valid.token.here');
    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    const req = ctx.switchToHttp().getRequest() as { user: JwtPayload };
    expect(req.user).toEqual(VALID_PAYLOAD);
  });

  it('throws UnauthorizedException when Authorization header is absent', () => {
    expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when scheme is not Bearer', () => {
    expect(() => guard.canActivate(makeContext('Basic dXNlcjpwYXNz'))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when JwtService.verify throws', () => {
    jwtService.verify.mockImplementation(() => { throw new Error('expired'); });
    expect(() => guard.canActivate(makeContext('Bearer expired.token'))).toThrow(UnauthorizedException);
  });

  it('calls JwtService.verify with the extracted token', () => {
    guard.canActivate(makeContext('Bearer my.test.token'));
    expect(jwtService.verify).toHaveBeenCalledWith('my.test.token');
  });
});
