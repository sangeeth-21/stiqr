import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DmtService {
  constructor(private prisma: PrismaService) {}

  async registerSender(data: any) {
    const existing = await this.prisma.dMTSender.findFirst({
      where: { shopId: data.shopId, mobile: data.mobile },
    });
    if (existing) throw new BadRequestException('Sender already registered with this mobile');

    const otp = '123456';
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    return this.prisma.dMTSender.create({
      data: {
        shopId: data.shopId,
        mobile: data.mobile,
        name: data.name,
        address: data.address,
        maxTransferLimit: data.maxTransferLimit || 50000,
        verificationOtp: otp,
        otpExpiry: otpExpiry,
      },
    });
  }

  async findAllSenders(shopId: string) {
    return this.prisma.dMTSender.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneSender(id: string) {
    const sender = await this.prisma.dMTSender.findUnique({ where: { id } });
    if (!sender) throw new NotFoundException('DMT sender not found');
    return sender;
  }

  async verifySender(id: string, otp: string) {
    const sender = await this.findOneSender(id);
    if (!sender.otpExpiry || sender.otpExpiry < new Date()) {
      throw new BadRequestException('OTP expired');
    }
    if (sender.verificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    return this.prisma.dMTSender.update({
      where: { id },
      data: { kycStatus: 'VERIFIED', verificationOtp: null, otpExpiry: null },
    });
  }

  async addBeneficiary(data: any) {
    const sender = await this.findOneSender(data.senderId);
    if (sender.kycStatus !== 'VERIFIED') {
      throw new BadRequestException('Sender not verified');
    }
    return this.prisma.dMTBeneficiary.create({
      data: {
        senderId: data.senderId,
        name: data.name,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        ifscCode: data.ifscCode,
        accountType: data.accountType || 'SAVINGS',
        mobile: data.mobile,
        nickname: data.nickname,
      },
    });
  }

  async findAllBeneficiaries(senderId: string) {
    return this.prisma.dMTBeneficiary.findMany({
      where: { senderId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async verifyBeneficiary(id: string) {
    const bene = await this.prisma.dMTBeneficiary.findUnique({ where: { id } });
    if (!bene) throw new NotFoundException('Beneficiary not found');
    return this.prisma.dMTBeneficiary.update({
      where: { id },
      data: { isVerified: true, verifiedAt: new Date() },
    });
  }

  async deleteBeneficiary(id: string) {
    const bene = await this.prisma.dMTBeneficiary.findUnique({ where: { id } });
    if (!bene) throw new NotFoundException('Beneficiary not found');
    return this.prisma.dMTBeneficiary.update({
      where: { id },
      data: { status: 'DELETED' },
    });
  }

  async createTransfer(data: any) {
    const sender = await this.findOneSender(data.senderId);
    if (sender.kycStatus !== 'VERIFIED') throw new BadRequestException('Sender not verified');

    const bene = await this.prisma.dMTBeneficiary.findUnique({ where: { id: data.beneficiaryId } });
    if (!bene || bene.status !== 'ACTIVE') throw new NotFoundException('Beneficiary not found');
    if (!bene.isVerified) throw new BadRequestException('Beneficiary not verified');

    const total = data.amount + (data.charges || 0);
    if (sender.totalTransferred + total > sender.maxTransferLimit) {
      throw new BadRequestException('Transfer limit exceeded');
    }

    const ref = `DMT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    return this.prisma.dMTTransfer.create({
      data: {
        senderId: data.senderId,
        beneficiaryId: data.beneficiaryId,
        shopId: data.shopId,
        amount: data.amount,
        charges: data.charges || 0,
        totalDebited: total,
        referenceNumber: ref,
        status: 'INITIATED',
        initiatedAt: new Date(),
      },
    });
  }

  async findAllTransfers(shopId: string, senderId?: string, status?: string) {
    const where: any = { shopId };
    if (senderId) where.senderId = senderId;
    if (status) where.status = status;
    return this.prisma.dMTTransfer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { sender: true, beneficiary: true },
    });
  }

  async findOneTransfer(id: string) {
    const tx = await this.prisma.dMTTransfer.findUnique({ where: { id } });
    if (!tx) throw new NotFoundException('Transfer not found');
    return tx;
  }

  async updateTransferStatus(id: string, data: any) {
    await this.findOneTransfer(id);
    return this.prisma.dMTTransfer.update({
      where: { id },
      data: {
        status: data.status,
        failureReason: data.failureReason,
        providerReference: data.providerReference,
        completedAt: data.status === 'SUCCESS' ? new Date() : undefined,
      },
    });
  }
}
