import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto, QuerySupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        shopId: dto.shopId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        address: dto.address,
        contactPerson: dto.contactPerson,
        paymentTerms: dto.paymentTerms,
        bankDetails: dto.bankDetails,
        outstandingBalance: dto.outstandingBalance ?? 0,
        notes: dto.notes,
      },
    });
  }

  async findAll(query: QuerySupplierDto) {
    const { shopId, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (shopId) where.shopId = shopId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findFirst({ where: { id, deletedAt: null } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.contactPerson !== undefined) updateData.contactPerson = dto.contactPerson;
    if (dto.paymentTerms !== undefined) updateData.paymentTerms = dto.paymentTerms;
    if (dto.bankDetails !== undefined) updateData.bankDetails = dto.bankDetails;
    if (dto.outstandingBalance !== undefined) updateData.outstandingBalance = dto.outstandingBalance;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    return this.prisma.supplier.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.supplier.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
