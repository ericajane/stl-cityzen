import {
  Injectable,
  Inject,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import Database from 'better-sqlite3';
import * as bcrypt from 'bcryptjs';
import { DATABASE_TOKEN } from '../database/database.module';
import type { JwtPayload } from '@org/types';

const SALT_ROUNDS = 12;

interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database.Database,
    private readonly jwt: JwtService,
  ) {}

  async register(
    email: string,
    password: string,
  ): Promise<{ id: number; email: string; createdAt: string }> {
    const existing = this.db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = this.db
      .prepare(
        'INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at',
      )
      .get(email, passwordHash) as UserRow;

    return { id: result.id, email: result.email, createdAt: result.created_at };
  }

  async login(email: string, password: string): Promise<{ accessToken: string }> {
    const user = this.db
      .prepare('SELECT id, email, password_hash FROM users WHERE email = ?')
      .get(email) as UserRow | undefined;

    // Always run bcrypt to prevent timing-based email enumeration
    const hashToCheck = user?.password_hash ?? '$2b$12$invalidhashpaddingtopreventimenumeration';
    const valid = await bcrypt.compare(password, hashToCheck);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = { sub: user.id, email: user.email };
    return { accessToken: this.jwt.sign(payload) };
  }
}
