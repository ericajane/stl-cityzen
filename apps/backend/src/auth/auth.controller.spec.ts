import { Test } from '@nestjs/testing';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

const mockAuthService = {
  register: jest.fn(),
  login: jest.fn(),
};

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get(AuthController);
  });

  describe('POST /auth/register', () => {
    it('calls authService.register with email and password', async () => {
      mockAuthService.register.mockResolvedValue({ id: 1, email: 'a@b.com', createdAt: '2025-01-01' });
      await controller.register({ email: 'a@b.com', password: 'pass' });
      expect(mockAuthService.register).toHaveBeenCalledWith('a@b.com', 'pass');
    });

    it('throws BadRequestException when email is missing', async () => {
      await expect(controller.register({ password: 'pass' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when password is missing', async () => {
      await expect(controller.register({ email: 'a@b.com' })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an invalid email format', async () => {
      await expect(controller.register({ email: 'not-an-email', password: 'pass' })).rejects.toThrow(BadRequestException);
    });

    it('propagates ConflictException from the service', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictException('Email already registered'));
      await expect(controller.register({ email: 'dup@b.com', password: 'pass' })).rejects.toThrow(ConflictException);
    });
  });

  describe('POST /auth/login', () => {
    it('calls authService.login and returns accessToken', async () => {
      mockAuthService.login.mockResolvedValue({ accessToken: 'tok' });
      const result = await controller.login({ email: 'a@b.com', password: 'pass' });
      expect(result).toEqual({ accessToken: 'tok' });
      expect(mockAuthService.login).toHaveBeenCalledWith('a@b.com', 'pass');
    });

    it('throws UnauthorizedException when email is missing', async () => {
      await expect(controller.login({ password: 'pass' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is missing', async () => {
      await expect(controller.login({ email: 'a@b.com' })).rejects.toThrow(UnauthorizedException);
    });

    it('propagates UnauthorizedException from the service', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await expect(controller.login({ email: 'a@b.com', password: 'wrong' })).rejects.toThrow(UnauthorizedException);
    });
  });
});
