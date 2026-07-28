import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KycService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const existing = await this.prisma.kYC.findFirst({
      where: {
        shopId: data.shopId,
        holderType: data.holderType,
        holderId: data.holderId,
      },
    });
    if (existing) {
      throw new BadRequestException('KYC record already exists for this holder');
    }
    return this.prisma.kYC.create({
      data: {
        shopId: data.shopId,
        holderType: data.holderType,
        holderId: data.holderId,
        panNumber: data.panNumber,
        aadhaarNumber: data.aadhaarNumber,
        bankAccountNumber: data.bankAccountNumber,
        ifscCode: data.ifscCode,
      },
    });
  }

  async findAll(query: { shopId?: string; holderType?: string; status?: string }) {
    const where: any = {};
    if (query.shopId) where.shopId = query.shopId;
    if (query.holderType) where.holderType = query.holderType;
    if (query.status) where.status = query.status;

    return this.prisma.kYC.findMany({
      where,
      include: { documents: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const kyc = await this.prisma.kYC.findUnique({
      where: { id },
      include: { documents: true },
    });
    if (!kyc) throw new NotFoundException('KYC record not found');
    return kyc;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.kYC.update({
      where: { id },
      data,
    });
  }

  async verify(id: string, verifiedBy: string) {
    const kyc = await this.findOne(id);
    if (kyc.status === 'VERIFIED') {
      throw new BadRequestException('KYC is already verified');
    }
    return this.prisma.kYC.update({
      where: { id },
      data: {
        status: 'VERIFIED',
        verifiedBy,
        verifiedAt: new Date(),
      },
    });
  }

  async reject(id: string, rejectionReason: string, reviewedBy: string) {
    const kyc = await this.findOne(id);
    if (kyc.status === 'REJECTED') {
      throw new BadRequestException('KYC is already rejected');
    }
    return this.prisma.kYC.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason,
        verifiedBy: reviewedBy,
        verifiedAt: new Date(),
      },
    });
  }

  async addDocument(kycId: string, data: any) {
    const kyc = await this.findOne(kycId);
    if (kyc.status === 'VERIFIED') {
      throw new BadRequestException('Cannot add documents to a verified KYC');
    }
    return this.prisma.kYCDocument.create({
      data: {
        kycId,
        documentType: data.documentType,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
      },
    });
  }

  async listDocuments(kycId: string) {
    await this.findOne(kycId);
    return this.prisma.kYCDocument.findMany({
      where: { kycId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
