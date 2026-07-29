import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCK_DURATION_MINUTES = 30;
  private readonly OTP_EXPIRY_MINUTES = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await argon2.hash(dto.password);

    const shop = await this.prisma.shop.create({
      data: {
        name: dto.shopName,
        slug: dto.shopName.toLowerCase().replace(/\s+/g, '-') + '-' + uuidv4().slice(0, 8),
        phone: dto.mobile,
        email: dto.email,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.ownerName,
        phone: dto.mobile,
        password: hashedPassword,
        role: 'OWNER',
        status: 'ACTIVE',
        shopId: shop.id,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        shopId: user.shopId,
      },
      shop: {
        id: shop.id,
        name: shop.name,
        slug: shop.slug,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.findUserByIdentifier(dto);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new ForbiddenException(
        `Account is locked until ${user.lockedUntil.toISOString()}`,
      );
    }

    const isPasswordValid = await argon2.verify(user.password, dto.password);
    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.prisma.loginHistory.create({
      data: {
        userId: user.id,
        ipAddress,
        userAgent,
        status: 'SUCCESS',
      },
    });

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        token: uuidv4(),
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const tokens = await this.generateTokens(user, session.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        shopId: user.shopId,
        avatar: user.avatar,
      },
      sessionId: session.id,
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await this.generateTokens(stored.user, stored.sessionId);

    return tokens;
  }

  async logout(userId: string, token: string) {
    const decoded = this.jwtService.decode(token) as any;
    const exp = decoded?.exp;

    await this.prisma.tokenBlacklist.create({
      data: {
        token,
        userId,
        expiresAt: exp ? new Date(exp * 1000) : new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, isActive: true },
    });

    for (const session of sessions) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { isActive: false },
      });
    }

    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return { message: 'Logged out from all devices' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    console.log(`[EMAIL SIMULATION] Password reset token for ${email}: ${token}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(token: string, password: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.expiresAt < new Date() || resetToken.usedAt) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await argon2.hash(password);

    await this.prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword },
    });

    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: resetToken.userId } });

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isOldPasswordValid = await argon2.verify(user.password, dto.oldPassword);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await argon2.hash(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Password changed successfully' };
  }

  async sendOtp(dto: SendOtpDto) {
    if (!dto.email && !dto.mobile) {
      throw new BadRequestException('Email or mobile is required');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    let userId: string | undefined;
    if (dto.email) {
      const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
      userId = user?.id;
    }

    await this.prisma.otp.create({
      data: {
        userId,
        email: dto.email,
        phone: dto.mobile,
        code,
        type: 'VERIFICATION',
        purpose: 'AUTH',
        expiresAt,
      },
    });

    console.log(`[OTP SIMULATION] Code for ${dto.email || dto.mobile}: ${code}`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    if (!dto.email && !dto.mobile) {
      throw new BadRequestException('Email or mobile is required');
    }

    const otp = await this.prisma.otp.findFirst({
      where: {
        ...(dto.email ? { email: dto.email } : { phone: dto.mobile }),
        code: dto.code,
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { isUsed: true },
    });

    if (otp.userId) {
      await this.prisma.user.update({
        where: { id: otp.userId },
        data: { phoneVerified: true },
      });
    }

    return { message: 'OTP verified successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        shopId: true,
        emailVerified: true,
        phoneVerified: true,
        lastLoginAt: true,
        createdAt: true,
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: Partial<{ name: string; phone: string; avatar: string }>) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        avatar: true,
        shopId: true,
      },
    });

    return user;
  }

  async generateTokens(user: { id: string; email: string; role: string }, sessionId?: string) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = uuidv4();
    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        sessionId,
        expiresAt: refreshExpiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const valid = await argon2.verify(user.password, password);
    if (!valid) return null;

    return user;
  }

  private async findUserByIdentifier(dto: LoginDto) {
    if (dto.email) {
      return this.prisma.user.findUnique({ where: { email: dto.email } });
    }
    if (dto.username) {
      return this.prisma.user.findFirst({ where: { name: dto.username } });
    }
    if (dto.mobile) {
      return this.prisma.user.findUnique({ where: { phone: dto.mobile } });
    }
    return null;
  }

  private async handleFailedLogin(userId: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedAttempts: { increment: 1 } },
    });

    if (user.failedAttempts >= this.MAX_FAILED_ATTEMPTS) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + this.LOCK_DURATION_MINUTES * 60 * 1000),
        },
      });
    }
  }
}
