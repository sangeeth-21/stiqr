import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ServiceRepairService {
  constructor(private prisma: PrismaService) {}

  private async generateTicketNumber(shopId: string): Promise<string> {
    const count = await this.prisma.serviceRepair.count({ where: { shopId } });
    const num = (count + 1).toString().padStart(6, '0');
    return `SR-${num}`;
  }

  async create(data: any) {
    const ticketNumber = data.ticketNumber || await this.generateTicketNumber(data.shopId);

    return this.prisma.serviceRepair.create({
      data: {
        shopId: data.shopId,
        customerId: data.customerId,
        branchId: data.branchId,
        technicianId: data.technicianId,
        ticketNumber,
        deviceType: data.deviceType,
        deviceBrand: data.deviceBrand,
        deviceModel: data.deviceModel,
        imei: data.imei,
        imeiRecordId: data.imeiRecordId,
        issueDescription: data.issueDescription,
        status: data.status || 'received',
        estimatedCost: data.estimatedCost,
        actualCost: data.actualCost,
        sparePartsCost: data.sparePartsCost,
        laborCost: data.laborCost,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
        notes: data.notes,
        createdBy: data.createdBy,
      },
      include: { customer: true, technician: true },
    });
  }

  async findAll(shopId: string, query?: { status?: string; branchId?: string; technicianId?: string }) {
    const where: any = { shopId };
    if (query?.status) where.status = query.status;
    if (query?.branchId) where.branchId = query.branchId;
    if (query?.technicianId) where.technicianId = query.technicianId;

    return this.prisma.serviceRepair.findMany({
      where,
      include: { customer: true, technician: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const repair = await this.prisma.serviceRepair.findUnique({
      where: { id },
      include: { customer: true, technician: true },
    });
    if (!repair) throw new NotFoundException('Service repair not found');
    return repair;
  }

  async update(id: string, data: any) {
    await this.findOne(id);
    return this.prisma.serviceRepair.update({
      where: { id },
      data: {
        ...data,
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      },
      include: { customer: true, technician: true },
    });
  }

  async assignTechnician(id: string, technicianId: string) {
    await this.findOne(id);
    return this.prisma.serviceRepair.update({
      where: { id },
      data: { technicianId, status: 'in_repair' },
    });
  }
}
