import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OcrService {
  constructor(private prisma: PrismaService) {}

  async submitDocument(data: any) {
    return this.prisma.oCRDocument.create({
      data: { ...data, status: 'PENDING' },
    });
  }

  async listDocuments(query: any) {
    const { shopId, documentType, status, page = 1, limit = 20 } = query;
    const where: any = {};

    if (shopId) where.shopId = shopId;
    if (documentType) where.documentType = documentType;
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.oCRDocument.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.oCRDocument.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getDocument(id: string) {
    const doc = await this.prisma.oCRDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async updateDocument(id: string, data: any) {
    await this.getDocument(id);
    return this.prisma.oCRDocument.update({ where: { id }, data });
  }

  async deleteDocument(id: string) {
    await this.getDocument(id);
    return this.prisma.oCRDocument.delete({ where: { id } });
  }

  async processDocument(id: string) {
    const doc = await this.getDocument(id);

    await this.prisma.oCRDocument.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    const confidence = 85 + Math.random() * 14;

    let extractedData: any = {};
    switch (doc.documentType) {
      case 'INVOICE':
        extractedData = {
          invoiceNumber: 'INV-2024-' + Math.floor(Math.random() * 9999),
          date: new Date().toISOString().split('T')[0],
          vendorName: 'Sample Vendor Pvt Ltd',
          totalAmount: Math.floor(Math.random() * 50000) + 1000,
          taxAmount: Math.floor(Math.random() * 5000) + 100,
          items: [
            { description: 'Product A', quantity: 2, unitPrice: 500, total: 1000 },
            { description: 'Product B', quantity: 1, unitPrice: 2500, total: 2500 },
          ],
        };
        break;
      case 'AADHAAR':
        extractedData = {
          name: 'John Doe',
          dob: '01/01/1990',
          gender: 'Male',
          aadhaarNumber: 'XXXX-XXXX-1234',
          address: '123 Main St, City, State - 123456',
        };
        break;
      case 'PAN':
        extractedData = {
          name: 'John Doe',
          panNumber: 'ABCDE1234F',
          dob: '01/01/1990',
          fatherName: 'Father Doe',
        };
        break;
      default:
        extractedData = {
          type: doc.documentType,
          fields: { key1: 'value1', key2: 'value2' },
        };
    }

    const updated = await this.prisma.oCRDocument.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        extractedData: JSON.stringify(extractedData),
        confidence: Math.round(confidence * 100) / 100,
        processedAt: new Date(),
        processedUrl: doc.originalUrl,
      },
    });

    return updated;
  }

  async getStats(shopId?: string) {
    const where: any = {};
    if (shopId) where.shopId = shopId;

    const [byType, byStatus, totalDocuments] = await Promise.all([
      this.prisma.oCRDocument.groupBy({ by: ['documentType'], where, _count: { documentType: true } }),
      this.prisma.oCRDocument.groupBy({ by: ['status'], where, _count: { status: true } }),
      this.prisma.oCRDocument.count({ where }),
    ]);

    return {
      totalDocuments,
      byType: byType.map((item) => ({ type: item.documentType, count: item._count.documentType })),
      byStatus: byStatus.map((item) => ({ status: item.status, count: item._count.status })),
    };
  }
}
