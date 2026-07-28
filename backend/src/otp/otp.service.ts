import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  async generate(email: string, purpose: string, type = 'email') {
    const recentOtp = await this.prisma.otp.findFirst({
      where: { email, purpose, isUsed: false, createdAt: { gt: new Date(Date.now() - 60000) } },
    });
    if (recentOtp) throw new BadRequestException('Please wait before requesting a new OTP');

    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otp.updateMany({ where: { email, purpose, isUsed: false }, data: { isUsed: true } });

    const otp = await this.prisma.otp.create({
      data: { email, code, type, purpose, expiresAt },
    });

    return { id: otp.id, expiresIn: 600, message: `OTP sent to ${email}` };
  }

  async verify(email: string, code: string, purpose: string) {
    const otp = await this.prisma.otp.findFirst({
      where: { email, purpose, isUsed: false },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) throw new BadRequestException('No OTP found. Please request a new one');
    if (otp.attempts >= otp.maxAttempts) throw new BadRequestException('Maximum OTP attempts exceeded');
    if (otp.expiresAt < new Date()) throw new BadRequestException('OTP has expired');

    if (otp.code !== code) {
      await this.prisma.otp.update({ where: { id: otp.id }, data: { attempts: otp.attempts + 1 } });
      throw new BadRequestException('Invalid OTP');
    }

    await this.prisma.otp.update({ where: { id: otp.id }, data: { isUsed: true } });
    return { verified: true, message: 'OTP verified successfully' };
  }

  async resend(email: string, purpose: string) {
    return this.generate(email, purpose);
  }

  async cleanupExpired() {
    const result = await this.prisma.otp.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    return { deleted: result.count };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
