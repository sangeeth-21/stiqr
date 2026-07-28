import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BeneficiaryService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.beneficiary.create({
      data: {
        shopId: data.shopId,
        name: data.name,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        ifscCode: data.ifscCode,
        accountType: data.accountType,
        mobile: data.mobile,
        nickname: data.nickname,
      },
    });
  }

  async findAll(shopId: string) {
    return this.prisma.beneficiary.findMany({
      where: { shopId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!beneficiary) throw new NotFoundException('Beneficiary not found');
    return beneficiary;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.beneficiary.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.beneficiary.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async toggleFavourite(id: string) {
    const beneficiary = await this.findOne(id);
    return this.prisma.beneficiary.update({
      where: { id },
      data: { isFavourite: !beneficiary.isFavourite },
    });
  }
}
