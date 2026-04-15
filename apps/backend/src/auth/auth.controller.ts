import {
  Controller,
  Post,
  Body,
  HttpCode,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * Creates a new user account. Returns 201 with user info on success.
   */
  @Post('register')
  async register(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new BadRequestException('email and password are required');
    }
    if (!isValidEmail(body.email)) {
      throw new BadRequestException('Invalid email format');
    }
    return this.authService.register(body.email, body.password);
  }

  /**
   * POST /api/auth/login
   * Returns a signed JWT on success.
   */
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: { email?: string; password?: string }) {
    if (!body.email || !body.password) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(body.email, body.password);
  }
}
