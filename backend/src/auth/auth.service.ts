import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto, ResetPasswordDto } from './dto/forgot-password.dto';
import { JwtPayload, TokenPair } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, ...(dto.phone ? [{ phone: dto.phone }] : [])] },
    });

    if (existing) {
      throw new ConflictException('User with this email or phone already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        role: 'CUSTOMER',
        status: 'ACTIVE',
        emailVerified: true,
      },
      select: { id: true, email: true, name: true, role: true, status: true },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens.refreshToken, ip, userAgent);

    return { user, ...tokens };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked. Try again later');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      const failedAttempts = user.failedAttempts + 1;
      const lockUntil = failedAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts, lockedUntil: lockUntil },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date(), lastActiveAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ipAddress: ip, userAgent },
    });

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    await this.createSession(user.id, tokens.refreshToken, ip, userAgent, dto.deviceInfo);

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status },
      ...tokens,
    };
  }

  async logout(userId: string, token?: string) {
    if (token) {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded?.exp) {
        await this.prisma.tokenBlacklist.create({
          data: { token, userId, expiresAt: new Date(decoded.exp * 1000) },
        });
      }
    }

    await this.prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    await this.prisma.auditLog.create({
      data: { userId, action: 'LOGOUT', entity: 'User', entityId: userId },
    });

    return { message: 'Logged out successfully' };
  }

  async refreshTokens(refreshToken: string, ip?: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true, status: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.user.id, stored.user.email, stored.user.role);
    await this.createSession(stored.user.id, tokens.refreshToken, ip);

    return { user: stored.user, ...tokens };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.jwtService.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '1h', secret: this.configService.get('JWT_SECRET') },
    );

    await this.prisma.otp.deleteMany({ where: { userId: user.id, purpose: 'password_reset', isUsed: false } });
    await this.prisma.otp.create({
      data: {
        userId: user.id,
        email: user.email,
        code: resetToken,
        type: 'token',
        purpose: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    return { message: 'If the email exists, a reset link has been sent', token: resetToken };
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      const decoded = this.jwtService.verify(dto.token, { secret: this.configService.get('JWT_SECRET') });

      const otp = await this.prisma.otp.findFirst({
        where: { code: dto.token, purpose: 'password_reset', isUsed: false },
      });

      if (!otp || otp.expiresAt < new Date()) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
      await this.prisma.user.update({ where: { id: decoded.sub }, data: { password: hashedPassword } });
      await this.prisma.otp.update({ where: { id: otp.id }, data: { isUsed: true } });
      await this.prisma.refreshToken.deleteMany({ where: { userId: decoded.sub } });

      return { message: 'Password reset successfully' };
    } catch {
      throw new BadRequestException('Invalid or expired reset token');
    }
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, phone: true, role: true, status: true,
        avatar: true, emailVerified: true, phoneVerified: true, lastLoginAt: true, createdAt: true,
      },
    });
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: userId, type: 'refresh', jti: require('crypto').randomUUID() },
      { expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d') },
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private async createSession(userId: string, token: string, ip?: string, userAgent?: string, deviceInfo?: string) {
    return this.prisma.session.create({
      data: {
        userId,
        token,
        ipAddress: ip,
        userAgent,
        deviceInfo,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
}
