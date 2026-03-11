import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Database from 'better-sqlite3';
import { AuthService } from './auth.service';
import { DATABASE_TOKEN } from '../database/database.module';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.exec(`
    CREATE TABLE users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);
  return db;
}

function makeJwtService(overrides: Partial<JwtService> = {}): JwtService {
  return { sign: jest.fn().mockReturnValue('signed.jwt.token'), ...overrides } as unknown as JwtService;
}

describe('AuthService', () => {
  let service: AuthService;
  let db: Database.Database;
  let jwtService: JwtService;

  beforeEach(async () => {
    db = makeDb();
    jwtService = makeJwtService();

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DATABASE_TOKEN, useValue: db },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => db.close());

  describe('register()', () => {
    it('creates a user and returns id, email, createdAt', async () => {
      const result = await service.register('user@example.com', 'password123');
      expect(result.id).toBeGreaterThan(0);
      expect(result.email).toBe('user@example.com');
      expect(result.createdAt).toBeTruthy();
    });

    it('does not return the password hash', async () => {
      const result = await service.register('user@example.com', 'password123');
      expect(result).not.toHaveProperty('password_hash');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('stores a bcrypt hash, not the plaintext password', async () => {
      await service.register('user@example.com', 'secret');
      const row = db.prepare('SELECT password_hash FROM users WHERE email = ?').get('user@example.com') as { password_hash: string };
      expect(row.password_hash).not.toBe('secret');
      expect(row.password_hash).toMatch(/^\$2[ab]\$/); // bcrypt prefix
    });

    it('throws ConflictException for a duplicate email', async () => {
      await service.register('dup@example.com', 'pass1');
      await expect(service.register('dup@example.com', 'pass2')).rejects.toThrow(ConflictException);
    });
  });

  describe('login()', () => {
    beforeEach(async () => {
      await service.register('login@example.com', 'correct-password');
    });

    it('returns an accessToken for valid credentials', async () => {
      const result = await service.login('login@example.com', 'correct-password');
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });

    it('signs the JWT with sub and email in the payload', async () => {
      await service.login('login@example.com', 'correct-password');
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'login@example.com', sub: expect.any(Number) }),
      );
    });

    it('throws UnauthorizedException for a wrong password', async () => {
      await expect(service.login('login@example.com', 'wrong-password')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for an unknown email', async () => {
      await expect(service.login('nobody@example.com', 'any-password')).rejects.toThrow(UnauthorizedException);
    });

    it('returns the same error for wrong password and unknown email', async () => {
      const wrongPassword = service.login('login@example.com', 'wrong').catch((e: Error) => e.message);
      const unknownEmail = service.login('nobody@example.com', 'any').catch((e: Error) => e.message);
      expect(await wrongPassword).toBe(await unknownEmail);
    });
  });
});
